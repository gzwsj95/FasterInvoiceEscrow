import type { Address, Hex } from "viem";

export const invoiceStatusNames = [
  "None",
  "Created",
  "Funded",
  "Approved",
  "Disputed",
  "Released",
  "Refunded",
  "Cancelled"
] as const;

export type InvoiceStatusName = (typeof invoiceStatusNames)[number];

export type Invoice = {
  id: bigint;
  merchant: Address;
  payer: Address;
  reviewer: Address;
  resolver: Address;
  amount: bigint;
  createdAt: bigint;
  dueAt: bigint;
  status: number;
  metadataURI: string;
  termsHash: Hex;
  disputeReasonHash: Hex;
};

export type Summary = {
  totalCreated: bigint;
  totalFunded: bigint;
  totalReleased: bigint;
  totalRefunded: bigint;
  totalDisputed: bigint;
};

export const statusName = (status: number) => invoiceStatusNames[status] || "Unknown";
