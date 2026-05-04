# FasterInvoiceEscrow

## 一句话概述

FasterInvoiceEscrow 是一个运行在 Arc Testnet 上、以 USDC 为核心的 B2B 发票托管支付 demo。商户创建发票，付款方注资，审核人确认交付，托管合约根据发票状态释放或退回款项。

## 目标生态

- 链/测试网：Arc Testnet
- Chain ID：`5042002`
- RPC：`https://rpc.testnet.arc.network`
- WebSocket：`wss://rpc.testnet.arc.network`
- 浏览器：`https://testnet.arcscan.app`
- Faucet：`https://faucet.circle.com`
- 原生 gas 模型：
  - Arc 使用 USDC 作为原生 EVM gas 资产。
  - 可选的 USDC ERC-20 接口地址为 `0x3600000000000000000000000000000000000000`。
  - 原生 gas 记账使用 18 位小数，而 ERC-20 USDC 接口使用 6 位小数。应用在处理发票金额和转账时，必须使用 ERC-20 decimals。
- 官方文档：
  - Arc Connect：https://docs.arc.network/arc/references/connect-to-arc
  - Arc Contract Addresses：https://docs.arc.network/arc/references/contract-addresses
  - Arc Terms：https://docs.arc.network/terms
- 调研日期：2026-05-03，Asia/Shanghai

## 已核验事实

- Circle 于 2025-10-28 上线 Arc Public Testnet，当时有超过 100 个 launch/design participants，覆盖金融、支付、数字资产和基础设施等领域。来源：https://www.circle.com/pressroom/circle-launches-arc-public-testnet
- Circle 将 Arc 描述为一个开放 Layer 1 网络，具备可预测的美元计价费用、亚秒级终局性、可配置隐私能力，并与 Circle 平台直接集成。来源：https://www.circle.com/pressroom/circle-launches-arc-public-testnet
- Circle FY2025 财报称，截至 2026-02-20，Arc Testnet 自上线以来交易量超过 1.66 亿笔，接近 100% uptime，交易终局性约半秒，近 30 天日均交易量为 230 万笔。来源：https://www.circle.com/pressroom/circle-reports-fourth-quarter-and-full-fiscal-year-2025-financial-results
- Circle FY2025 财报称，Arc 仍按计划在 2026 年推出主网。来源：https://www.circle.com/pressroom/circle-reports-fourth-quarter-and-full-fiscal-year-2025-financial-results
- Arc 文档列出 Arc Testnet chain ID 为 `5042002`，RPC 为 `https://rpc.testnet.arc.network`，浏览器为 `https://testnet.arcscan.app`，faucet 为 `https://faucet.circle.com`。来源：https://docs.arc.network/arc/references/connect-to-arc
- Arc 文档说明，USDC 是 Arc 上的原生 EVM 资产，并用于 gas 费用。可选的 USDC ERC-20 接口可用于 `transferFrom`、`approve` 和 allowance 流程，地址为 `0x3600000000000000000000000000000000000000`。来源：https://docs.arc.network/arc/references/contract-addresses
- Arc Terms 说明，Testnet USDC 仅用于测试网，没有货币价值或内在价值，Circle 也不承诺维护测试网余额或交易历史。来源：https://docs.arc.network/terms
- 2026-05-03 约 13:37 Asia/Shanghai 抓取的 ArcScan API 快照显示，Arc Testnet 约有 381,231,822 笔总交易、28,348,835 个总地址、40,257,604 个总区块，平均出块时间约 510 ms。来源：https://testnet.arcscan.app/api/v2/stats

## 产品判断

Arc 的 USDC gas 模型非常适合商业支付工作流，因为用户可以用美元计价单位理解手续费和发票金额。FasterInvoiceEscrow 展示了这个流程的一个紧凑版本：

- 商户创建结构化发票。
- 付款方用 USDC 为发票注资。
- 审核人确认交付。
- 资金释放给商户，或退款给付款方。
- 争议发票可由配置好的 resolver 处理。

这个 demo 会刻意保持小范围：它是一个测试网应用，用于探索 Arc 的 EVM 兼容性、USDC ERC-20 接口、钱包 UX、合约验证和静态前端部署。

## MVP 范围

### 必须实现

