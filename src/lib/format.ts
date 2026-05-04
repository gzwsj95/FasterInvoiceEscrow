import { formatUnits, isAddress } from "viem";

export const shortAddress = (address?: string) => {
  if (!address || !isAddress(address)) return "Not set";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatUsdc = (amount: bigint | undefined) => {
  if (amount === undefined) return "0.00";
  const value = formatUnits(amount, 6);
  const [whole, decimals = ""] = value.split(".");
  return `${whole}.${decimals.padEnd(2, "0").slice(0, 2)}`;
};

export const formatDate = (timestamp: bigint | number) => {
  const seconds = Number(timestamp);
  if (!seconds) return "No due date";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(seconds * 1000));
};
