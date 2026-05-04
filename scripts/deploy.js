const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config();
const { ethers, network, run } = require("hardhat");

const ARC_USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account configured. Set PRIVATE_KEY in .env.");
  }

  const usdcAddress = process.env.ARC_USDC_ADDRESS || ARC_USDC_ADDRESS;
  const defaultResolver = process.env.DEFAULT_RESOLVER || deployer.address;

  console.log(`Deploying FasterInvoiceEscrow to ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`USDC: ${usdcAddress}`);
  console.log(`Default resolver: ${defaultResolver}`);

  const Escrow = await ethers.getContractFactory("FasterInvoiceEscrow");
  const escrow = await Escrow.deploy(usdcAddress, defaultResolver);
  await escrow.waitForDeployment();

  const escrowAddress = await escrow.getAddress();
  console.log(`FasterInvoiceEscrow deployed: ${escrowAddress}`);

  const deployment = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    usdc: usdcAddress,
    defaultResolver,
    contracts: {
      FasterInvoiceEscrow: escrowAddress
    }
  };

  fs.mkdirSync(path.join(process.cwd(), "deployments"), { recursive: true });
  const outputName = network.name === "arcTestnet" ? "arc-testnet.json" : `${network.name}.json`;
  fs.writeFileSync(
    path.join(process.cwd(), "deployments", outputName),
    `${JSON.stringify(deployment, null, 2)}\n`
  );

  if (network.name === "arcTestnet") {
    console.log("Waiting before verification...");
    await new Promise((resolve) => setTimeout(resolve, 15000));
    try {
      await run("verify:verify", {
        address: escrowAddress,
        constructorArguments: [usdcAddress, defaultResolver]
      });
      console.log("Verification submitted.");
    } catch (error) {
      console.warn("Verification did not complete automatically.");
      console.warn(error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