- 一个 Solidity 托管合约，支持发票创建、注资、确认、释放、取消、争议、争议解决和退款。
- 使用 6 位小数 mock ERC-20 token 的本地测试，以模拟 Arc 的 USDC ERC-20 接口。
- 一个 Vite + React + TypeScript 前端，可以连接钱包、展示 Arc Testnet 配置、创建发票、列出发票、为发票注资、确认交付、释放资金、发起争议、解决争议，并显示浏览器链接。
- 一个 Arc Testnet 部署脚本，从配置中读取 USDC ERC-20 接口地址。
- 一个 README，包含 setup、test、deploy、frontend 和使用说明。
- 一个 `.env.example`，列出所有必要变量。

### 可以加分

- Dashboard 汇总：总发票数、已注资金额、已释放金额、已退款金额和争议金额。
- 部署脚本生成 `deployments/arc-testnet.json`，并由前端读取。
- 一个简短的 `docs/feedback-notes.md` 文件，用于记录 RPC、钱包 UX、浏览器行为和合约验证方面的技术观察。

### 不在范围内

- 生产级发票、法律可执行性、税务处理、会计集成、真实客户数据、邮件通知、法币出入金、KYC 或商业承诺。
- 主网部署。
- 可升级合约。
- 托管真实资金。

## 用户角色

- Owner/admin：
  - 部署合约。
  - 设置或轮换默认 resolver。
- Merchant：
  - 创建发票，并接收释放的 USDC。
- Payer：
  - 查看发票，并用 Arc Testnet USDC 注资。
- Reviewer：
  - 在释放前确认交付。MVP 中 reviewer 可以是 payer，也可以是创建发票时指定的独立 reviewer 钱包。
- Resolver：
  - 处理争议，决定释放给 merchant 或退款给 payer。

## 用户流程

1. 创建发票：
   - Merchant 连接钱包。
   - Merchant 输入 payer 地址、reviewer 地址、金额、到期日、短标题、metadata URI/hash 和 terms hash。
   - 前端调用 `createInvoice`。
   - 合约发出 `InvoiceCreated` 事件。
   - UI 显示 invoice ID 和 ArcScan 交易链接。
2. 为发票注资：
   - Payer 在 Arc Testnet 上连接钱包。
   - UI 检查 payer 的 USDC 余额，以及对托管合约的 allowance。
   - 如有需要，payer 先 approve USDC。
   - Payer 调用 `fundInvoice`。
   - 合约将 USDC 转入托管，并发出 `InvoiceFunded` 事件。
3. 确认并释放：
   - Reviewer 调用 `approveDelivery`。
   - Payer 调用 `releaseInvoice`。
   - 合约将 USDC 转给 merchant，并发出 `InvoiceReleased` 事件。
4. 注资前取消：
   - Merchant 或 payer 取消尚未注资的发票。
   - 合约发出 `InvoiceCancelled` 事件。
5. 争议：
   - Payer 或 merchant 调用 `openDispute`，并传入 `reasonHash`。
   - 合约发出 `InvoiceDisputed` 事件。
   - Resolver 调用 `resolveDispute(invoiceId, Resolution.Release)` 或 `resolveDispute(invoiceId, Resolution.Refund)`。
   - 合约发出 `DisputeResolved`，并同时发出 `InvoiceReleased` 或 `InvoiceRefunded`。
6. 退款：
   - 如果争议结果偏向付款方，合约将托管 USDC 转回 payer，并发出 `InvoiceRefunded`。

## 智能合约

### FasterInvoiceEscrow

- 目的：
  - 存储发票记录，并持有已注资发票的 USDC 托管余额。
  - 为 Arc Testnet 上的商业支付结算提供简单状态机。
- 外部 token：
  - `IERC20 public immutable usdc`
  - Arc Testnet 部署时使用 `0x3600000000000000000000000000000000000000`。
  - 本地测试时部署 6 位小数的 `MockUSDC`。
- 枚举：
  - `InvoiceStatus`：`None`、`Created`、`Funded`、`Approved`、`Disputed`、`Released`、`Refunded`、`Cancelled`
  - `Resolution`：`Release`、`Refund`
- 状态：
  - `uint256 public nextInvoiceId`
  - `address public owner`
  - `address public defaultResolver`
  - `mapping(uint256 => Invoice) public invoices`
  - 聚合计数器：`totalCreated`、`totalFunded`、`totalReleased`、`totalRefunded`、`totalDisputed`
