export const ifxEngineAbi = [
  {
    type: "function",
    name: "swap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "getEstimatedAmount",
    stateMutability: "view",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [{ name: "estimatedAmountOut", type: "uint256" }],
  },
] as const;
