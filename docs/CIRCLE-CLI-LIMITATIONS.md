# Circle CLI Limitations

Circle CLI works reliably in the Nano WizPay demos with scalar ABI function arguments:

```text
approve(address,uint256)
executeSwap(address,address,address,uint256,uint256,address,uint256)
routeAndPay(address,address,uint256,uint256,address)
```

Circle CLI may fail estimation or execution with overloaded array-based functions, including:

```text
batchRouteAndPay(address,address[],address[],uint256[],uint256[],string)
batchRouteAndPay(address,address,address[],uint256[],uint256[],string)
```

Because of this limitation, the official Circle CLI payroll demo uses `routeAndPay` per payout through:

```text
circleCliFallback.commands
```

## Batch Calldata Remains Supported

Nano WizPay still returns batch payroll calldata in:

```text
batches[].calldata
```

That calldata is intended for SDK, frontend, or raw calldata executors that can handle the batch function directly. Do not remove batch calldata support.
