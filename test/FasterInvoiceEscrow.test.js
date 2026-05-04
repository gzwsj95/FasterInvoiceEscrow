const { expect } = require("chai");
const { ethers } = require("hardhat");

const parseUsdc = (value) => ethers.parseUnits(value, 6);
const termsHash = ethers.id("standard service terms");
const disputeHash = ethers.id("delivery incomplete");

describe("FasterInvoiceEscrow", function () {
  async function deployFixture() {
    const [owner, merchant, payer, reviewer, resolver, stranger] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();

    const Escrow = await ethers.getContractFactory("FasterInvoiceEscrow");
    const escrow = await Escrow.deploy(await usdc.getAddress(), resolver.address);

    await usdc.mint(payer.address, parseUsdc("1000"));

    return { owner, merchant, payer, reviewer, resolver, stranger, usdc, escrow };
  }

  async function createInvoice() {
    const ctx = await deployFixture();
    const amount = parseUsdc("125.50");
    const tx = await ctx.escrow
      .connect(ctx.merchant)
      .createInvoice(
        ctx.payer.address,
        ctx.reviewer.address,
        ctx.resolver.address,
        amount,
        0,
        "ipfs://invoice-001",
        termsHash
      );

    await expect(tx)
      .to.emit(ctx.escrow, "InvoiceCreated")
      .withArgs(
        1,
        ctx.merchant.address,
        ctx.payer.address,
        ctx.reviewer.address,
        ctx.resolver.address,
        amount,
        0,
        "ipfs://invoice-001",
        termsHash
      );

    return { ...ctx, amount, invoiceId: 1n };
  }

  it("creates an invoice", async function () {
    const { escrow, merchant, payer, reviewer, resolver, amount } = await createInvoice();

    const invoice = await escrow.getInvoice(1);
    expect(invoice.id).to.equal(1);
    expect(invoice.merchant).to.equal(merchant.address);
    expect(invoice.payer).to.equal(payer.address);
    expect(invoice.reviewer).to.equal(reviewer.address);
    expect(invoice.resolver).to.equal(resolver.address);
    expect(invoice.amount).to.equal(amount);
    expect(invoice.status).to.equal(1);
    expect(await escrow.totalCreated()).to.equal(1);
  });

  it("funds, approves, and releases an invoice", async function () {
    const { escrow, usdc, merchant, payer, reviewer, amount, invoiceId } = await createInvoice();

    await usdc.connect(payer).approve(await escrow.getAddress(), amount);

    await expect(escrow.connect(payer).fundInvoice(invoiceId))
      .to.emit(escrow, "InvoiceFunded")
      .withArgs(invoiceId, payer.address, amount);

    await expect(escrow.connect(reviewer).approveDelivery(invoiceId))
      .to.emit(escrow, "DeliveryApproved")
      .withArgs(invoiceId, reviewer.address);

    await expect(escrow.connect(payer).releaseInvoice(invoiceId))
      .to.emit(escrow, "InvoiceReleased")
      .withArgs(invoiceId, merchant.address, amount);

    expect(await usdc.balanceOf(merchant.address)).to.equal(amount);
    expect((await escrow.getInvoice(invoiceId)).status).to.equal(5);
    expect(await escrow.totalReleased()).to.equal(amount);
  });

  it("refunds through dispute resolution", async function () {
    const { escrow, usdc, payer, merchant, resolver, amount, invoiceId } = await createInvoice();

    await usdc.connect(payer).approve(await escrow.getAddress(), amount);
    await escrow.connect(payer).fundInvoice(invoiceId);

    await expect(escrow.connect(merchant).openDispute(invoiceId, disputeHash))
      .to.emit(escrow, "InvoiceDisputed")
      .withArgs(invoiceId, merchant.address, disputeHash);

    await expect(escrow.connect(resolver).resolveDispute(invoiceId, 1))
      .to.emit(escrow, "InvoiceRefunded")
      .withArgs(invoiceId, payer.address, amount);

    expect(await usdc.balanceOf(payer.address)).to.equal(parseUsdc("1000"));
    expect((await escrow.getInvoice(invoiceId)).status).to.equal(6);
    expect(await escrow.totalRefunded()).to.equal(amount);
  });

  it("cancels an unfunded invoice", async function () {
    const { escrow, payer, invoiceId } = await createInvoice();

    await expect(escrow.connect(payer).cancelInvoice(invoiceId))
      .to.emit(escrow, "InvoiceCancelled")
      .withArgs(invoiceId, payer.address);

    expect((await escrow.getInvoice(invoiceId)).status).to.equal(7);
  });

  it("rejects unauthorized actions", async function () {
    const { escrow, usdc, payer, stranger, amount, invoiceId } = await createInvoice();

    await expect(escrow.connect(stranger).fundInvoice(invoiceId)).to.be.revertedWithCustomError(
      escrow,
      "Unauthorized"
    );

    await usdc.connect(payer).approve(await escrow.getAddress(), amount);
    await escrow.connect(payer).fundInvoice(invoiceId);

    await expect(escrow.connect(stranger).approveDelivery(invoiceId)).to.be.revertedWithCustomError(
      escrow,
      "Unauthorized"
    );
  });

  it("rejects invalid state transitions", async function () {
    const { escrow, payer, invoiceId } = await createInvoice();

    await expect(escrow.connect(payer).releaseInvoice(invoiceId)).to.be.revertedWithCustomError(
      escrow,
      "InvalidState"
    );
  });

  it("lists invoice ids", async function () {
    const { escrow, merchant, payer } = await deployFixture();

    await escrow
      .connect(merchant)
      .createInvoice(payer.address, ethers.ZeroAddress, ethers.ZeroAddress, parseUsdc("1"), 0, "one", termsHash);
    await escrow
      .connect(merchant)
      .createInvoice(payer.address, ethers.ZeroAddress, ethers.ZeroAddress, parseUsdc("2"), 0, "two", termsHash);

    expect(await escrow.listInvoiceIds(1, 10)).to.deep.equal([1n, 2n]);
  });
});
