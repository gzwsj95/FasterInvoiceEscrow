# FasterInvoiceEscrow

FasterInvoiceEscrow is a USDC-native invoice escrow demo for Arc Testnet. It pairs a Solidity escrow contract with a static React frontend so a merchant can create an invoice, a payer can fund it with USDC, a reviewer can approve delivery, and a resolver can release or refund disputed payments.

This repository is a testnet demo. It is not production invoicing software, does not custody real funds, and should not be used with real customer data.

## Stack

- Solidity `0.8.24`
- Hardhat + JavaScript tests
- OpenZeppelin `SafeERC20`, `Ownable`, `ReentrancyGuard`
- Vite + React + TypeScript
- viem for wallet and contract calls

## Arc Testnet

- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`
- Faucet: `https://faucet.circle.com`
- USDC ERC-20 interface: `0x3600000000000000000000000000000000000000`

Arc uses USDC as the native gas asset. The ERC-20 USDC interface uses 6 decimals, while wallet network metadata for the native gas asset uses 18 decimals.

## Local Setup

```bash
npm install
npm run compile
npm test
npm run build
```

Run the frontend locally:

```bash
npm run dev
```

The app will start on `http://127.0.0.1:5173` by default.

## Environment

Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Fill only testnet credentials:

```bash
PRIVATE_KEY=your_testnet_deployer_private_key
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
DEFAULT_RESOLVER=your_resolver_wallet_address
EXPLORER_API_KEY=

VITE_ARC_CHAIN_ID=5042002
VITE_ARC_RPC_URL=https://rpc.testnet.arc.network
VITE_ARC_EXPLORER_URL=https://testnet.arcscan.app
VITE_ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
VITE_ESCROW_ADDRESS=
```

Never commit `.env` or any private key.

## Deploy Contract

1. Get Arc Testnet USDC from the faucet for the deployer wallet.
2. Set `PRIVATE_KEY` and `DEFAULT_RESOLVER` in `.env`.
3. Deploy:

```bash
npm run deploy:arc
```

The script writes the deployed address to:

```text
deployments/arc-testnet.json
```

That generated deployment file is intentionally ignored by git. Copy the `FasterInvoiceEscrow` address into `.env`:

```bash
VITE_ESCROW_ADDRESS=0xYourEscrowContractAddress
```

Then rebuild or restart the frontend:

```bash
npm run build
npm run dev
```

## ArcScan Verification

The deploy script attempts Hardhat verification automatically on ArcScan's Blockscout-compatible API. If automatic verification does not complete, use the printed constructor arguments:

```text
constructor(address usdc_, address defaultResolver_)
```

For Arc Testnet:

```text
usdc_: 0x3600000000000000000000000000000000000000
defaultResolver_: your DEFAULT_RESOLVER address, or deployer address if DEFAULT_RESOLVER was blank
```

Manual verification path:

1. Open `https://testnet.arcscan.app/address/<contractAddress>`.
2. Choose contract verification.
3. Select Solidity compiler `0.8.24`.
4. Enable optimizer with `200` runs.
5. Upload or paste `contracts/FasterInvoiceEscrow.sol` and imported OpenZeppelin sources if ArcScan asks for flattened input.
6. Provide the constructor arguments above.

## Frontend Publish

The frontend is static. The recommended publish target for this repo is GitHub Pages.

### Vercel

1. Push this repository to GitHub.
2. In Vercel, import the GitHub repository.
3. Set build command:

```bash
npm run build
```

4. Set output directory:

```text
dist
```

5. Add environment variables:

```text
VITE_ARC_CHAIN_ID=5042002
VITE_ARC_RPC_URL=https://rpc.testnet.arc.network
VITE_ARC_EXPLORER_URL=https://testnet.arcscan.app
VITE_ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
VITE_ESCROW_ADDRESS=0xYourEscrowContractAddress
```

6. Deploy.

### GitHub Pages

This repo includes a direct GitHub Pages release script. It builds `dist/`, copies the static files
to a temporary directory, adds `.nojekyll` and `404.html`, then force-pushes the output to the
`gh-pages` branch.

1. Push this repository to GitHub.
2. In GitHub, open `Settings` -> `Pages`.
3. Source: `Deploy from a branch`.
4. Branch: `gh-pages`.
5. Folder: `/ (root)`.
6. Save.

Make sure the local `.env` has the frontend variables before publishing:

```text
VITE_ARC_CHAIN_ID=5042002
VITE_ARC_RPC_URL=https://rpc.testnet.arc.network
VITE_ARC_EXPLORER_URL=https://testnet.arcscan.app
VITE_ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
VITE_ESCROW_ADDRESS=0xYourEscrowContractAddress
```

Deploy the current version without changing `package.json`:

```bash
npm run deploy:github
```

To bump the app version, build, and publish in one command:

```bash
npm run release:github
```

The default release bumps the patch version, for example `0.1.0` -> `0.1.1`. Other release types:

```bash
npm run release:github:minor
npm run release:github:major
```

You can preview what would happen without changing files, building, or pushing:

```bash
npm run release:github -- --dry-run
```

You can override the remote or branch:

```bash
npm run release:github -- --remote origin --branch gh-pages
```

Or set environment variables before running the command:

```bash
GITHUB_PAGES_REMOTE=origin
GITHUB_PAGES_BRANCH=gh-pages
```

If the repository uses the default GitHub Pages project URL, the app will be available at:

```text
https://<github-user-or-org>.github.io/<repository-name>/
```

For custom domains, configure the domain in GitHub Pages settings after the first publish. The Vite
build uses a relative base path so it works with either a project URL or a custom domain.

The release script updates `package.json` and `package-lock.json`; commit those version changes after
a successful release if you want the repository history to reflect the deployed version.

### Other static hosts

The app can still be deployed to any static host. Use:

```bash
npm run build
```

Then upload:

```text
dist/
```

## Demo Flow

Use separate testnet wallets for a clean manual test:

- Deployer/admin
- Merchant
- Payer
- Reviewer
- Resolver

Suggested walkthrough:

1. Connect merchant wallet.
2. Create an invoice with payer, reviewer, resolver, amount, due date, metadata URI, and terms.
3. Switch to payer wallet.
4. Approve USDC for the escrow contract.
5. Fund the invoice.
6. Switch to reviewer wallet.
7. Approve delivery.
8. Switch to payer wallet.
9. Release the invoice.
10. Create another invoice and exercise dispute resolution with release and refund outcomes.

## Commands

```bash
npm run compile
npm test
npm run build
npm run dev
npm run deploy:arc
```

## Project Files

- `contracts/FasterInvoiceEscrow.sol`: invoice escrow state machine.
- `contracts/mocks/MockUSDC.sol`: local 6-decimal ERC-20 test token.
- `test/FasterInvoiceEscrow.test.js`: contract tests.
- `scripts/deploy.js`: Arc Testnet deployment and optional verification.
- `src/App.tsx`: React dApp.
- `src/config/arc.ts`: Arc Testnet frontend config.
- `PROJECT_PLAN.md`: technical implementation plan.
- `PROJECT_PLAN.zh-CN.md`: Chinese translation of the technical plan.