- 结构体：
  - `uint256 id`
  - `address merchant`
  - `address payer`
  - `address reviewer`
  - `address resolver`
  - `uint256 amount`
  - `uint64 createdAt`
  - `uint64 dueAt`
  - `InvoiceStatus status`
  - `string metadataURI`
  - `bytes32 termsHash`
  - `bytes32 disputeReasonHash`
- 函数：
  - `constructor(address usdc_, address defaultResolver_)`
  - `createInvoice(address payer, address reviewer, address resolver, uint256 amount, uint64 dueAt, string calldata metadataURI, bytes32 termsHash) returns (uint256 invoiceId)`
  - `fundInvoice(uint256 invoiceId)`
  - `approveDelivery(uint256 invoiceId)`
  - `releaseInvoice(uint256 invoiceId)`
  - `cancelInvoice(uint256 invoiceId)`
  - `openDispute(uint256 invoiceId, bytes32 reasonHash)`
  - `resolveDispute(uint256 invoiceId, Resolution resolution)`
  - `setDefaultResolver(address newResolver)`
  - `getInvoice(uint256 invoiceId) external view returns (Invoice memory)`
  - `listInvoiceIds(uint256 startId, uint256 limit) external view returns (uint256[] memory)`
- 事件：
  - `InvoiceCreated(uint256 indexed invoiceId, address indexed merchant, address indexed payer, address reviewer, address resolver, uint256 amount, uint64 dueAt, string metadataURI, bytes32 termsHash)`
  - `InvoiceFunded(uint256 indexed invoiceId, address indexed payer, uint256 amount)`
  - `DeliveryApproved(uint256 indexed invoiceId, address indexed reviewer)`
  - `InvoiceReleased(uint256 indexed invoiceId, address indexed merchant, uint256 amount)`
  - `InvoiceRefunded(uint256 indexed invoiceId, address indexed payer, uint256 amount)`
  - `InvoiceCancelled(uint256 indexed invoiceId, address indexed cancelledBy)`
  - `InvoiceDisputed(uint256 indexed invoiceId, address indexed openedBy, bytes32 reasonHash)`
  - `DisputeResolved(uint256 indexed invoiceId, address indexed resolver, Resolution resolution)`
  - `DefaultResolverUpdated(address indexed oldResolver, address indexed newResolver)`
- 访问控制：
  - `createInvoice`：任意 merchant 钱包。
  - `fundInvoice`：仅限该发票 payer。
  - `approveDelivery`：发票 reviewer；如果 reviewer 为 `address(0)`，则 payer 可操作。
  - `releaseInvoice`：发票 approved 后，仅限 payer 操作。
  - `cancelInvoice`：仅限 merchant 或 payer，且状态必须为 `Created`。
  - `openDispute`：仅限 merchant 或 payer，且状态必须为 `Funded` 或 `Approved`。
  - `resolveDispute`：仅限发票 resolver 或 default resolver，且状态必须为 `Disputed`。
  - `setDefaultResolver`：仅限 owner。
- 失败场景：
  - payer、merchant 或 USDC 为零地址。
  - 金额为 0。
  - 非 payer 尝试注资。
  - 对非 `Created` 状态发票注资。
  - allowance 或余额不足。
  - 未确认交付前释放。
  - 在错误状态下发起争议或解决争议。
  - 退款或释放转账失败。

### MockUSDC

- 目的：仅用于本地测试。
- ERC-20 名称：`Mock USDC`
- Symbol：`mUSDC`
- Decimals：`6`
- 函数：
  - `mint(address to, uint256 amount)`

## 前端

### 页面

- Dashboard：
  - 显示已连接钱包、Arc 网络状态、合约地址、USDC 余额、总发票数、已注资金额、已释放金额、已退款金额、争议数量和快捷链接。
- Create Invoice：
  - 输入项：payer、reviewer、可选 resolver、USDC 金额、到期日、标题、metadata URI/hash、terms hash。
  - 调用 `createInvoice`。
- Invoice List：
  - 从合约状态读取最近的 invoice IDs。
  - 按状态过滤。
  - 基于当前连接钱包和发票状态展示操作。
- Invoice Detail：
  - 展示完整发票数据、生命周期状态、角色地址、金额、metadata 和交易链接。
  - 操作：approve USDC、fund、approve delivery、release、cancel、open dispute、resolve release、resolve refund。
- Technical Notes：
  - 静态页面或 Markdown 链接，用于记录 Arc 集成技术说明。

