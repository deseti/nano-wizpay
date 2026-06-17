import "dotenv/config";
import { config } from "../config.js";

type Intent = {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  recipient: string;
  slippageBps?: number;
};

type PrepareResponse = {
  error?: string;
  amount?: string;
  currency?: string;
  payTo?: string;
  instructions?: Record<string, string>;
  circleCliExample?: string;
  quote?: {
    amountOut?: {
      human?: string;
      baseUnits?: string;
    };
  };
  minAmountOut?: {
    human?: string;
    baseUnits?: string;
  };
  circleCli?: {
    approveCommand?: string;
    executeSwapCommand?: string;
    note?: string;
  };
  payment?: {
    txHash?: string;
    arcscan?: string;
  };
  arcscan?: {
    executor?: string;
    router?: string;
  };
};

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length);
}

function readIntent(): Intent {
  const slippage = readArg("slippageBps") ?? process.env.SLIPPAGE_BPS;

  return {
    tokenIn: readArg("tokenIn") ?? process.env.TOKEN_IN ?? "EURC",
    tokenOut: readArg("tokenOut") ?? process.env.TOKEN_OUT ?? "USDC",
    amountIn: readArg("amountIn") ?? process.env.AMOUNT_IN ?? "1",
    recipient:
      readArg("recipient") ??
      process.env.RECIPIENT ??
      "0x0000000000000000000000000000000000000001",
    ...(slippage ? { slippageBps: Number(slippage) } : {}),
  };
}

async function getJson(path: string) {
  const response = await fetch(`${config.apiBaseUrl}${path}`);
  return response.json();
}

async function postJson(path: string, body: unknown, headers?: Record<string, string>) {
  return fetch(`${config.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function printSection(title: string) {
  console.log(`\n== ${title} ==`);
}

function printJson(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

function servicePaymentTemplate(intent: Intent) {
  return `circle services pay ${config.apiBaseUrl}/swap/prepare --address <AGENT_WALLET_ADDRESS> --chain ARC-TESTNET --max-amount 0.01 -X POST -d '${JSON.stringify(intent)}'`;
}

function fallbackTransferCommand() {
  return `circle wallet transfer ${config.serviceFee.collector} --amount ${config.serviceFee.usdc} --address <AGENT_WALLET_ADDRESS> --chain ARC-TESTNET --token ${config.tokens.usdc}`;
}

async function main() {
  const intent = readIntent();

  console.log("WizPay Nano treasury demo assistant");
  console.log(`API: ${config.apiBaseUrl}`);
  console.log("This script prints trace steps and Circle CLI commands. It does not execute transactions.");

  printSection("Intent");
  printJson(intent);

  printSection("Services");
  const services = await getJson("/services");
  printJson(services);

  printSection("Quote");
  const quoteResponse = await postJson("/swap/quote", intent);
  const quote = await quoteResponse.json();
  printJson(quote);

  printSection("Prepare");
  const prepareResponse = await postJson("/swap/prepare", intent);
  const prepare = (await prepareResponse.json()) as PrepareResponse;

  if (prepareResponse.status === 402) {
    console.log("Payment required before execution plan is unlocked.");
    printJson({
      amount: prepare.amount,
      currency: prepare.currency,
      payTo: prepare.payTo,
      instructions: prepare.instructions,
    });

    printSection("Circle CLI Service Payment");
    console.log(prepare.circleCliExample ?? servicePaymentTemplate(intent));

    printSection("Fallback Real USDC Transfer");
    console.log(fallbackTransferCommand());
    console.log("After payment confirms, rerun with X_PAYMENT=<txHash>.");

    if (!process.env.X_PAYMENT) {
      return;
    }

    printSection("Paid Retry");
    const paidResponse = await postJson("/swap/prepare", intent, {
      "X-PAYMENT": process.env.X_PAYMENT,
    });
    const paid = (await paidResponse.json()) as PrepareResponse;
    if (!paidResponse.ok) {
      printJson(paid);
      process.exitCode = 1;
      return;
    }
    printPreparedSummary(paid);
    return;
  }

  if (!prepareResponse.ok) {
    printJson(prepare);
    process.exitCode = 1;
    return;
  }

  printPreparedSummary(prepare);
}

function printPreparedSummary(response: PrepareResponse) {
  console.log("Execution plan unlocked.");

  printSection("Quote Result");
  console.log(`Amount out: ${response.quote?.amountOut?.human ?? "unknown"}`);
  console.log(`Min amount out: ${response.minAmountOut?.human ?? "unknown"}`);

  printSection("Approve");
  console.log(response.circleCli?.approveCommand ?? "approval command unavailable");

  printSection("Execute Swap");
  console.log(response.circleCli?.executeSwapCommand ?? "executeSwap command unavailable");
  if (response.circleCli?.note) {
    console.log(response.circleCli.note);
  }

  printSection("Arcscan");
  if (response.payment?.arcscan) console.log(`Payment: ${response.payment.arcscan}`);
  if (response.arcscan?.executor) console.log(`Executor: ${response.arcscan.executor}`);
  if (response.arcscan?.router) console.log(`Router: ${response.arcscan.router}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
