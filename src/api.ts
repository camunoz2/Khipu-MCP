import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const BASE_URL = "https://payment-api.khipu.com";

async function khipuFetch(
  path: string,
  method: string,
  body?: Record<string, unknown>
): Promise<unknown> {
  const apiKey = process.env.KHIPU_API_KEY;
  if (!apiKey) throw new Error("KHIPU_API_KEY environment variable is not set");

  const url = `${BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`Khipu API error ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

function toTextContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerApiTools(server: McpServer): void {
  // ── khipu_get_banks ─────────────────────────────────────────────────────────
  server.tool(
    "khipu_get_banks",
    "Get the list of banks available for payments in your Khipu account. Returns bank IDs, names, minimum amounts, and logos.",
    {},
    async () => {
      const data = await khipuFetch("/v3/banks", "GET");
      return toTextContent(data);
    }
  );

  // ── khipu_create_payment ────────────────────────────────────────────────────
  // Schema is extracted to a typed variable to avoid TS2589 "type instantiation
  // too deep" when the SDK maps 20+ Zod fields to handler param types.
  const createPaymentSchema: Record<string, z.ZodType> = {
    subject: z.string().max(255).describe("Payment subject / description shown to the payer"),
    currency: z.string().length(3).describe("Currency in ISO-4217 format, e.g. 'CLP'"),
    amount: z.number().positive().describe("Payment amount"),
    transaction_id: z.string().max(255).optional().describe("Your internal transaction ID"),
    custom: z.string().max(4096).optional().describe("Custom data associated with the payment"),
    body: z.string().max(4096).optional().describe("Additional payment details"),
    bank_id: z.string().max(255).optional().describe("Bank ID to pre-select for the payer"),
    return_url: z.url().optional().describe("URL to redirect after successful payment"),
    cancel_url: z.url().optional().describe("URL to redirect if the payer cancels"),
    notify_url: z.url().optional().describe("Webhook URL for payment status notifications"),
    notify_api_version: z.string().max(255).optional().describe("API version for notifications, e.g. '3.0'"),
    expires_date: z.string().optional().describe("Payment expiry datetime in ISO-8601 format"),
    send_email: z.boolean().optional().describe("Whether to send a payment email to the payer"),
    payer_name: z.string().max(255).optional().describe("Name of the payer"),
    payer_email: z.email().optional().describe("Email of the payer"),
    send_reminders: z.boolean().optional().describe("Whether to send payment reminder emails"),
    responsible_user_email: z.email().optional().describe("Email of the responsible user"),
    fixed_payer_personal_identifier: z.string().max(255).optional().describe("Fixed national ID of the payer"),
    integrator_fee: z.number().optional().describe("Integrator fee amount"),
    collect_account_uuid: z.uuid().optional().describe("UUID of the collection account"),
    confirm_timeout_date: z.string().optional().describe("Confirmation timeout datetime"),
    mandatory_payment_method: z.string().optional().describe("Force a specific payment method"),
    picture_url: z.url().optional().describe("URL of an image to show in the payment page"),
  };

  server.tool(
    "khipu_create_payment",
    "Create a new Khipu payment and get the payment URLs to redirect the user. Returns payment_id, payment_url, simplified_transfer_url, and app_url.",
    createPaymentSchema,
    async (params) => {
      const body: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
        if (value !== undefined) body[key] = value;
      }
      const data = await khipuFetch("/v3/payments", "POST", body);
      return toTextContent(data);
    }
  );

  // ── khipu_get_payment ───────────────────────────────────────────────────────
  server.tool(
    "khipu_get_payment",
    "Get full information and current status of a Khipu payment by its ID.",
    {
      id: z.string().max(255).describe("Payment ID returned by khipu_create_payment"),
    },
    async ({ id }) => {
      const data = await khipuFetch(`/v3/payments/${encodeURIComponent(id)}`, "GET");
      return toTextContent(data);
    }
  );

  // ── khipu_delete_payment ────────────────────────────────────────────────────
  server.tool(
    "khipu_delete_payment",
    "Delete a pending Khipu payment by its ID. Only payments with 'pending' status can be deleted. This action cannot be undone.",
    {
      id: z.string().max(255).describe("Payment ID to delete"),
    },
    async ({ id }) => {
      const data = await khipuFetch(`/v3/payments/${encodeURIComponent(id)}`, "DELETE");
      return toTextContent(data);
    }
  );

  // ── khipu_confirm_payment ───────────────────────────────────────────────────
  server.tool(
    "khipu_confirm_payment",
    "Confirm a Khipu payment by its ID. The payment will be settled on the next business day. WARNING: This feature is only available for clients who have contracted it separately — contact soporte@khipu.com.",
    {
      id: z.string().max(255).describe("Payment ID to confirm"),
    },
    async ({ id }) => {
      const data = await khipuFetch(`/v3/payments/${encodeURIComponent(id)}/confirm`, "POST");
      return toTextContent(data);
    }
  );

  // ── khipu_refund_payment ────────────────────────────────────────────────────
  server.tool(
    "khipu_refund_payment",
    "Refund a Khipu payment fully or partially. Only available for merchants collecting into a Khipu account and before fund settlement.",
    {
      id: z.string().max(255).describe("Payment ID to refund"),
      amount: z.number().positive().optional().describe("Amount to refund. If omitted, the full payment amount is refunded."),
    },
    async ({ id, amount }) => {
      const body: Record<string, unknown> = {};
      if (amount !== undefined) body.amount = amount;
      const data = await khipuFetch(`/v3/payments/${encodeURIComponent(id)}/refunds`, "POST", body);
      return toTextContent(data);
    }
  );

  // ── khipu_predict_payment ───────────────────────────────────────────────────
  server.tool(
    "khipu_predict_payment",
    "Get an ML-based prediction of whether a payment will succeed, given the payer's email, bank, amount, and currency. Also returns the maximum transferable amount to a new recipient.",
    {
      payer_email: z.email().describe("Email address of the payer"),
      bank_id: z.string().max(255).describe("Bank ID of the payer's bank"),
      amount: z.string().max(255).describe("Payment amount as a string"),
      currency: z.string().max(255).describe("Currency in ISO-4217 format, e.g. 'CLP'"),
    },
    async ({ payer_email, bank_id, amount, currency }) => {
      const params = new URLSearchParams({ payer_email, bank_id, amount, currency });
      const data = await khipuFetch(`/v3/predict?${params.toString()}`, "GET");
      return toTextContent(data);
    }
  );

  // ── khipu_get_payment_methods ───────────────────────────────────────────────
  server.tool(
    "khipu_get_payment_methods",
    "Get the list of available payment methods for a specific Khipu merchant account by its numeric ID.",
    {
      id: z.number().int().positive().describe("Merchant account (receiver) numeric ID"),
    },
    async ({ id }) => {
      const data = await khipuFetch(`/v3/merchants/${id}/paymentMethods`, "GET");
      return toTextContent(data);
    }
  );
}
