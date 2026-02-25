import { dbc } from "@/db";
import type { IDonationFinalAttr } from "@/donation";
import { freq, is_recurring } from "@/donation/helpers";
import { via_name } from "@/donations/helpers";
import type { TFrequency } from "@/schemas";
import type { Ensure } from "@/types/utils";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { webhooksdb } from "../../../tables/webhooks";

interface Payload {
  id: string;
  date: string;
  recipient_id: number;
  recipient_name: string;
  amount: number;
  amount_usd: number;
  currency: string;
  donor_name: string;
  donor_email: string;
  donor_company?: string;
  program_id?: string;
  program_name?: string;
  payment_method: string;
  frequency: TFrequency;
  is_recurring: boolean;
  form_id: string | undefined;
  form_tag: string | undefined;
}

export const trigger_webhooks = async (
  r: Ensure<
    IDonationFinalAttr,
    | "network"
    | "endowmentId"
    | "charityName"
    | "transactionDate"
    | "amount"
    | "usdValue"
    | "donationFinalTxDate"
    | "donationFinalAmount"
    | "email"
    | "appUsed"
    | "denomination"
  >
) => {
  const payload: Payload = {
    id: r.transactionId,
    date: r.transactionDate,
    recipient_id: r.endowmentId,
    recipient_name: r.charityName,
    amount: r.amount,
    amount_usd: r.usdValue,
    currency: "USD",
    donor_name: r.fullName || "Anonymous",
    donor_email: r.email,
    program_id: r.programId,
    frequency: freq(r.frequency, r.isRecurring),
    program_name: r.programName,
    payment_method: via_name(r.via || ""),
    is_recurring: is_recurring(r.frequency, r.isRecurring),
    form_id: r.form_id,
    form_tag: r.form_tag,
  };

  if (r.company_name) payload.donor_company = r.company_name;

  const cmd = new QueryCommand({
    TableName: webhooksdb.table,
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: {
      ":pk": `Zapier#${r.network}#${r.endowmentId}`,
    },
  });

  const res = await dbc.send(cmd);

  for (const webhook of res.Items || []) {
    const res = await global.fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }); // send webhook

    if (!res.ok) {
      const err = await res.text();
      console.info(webhook);
      console.error(webhook, err);
      continue;
    }
    console.info("webhook notified", await res.json());
  }
};
