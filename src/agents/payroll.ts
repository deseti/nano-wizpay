import "dotenv/config";

type PayrollPayout = {
  recipient: string;
  tokenOut: string;
  amountIn: string;
};

type PayrollIntent = {
  tokenIn: string;
  referenceId: string;
  slippageBps?: number;
  payer?: string;
  payouts: PayrollPayout[];
};

type PayrollPlanResponse = {
  recipientCount?: number;
  batchCount?: number;
  totalAmountIn?: {
    human?: string;
    baseUnits?: string;
  };
  distribution?: unknown;
  batches?: Array<{
    batchIndex?: number;
    recommendedOverload?: string;
    estimates?: {
      available?: boolean;
    };
  }>;
};

type PaymentRequiredResponse = {
  error?: string;
  service?: string;
  amount?: string;
  currency?: string;
  payTo?: string;
  circleCliExample?: string;
  reason?: string;
};

type PayrollPrepareResponse = {
  error?: string;
  reason?: string;
  message?: string;
  payment?: {
    verified?: boolean;
    txHash?: string;
  };
  approval?: {
    circleCliCommand?: string;
  };
  batches?: Array<{
    batchIndex?: number;
    circleCliCommand?: string;
    calldata?: string;
  }>;
  demoTrace?: string[];
};

type HttpJsonResponse<T> = {
  status: number;
  ok: boolean;
  body: T;
};

const apiBaseUrl = (process.env.WIZPAY_API_BASE_URL ?? "http://localhost:3001").replace(/\/+$/, "");

function printSection(title: string) {
  console.log(`\n== ${title} ==`);
}

function printJson(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

function requirePayer(): string {
  const payer = process.env.PAYROLL_PAYER_ADDRESS?.trim();
  if (!payer) {
    throw new Error("PAYROLL_PAYER_ADDRESS is required for the payroll dry-run agent.");
  }
  return payer;
}

function parseIntentJson(payer: string): PayrollIntent {
  const raw = process.env.PAYROLL_INTENT_JSON;
  if (!raw || raw.trim().length === 0) {
    return buildDefaultIntent(payer);
  }

  try {
    const parsed = JSON.parse(raw) as PayrollIntent;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.payouts)) {
      throw new Error("PAYROLL_INTENT_JSON must be a payroll intent object with payouts");
    }
    return {
      ...parsed,
      payer,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`Invalid PAYROLL_INTENT_JSON: ${message}`);
  }
}

function buildDefaultIntent(payer: string): PayrollIntent {
  const recipient = process.env.PAYROLL_DEMO_RECIPIENT?.trim() || payer;
  return {
    tokenIn: "USDC",
    referenceId: `PAYROLL-DRY-RUN-${Date.now()}`,
    slippageBps: 100,
    payer,
    payouts: [
      {
        recipient,
        tokenOut: "USDC",
        amountIn: "1.00",
      },
      {
        recipient,
        tokenOut: "EURC",
        amountIn: "1.25",
      },
      {
        recipient,
        tokenOut: "EURC",
        amountIn: "1.50",
      },
    ],
  };
}

function planIntent(intent: PayrollIntent) {
  const { payer: _payer, ...planBody } = intent;
  return planBody;
}

async function postJson<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<HttpJsonResponse<T>> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown network error";
    throw new Error(`API is not reachable at ${apiBaseUrl}: ${message}`);
  }

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  return {
    status: response.status,
    ok: response.ok,
    body: parsed as T,
  };
}

function printPlanSummary(plan: PayrollPlanResponse) {
  console.log(`recipientCount: ${plan.recipientCount ?? "unknown"}`);
  console.log(`batchCount: ${plan.batchCount ?? "unknown"}`);
  console.log(
    `totalAmountIn: ${plan.totalAmountIn?.human ?? "unknown"} (${plan.totalAmountIn?.baseUnits ?? "unknown"} base units)`,
  );

  printSection("Distribution");
  printJson(plan.distribution ?? []);

  printSection("Batch Overloads");
  for (const batch of plan.batches ?? []) {
    console.log(
      `batch ${batch.batchIndex ?? "?"}: ${batch.recommendedOverload ?? "unknown"}, estimatesAvailable=${batch.estimates?.available ?? false}`,
    );
  }
}

function printPaymentInstructions(payment: PaymentRequiredResponse) {
  console.log("Payroll prepare requires payment before execution planning is unlocked.");
  console.log(`service: ${payment.service ?? "unknown"}`);
  console.log(`amount: ${payment.amount ?? "unknown"}`);
  console.log(`currency: ${payment.currency ?? "unknown"}`);
  console.log(`payTo: ${payment.payTo ?? "unknown"}`);
  if (payment.reason) console.log(`reason: ${payment.reason}`);

  printSection("Service Fee Command");
  console.log(payment.circleCliExample ?? "circleCliExample unavailable");
}

function printPaidPrepare(prepare: PayrollPrepareResponse) {
  console.log(`payment verified: ${prepare.payment?.verified ?? false}`);

  printSection("Approve Token");
  console.log(prepare.approval?.circleCliCommand ?? "approval command unavailable");

  printSection("Execute Batches");
  for (const batch of prepare.batches ?? []) {
    console.log(`batch ${batch.batchIndex ?? "?"}:`);
    console.log(batch.circleCliCommand ?? "batch command unavailable");
    console.log(`calldataLength: ${batch.calldata?.length ?? 0}`);
  }

  printSection("Demo Trace");
  for (const line of prepare.demoTrace ?? []) {
    console.log(line);
  }
}

async function main() {
  const payer = requirePayer();
  const paymentTxHash = process.env.PAYROLL_PAYMENT_TX_HASH?.trim();
  const intent = parseIntentJson(payer);

  console.log("WizPay Nano payroll dry-run agent");
  console.log(`API: ${apiBaseUrl}`);
  console.log("This script only calls Nano WizPay HTTP endpoints and prints next actions.");
  console.log("It does not run Circle CLI commands and does not execute transactions.");

  printSection("Intent");
  printJson(intent);

  printSection("Plan");
  const planResponse = await postJson<PayrollPlanResponse>("/payroll/plan", planIntent(intent));
  if (!planResponse.ok) {
    printJson(planResponse.body);
    process.exitCode = 1;
    return;
  }
  printPlanSummary(planResponse.body);

  printSection("Prepare Without Payment");
  const unpaidResponse = await postJson<PaymentRequiredResponse>("/payroll/prepare", intent);
  printJson(unpaidResponse.body);
  if (unpaidResponse.status !== 402) {
    console.log(`Expected HTTP 402, received HTTP ${unpaidResponse.status}.`);
    process.exitCode = unpaidResponse.ok ? 0 : 1;
    return;
  }
  printPaymentInstructions(unpaidResponse.body);

  if (!paymentTxHash) {
    console.log(
      "Set PAYROLL_PAYMENT_TX_HASH=<txHash> after paying the service fee, then rerun npm run agent:payroll.",
    );
    return;
  }

  printSection("Prepare With Payment");
  const paidResponse = await postJson<PayrollPrepareResponse>("/payroll/prepare", intent, {
    "X-PAYMENT": paymentTxHash,
  });
  printJson(paidResponse.body);

  if (paidResponse.status === 402) {
    console.log(
      "The payment proof was rejected. If the tx hash was already used, this is replay protection working.",
    );
    process.exitCode = 1;
    return;
  }

  if (!paidResponse.ok) {
    process.exitCode = 1;
    return;
  }

  printPaidPrepare(paidResponse.body);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