### 钱包和网络 UX

- 需要的钱包：
  - MetaMask、Rabby、Coinbase Wallet，或其他可连接 Arc Testnet 的 EVM 钱包。
- 网络切换：
  - 使用 EIP-3085 `wallet_addEthereumChain`，配置如下：
    - `chainId`：`0x4cf172`
    - `chainName`：`Arc Testnet`
    - `nativeCurrency`：`{ name: "USDC", symbol: "USDC", decimals: 18 }`
    - `rpcUrls`：`["https://rpc.testnet.arc.network"]`
    - `blockExplorerUrls`：`["https://testnet.arcscan.app"]`
  - 需要提示用户：某些钱包可能仍把 gas 资产显示为 ETH，即使 Arc 使用 USDC。
- 浏览器链接：
  - 交易：`https://testnet.arcscan.app/tx/<hash>`
  - 地址：`https://testnet.arcscan.app/address/<address>`
  - 合约：`https://testnet.arcscan.app/address/<contractAddress>`
- 错误状态：
  - 网络错误。
  - 缺少部署地址。
  - Testnet USDC 不足，无法支付 gas 或发票金额。
  - 缺少 allowance。
  - 用户拒绝钱包签名。
  - 合约 revert，需要展示友好错误。
  - RPC 不可用。

## 数据和 Metadata

- 链上字段：
  - 角色地址、金额、时间戳、状态、metadata URI、terms hash、dispute reason hash。
- 链下/mock metadata：
  - Demo 发票标题、行项目、商户备注、交付备注和文档链接，可以存储为本地 mock data 或静态 JSON 文件。
  - 不要存储真实客户或财务数据。
- 隐私说明：
  - Arc Testnet 数据是公开且临时的。
  - 该 MVP 仅用于测试、实验和研究。
  - 所有看起来真实的发票文本都应是虚构内容。

## 部署目标

- 合约：
  - 本地 Hardhat network 用于测试。
  - Arc Testnet 用于公开 demo。
- 前端：
  - 支持通过 Vercel、Cloudflare Pages、Netlify 或 GitHub Pages 进行静态部署。
  - 首选建议：Vercel 连接 GitHub，方便获得公开 demo 链接。
- 可选后端/indexer：
  - MVP 不需要。
  - 如果发票数量增长，可以后续增加简单事件 indexer；不要让它阻塞第一版发布。

## 建议技术栈

- 合约：
  - Solidity `^0.8.24`
  - Hardhat
  - OpenZeppelin Contracts
- 测试：
  - Hardhat Toolbox
  - JavaScript tests
  - Chai assertions
- 前端：
  - Vite
  - React
  - TypeScript
- 钱包客户端：
  - wagmi + viem，或者如果实现者希望依赖更轻，也可以直接使用 viem。
- 样式：
  - 单个 `src/styles.css`。
  - 采用克制的金融工具型 UI：信息密度高、清晰，不做营销式 landing page。
- 部署：
  - Hardhat deploy script。
  - Vercel 或 Cloudflare Pages 部署前端。

## 仓库结构

```text
.
├── contracts/
│   ├── FasterInvoiceEscrow.sol
│   └── mocks/
│       └── MockUSDC.sol
├── scripts/
│   └── deploy.js
├── test/
│   └── FasterInvoiceEscrow.test.js
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   ├── abi/
│   │   └── FasterInvoiceEscrow.ts
│   ├── config/
│   │   ├── arc.ts
│   │   └── deployments.ts
│   └── lib/
│       ├── format.ts
│       └── invoice.ts
├── deployments/
│   └── arc-testnet.example.json
├── public/
├── docs/
│   └── feedback-notes.md
├── PROJECT_PLAN.md
├── README.md
├── LICENSE
├── .env.example
├── .gitignore
├── hardhat.config.js
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 环境变量

- `PRIVATE_KEY`：仅用于 Arc Testnet 的部署私钥。永远不要提交真实私钥。
- `ARC_RPC_URL`：如果不设置，默认使用 `https://rpc.testnet.arc.network`。
- `ARC_CHAIN_ID`：`5042002`
- `ARC_USDC_ADDRESS`：`0x3600000000000000000000000000000000000000`
- `DEFAULT_RESOLVER`：部署时使用的 resolver 钱包。
- `EXPLORER_API_KEY`：可选，仅当 ArcScan 验证需要时使用。
- `VITE_ARC_CHAIN_ID`：`5042002`
- `VITE_ARC_RPC_URL`：`https://rpc.testnet.arc.network`
- `VITE_ARC_EXPLORER_URL`：`https://testnet.arcscan.app`
- `VITE_ARC_USDC_ADDRESS`：`0x3600000000000000000000000000000000000000`
- `VITE_ESCROW_ADDRESS`：已部署的 `FasterInvoiceEscrow` 地址。

