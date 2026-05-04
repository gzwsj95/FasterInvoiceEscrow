export const fasterInvoiceEscrowAbi = [
  {
    type: "function",
    name: "approveDelivery",
    stateMutability: "nonpayable",
    inputs: [{ name: "invoiceId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "cancelInvoice",
    stateMutability: "nonpayable",
    inputs: [{ name: "invoiceId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "createInvoice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "payer", type: "address" },
      { name: "reviewer", type: "address" },
      { name: "resolver", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "dueAt", type: "uint64" },
      { name: "metadataURI", type: "string" },
      { name: "termsHash", type: "bytes32" }
    ],
    outputs: [{ name: "invoiceId", type: "uint256" }]
  },
  {
    type: "function",
    name: "fundInvoice",
    stateMutability: "nonpayable",
    inputs: [{ name: "invoiceId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "getInvoice",
    stateMutability: "view",
    inputs: [{ name: "invoiceId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "merchant", type: "address" },
          { name: "payer", type: "address" },
          { name: "reviewer", type: "address" },
          { name: "resolver", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "createdAt", type: "uint64" },
          { name: "dueAt", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "metadataURI", type: "string" },
          { name: "termsHash", type: "bytes32" },
          { name: "disputeReasonHash", type: "bytes32" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "listInvoiceIds",
    stateMutability: "view",
    inputs: [
      { name: "startId", type: "uint256" },
      { name: "limit", type: "uint256" }
    ],
    outputs: [{ name: "ids", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "openDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "invoiceId", type: "uint256" },
      { name: "reasonHash", type: "bytes32" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "releaseInvoice",
    stateMutability: "nonpayable",
    inputs: [{ name: "invoiceId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "resolveDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "invoiceId", type: "uint256" },
      { name: "resolution", type: "uint8" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "totalCreated",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "totalDisputed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "totalFunded",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "totalRefunded",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "totalReleased",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  }
] as const;
