// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract FasterInvoiceEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum InvoiceStatus {
        None,
        Created,
        Funded,
        Approved,
        Disputed,
        Released,
        Refunded,
        Cancelled
    }

    enum Resolution {
        Release,
        Refund
    }

    struct Invoice {
        uint256 id;
        address merchant;
        address payer;
        address reviewer;
        address resolver;
        uint256 amount;
        uint64 createdAt;
        uint64 dueAt;
        InvoiceStatus status;
        string metadataURI;
        bytes32 termsHash;
        bytes32 disputeReasonHash;
    }

    error ZeroAddress();
    error ZeroAmount();
    error InvalidInvoice();
    error InvalidState(InvoiceStatus current);
    error Unauthorized();
    error InvalidLimit();

    IERC20 public immutable usdc;
    address public defaultResolver;
    uint256 public nextInvoiceId = 1;
    uint256 public totalCreated;
    uint256 public totalFunded;
    uint256 public totalReleased;
    uint256 public totalRefunded;
    uint256 public totalDisputed;

    mapping(uint256 => Invoice) private _invoices;

    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed merchant,
        address indexed payer,
        address reviewer,
        address resolver,
        uint256 amount,
        uint64 dueAt,
        string metadataURI,
        bytes32 termsHash
    );
    event InvoiceFunded(uint256 indexed invoiceId, address indexed payer, uint256 amount);
    event DeliveryApproved(uint256 indexed invoiceId, address indexed reviewer);
    event InvoiceReleased(uint256 indexed invoiceId, address indexed merchant, uint256 amount);
    event InvoiceRefunded(uint256 indexed invoiceId, address indexed payer, uint256 amount);
    event InvoiceCancelled(uint256 indexed invoiceId, address indexed cancelledBy);
    event InvoiceDisputed(uint256 indexed invoiceId, address indexed openedBy, bytes32 reasonHash);
    event DisputeResolved(uint256 indexed invoiceId, address indexed resolver, Resolution resolution);
    event DefaultResolverUpdated(address indexed oldResolver, address indexed newResolver);

    constructor(address usdc_, address defaultResolver_) Ownable(msg.sender) {
        if (usdc_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
        defaultResolver = defaultResolver_ == address(0) ? msg.sender : defaultResolver_;
    }

    function createInvoice(
        address payer,
        address reviewer,
        address resolver,
        uint256 amount,
        uint64 dueAt,
        string calldata metadataURI,
        bytes32 termsHash
    ) external returns (uint256 invoiceId) {
        if (payer == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        invoiceId = nextInvoiceId++;
        address invoiceResolver = resolver == address(0) ? defaultResolver : resolver;

        _invoices[invoiceId] = Invoice({
            id: invoiceId,
            merchant: msg.sender,
            payer: payer,
            reviewer: reviewer,
            resolver: invoiceResolver,
            amount: amount,
            createdAt: uint64(block.timestamp),
            dueAt: dueAt,
            status: InvoiceStatus.Created,
            metadataURI: metadataURI,
            termsHash: termsHash,
            disputeReasonHash: bytes32(0)
        });

        totalCreated += 1;

        emit InvoiceCreated(
            invoiceId,
            msg.sender,
            payer,
            reviewer,
            invoiceResolver,
            amount,
            dueAt,
            metadataURI,
            termsHash
        );
    }

    function fundInvoice(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = _existingInvoice(invoiceId);
        if (msg.sender != invoice.payer) revert Unauthorized();
        if (invoice.status != InvoiceStatus.Created) revert InvalidState(invoice.status);

        invoice.status = InvoiceStatus.Funded;
        totalFunded += invoice.amount;

        usdc.safeTransferFrom(msg.sender, address(this), invoice.amount);

        emit InvoiceFunded(invoiceId, msg.sender, invoice.amount);
    }

    function approveDelivery(uint256 invoiceId) external {
        Invoice storage invoice = _existingInvoice(invoiceId);
        if (!_isReviewer(invoice, msg.sender)) revert Unauthorized();
        if (invoice.status != InvoiceStatus.Funded) revert InvalidState(invoice.status);

        invoice.status = InvoiceStatus.Approved;

        emit DeliveryApproved(invoiceId, msg.sender);
    }

    function releaseInvoice(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = _existingInvoice(invoiceId);
        if (msg.sender != invoice.payer) revert Unauthorized();
        if (invoice.status != InvoiceStatus.Approved) revert InvalidState(invoice.status);

        uint256 amount = invoice.amount;
        address merchant = invoice.merchant;

        invoice.status = InvoiceStatus.Released;
        totalReleased += amount;

        usdc.safeTransfer(merchant, amount);

        emit InvoiceReleased(invoiceId, merchant, amount);
    }

    function cancelInvoice(uint256 invoiceId) external {
        Invoice storage invoice = _existingInvoice(invoiceId);
        if (msg.sender != invoice.merchant && msg.sender != invoice.payer) revert Unauthorized();
        if (invoice.status != InvoiceStatus.Created) revert InvalidState(invoice.status);

        invoice.status = InvoiceStatus.Cancelled;

        emit InvoiceCancelled(invoiceId, msg.sender);
    }

    function openDispute(uint256 invoiceId, bytes32 reasonHash) external {
        Invoice storage invoice = _existingInvoice(invoiceId);
        if (msg.sender != invoice.merchant && msg.sender != invoice.payer) revert Unauthorized();
        if (invoice.status != InvoiceStatus.Funded && invoice.status != InvoiceStatus.Approved) {
            revert InvalidState(invoice.status);
        }

        invoice.status = InvoiceStatus.Disputed;
        invoice.disputeReasonHash = reasonHash;
        totalDisputed += 1;

        emit InvoiceDisputed(invoiceId, msg.sender, reasonHash);
    }

    function resolveDispute(uint256 invoiceId, Resolution resolution) external nonReentrant {
        Invoice storage invoice = _existingInvoice(invoiceId);
        if (msg.sender != invoice.resolver && msg.sender != defaultResolver) revert Unauthorized();
        if (invoice.status != InvoiceStatus.Disputed) revert InvalidState(invoice.status);

        uint256 amount = invoice.amount;

        if (resolution == Resolution.Release) {
            address merchant = invoice.merchant;
            invoice.status = InvoiceStatus.Released;
            totalReleased += amount;
            usdc.safeTransfer(merchant, amount);
            emit DisputeResolved(invoiceId, msg.sender, resolution);
            emit InvoiceReleased(invoiceId, merchant, amount);
        } else {
            address payer = invoice.payer;
            invoice.status = InvoiceStatus.Refunded;
            totalRefunded += amount;
            usdc.safeTransfer(payer, amount);
            emit DisputeResolved(invoiceId, msg.sender, resolution);
            emit InvoiceRefunded(invoiceId, payer, amount);
        }
    }

    function setDefaultResolver(address newResolver) external onlyOwner {
        if (newResolver == address(0)) revert ZeroAddress();
        address oldResolver = defaultResolver;
        defaultResolver = newResolver;
        emit DefaultResolverUpdated(oldResolver, newResolver);
    }

    function getInvoice(uint256 invoiceId) external view returns (Invoice memory) {
        return _existingInvoiceView(invoiceId);
    }

    function listInvoiceIds(uint256 startId, uint256 limit) external view returns (uint256[] memory ids) {
        if (limit == 0 || limit > 100) revert InvalidLimit();
        if (startId == 0) startId = 1;
        if (startId >= nextInvoiceId) return new uint256[](0);

        uint256 available = nextInvoiceId - startId;
        uint256 count = available < limit ? available : limit;
        ids = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            ids[i] = startId + i;
        }
    }

    function _existingInvoice(uint256 invoiceId) private view returns (Invoice storage invoice) {
        invoice = _invoices[invoiceId];
        if (invoice.status == InvoiceStatus.None) revert InvalidInvoice();
    }

    function _existingInvoiceView(uint256 invoiceId) private view returns (Invoice memory invoice) {
        invoice = _invoices[invoiceId];
        if (invoice.status == InvoiceStatus.None) revert InvalidInvoice();
    }

    function _isReviewer(Invoice storage invoice, address actor) private view returns (bool) {
        if (invoice.reviewer == address(0)) {
            return actor == invoice.payer;
        }
        return actor == invoice.reviewer;
    }
}