## Demo QA 计划

- 合约检查：
  - create、fund、approve、release、cancel、dispute、resolve-to-release、resolve-to-refund 流程。
  - 非 payer、非 reviewer、非 resolver、非 owner 操作的权限失败。
  - 错误状态流转。
  - ERC-20 allowance 和 balance 失败。
- 前端检查：
  - 连接钱包。
  - 添加/切换 Arc Testnet。
  - 创建发票。
  - approve USDC。
  - 为发票注资。
  - 确认交付。
  - 释放或退款。
  - 显示 ArcScan 链接。
- 测试钱包：
  - 手动体验应用时，使用不同本地/测试网钱包分别扮演 deployer、merchant、payer、reviewer 和 resolver。

## 里程碑

1. 完成仓库 scaffold，并确保合约可编译。
2. 使用 `MockUSDC` 的本地合约测试通过。
3. 前端能连接钱包，并读写本地或已配置的合约状态。
4. Arc Testnet 部署脚本准备就绪，并写入 `deployments/arc-testnet.json`。
5. 在部署凭据和验证流程可用时，在 ArcScan 验证合约。
6. 前端公开部署。
7. README 包含部署地址、demo URL、使用步骤和测试网声明。
8. 写好 technical notes，方便后续维护。

## 验收标准

- `npm install` 成功。
- `npm test` 或 `npx hardhat test` 通过。
- `npx hardhat compile` 通过。
- 前端 typecheck/build 通过：`npm run build`。
- `.env.example` 记录每个必要变量。
- README 包含：
  - 项目概述。
  - Arc Testnet 设置。
  - 本地开发命令。
  - 合约部署命令。
  - 前端部署说明。
  - 合约地址区块。
  - Demo 流程。
  - 测试网声明。
- 合约为每个发票生命周期转变发出事件。
- 前端支持完整流程：create invoice、approve USDC、fund、approve delivery、release、cancel、dispute、resolve refund、resolve release。
- 前端能为交易、地址和托管合约生成 ArcScan 链接。
- 不提交私钥或 secrets。
- 文档或 UI 中不暗示生产就绪或真实资金托管。

## 风险和防护

- 风险：混淆 Arc 原生 USDC gas decimals 和 USDC ERC-20 接口 decimals。
  - 防护：发票 token 转账使用 `parseUnits(amount, 6)`；18 位小数的原生货币处理仅用于钱包网络 metadata。
- 风险：把测试网资金或记录当成持久资产。
  - 防护：引用 Arc Terms 并声明 Testnet USDC 没有货币价值。
- 风险：在核心 dApp 可用前过度建设后端。
  - 防护：MVP 保持为静态前端 + 智能合约后端。
- 风险：公开分享私人商业数据。
  - 防护：只使用虚构 demo metadata 和 hashes。
- 风险：误部署到主网或误用真实资金。
  - 防护：文档中固定使用 Arc Testnet 默认配置；任何其他网络必须显式配置。

## 实现交接

- 根据本文件构建 MVP，不需要依赖之前的聊天上下文。
- 因为当前仓库为空，优先采用建议的 Hardhat + Vite + React + TypeScript 技术栈。
- 先实现 `FasterInvoiceEscrow`，再写测试，然后实现前端。
- 将智能合约视为 MVP 状态和状态转移的后端。
- 除非后续任务明确要求 indexing、邮件通知、私有 metadata 或定时任务，否则不要增加传统后端。
- 不要提交 `.env`、私钥、助记词、API secrets 或真实钱包凭据。
- 如果缺少测试网部署凭据，实现部署脚本，并在 README 中留下准确命令。
- 如果 ArcScan 验证因缺少 API 细节而受阻，记录当前 blocker，并包含手动验证步骤。
- 实现后启动本地开发服务器，并提供 URL。
- 最终实现应聚焦于可用 demo，而不是宽泛的 SaaS 功能。
