export const wizpayPayrollRouterAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "feeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "feeCollector",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "fxEngine",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "whitelistEnabled",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "whitelistedTokens",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getEstimatedOutput",
    stateMutability: "view",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [{ name: "estimatedAmountOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "getBatchEstimatedOutputs",
    stateMutability: "view",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOuts", type: "address[]" },
      { name: "amountsIn", type: "uint256[]" },
    ],
    outputs: [
      { name: "estimatedAmountsOut", type: "uint256[]" },
      { name: "totalEstimatedOut", type: "uint256" },
      { name: "totalFees", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "batchRouteAndPay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "recipients", type: "address[]" },
      { name: "amountsIn", type: "uint256[]" },
      { name: "minAmountsOut", type: "uint256[]" },
      { name: "referenceId", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "batchRouteAndPay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOuts", type: "address[]" },
      { name: "recipients", type: "address[]" },
      { name: "amountsIn", type: "uint256[]" },
      { name: "minAmountsOut", type: "uint256[]" },
      { name: "referenceId", type: "string" },
    ],
    outputs: [],
  },
] as const;

export const wizpayPayrollRouterSingleTokenOutAbi = [
  {
    type: "function",
    name: "batchRouteAndPay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "recipients", type: "address[]" },
      { name: "amountsIn", type: "uint256[]" },
      { name: "minAmountsOut", type: "uint256[]" },
      { name: "referenceId", type: "string" },
    ],
    outputs: [],
  },
] as const;

export const wizpayPayrollRouterMultiTokenOutAbi = [
  {
    type: "function",
    name: "batchRouteAndPay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOuts", type: "address[]" },
      { name: "recipients", type: "address[]" },
      { name: "amountsIn", type: "uint256[]" },
      { name: "minAmountsOut", type: "uint256[]" },
      { name: "referenceId", type: "string" },
    ],
    outputs: [],
  },
] as const;
