import { defineChain } from "viem";

export const ARC_CHAIN_ID = Number(import.meta.env.VITE_ARC_CHAIN_ID || 5042002);
export const ARC_RPC_URL = import.meta.env.VITE_ARC_RPC_URL || "https://rpc.testnet.arc.network";
export const ARC_EXPLORER_URL = import.meta.env.VITE_ARC_EXPLORER_URL || "https://testnet.arcscan.app";
export const ARC_USDC_ADDRESS =
  (import.meta.env.VITE_ARC_USDC_ADDRESS as `0x${string}` | undefined) ||
  "0x3600000000000000000000000000000000000000";
export const ESCROW_ADDRESS = (import.meta.env.VITE_ESCROW_ADDRESS || "") as `0x${string}`;

export const arcTestnet = defineChain({
  id: ARC_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [ARC_RPC_URL],
      webSocket: ["wss://rpc.testnet.arc.network"]
    }
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: ARC_EXPLORER_URL
    }
  },
  testnet: true
});

export const arcNetworkParams = {
  chainId: `0x${ARC_CHAIN_ID.toString(16)}`,
  chainName: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18
  },
  rpcUrls: [ARC_RPC_URL],
  blockExplorerUrls: [ARC_EXPLORER_URL]
};

export const explorerAddressUrl = (address: string) => `${ARC_EXPLORER_URL}/address/${address}`;
export const explorerTxUrl = (hash: string) => `${ARC_EXPLORER_URL}/tx/${hash}`;
