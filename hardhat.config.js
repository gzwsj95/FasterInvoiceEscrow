require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const privateKey = process.env.PRIVATE_KEY?.trim();
const normalizedPrivateKey = privateKey
  ? privateKey.startsWith("0x")
    ? privateKey
    : `0x${privateKey}`
  : undefined;

/** @type {import("hardhat/config").HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    arcTestnet: {
      url: process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network",
      chainId: Number(process.env.ARC_CHAIN_ID || 5042002),
      accounts: normalizedPrivateKey ? [normalizedPrivateKey] : []
    }
  },
  etherscan: {
    apiKey: {
      arcTestnet: process.env.EXPLORER_API_KEY || "arc-testnet"
    },
    customChains: [
      {
        network: "arcTestnet",
        chainId: 5042002,
        urls: {
          apiURL: "https://testnet.arcscan.app/api",
          browserURL: "https://testnet.arcscan.app"
        }
      }
    ]
  }
};
