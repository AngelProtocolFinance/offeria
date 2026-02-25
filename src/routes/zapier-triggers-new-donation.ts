import { dondb } from "$/tables/donations-settled";
import { webhooksdb } from "$/tables/webhooks";
import { is_recurring } from "@/donation/helpers";
import type { ActionFunction, LoaderFunction } from "react-router";
import { is_response, validate_api_key } from "./helpers/validate-api-key";

interface Item {
  id: string;
  date: string;
  recipient_id: number;
  recipient_name: string;
  amount: number;
  amount_usd: number;
  currency: string;
  donor_name: string;
  donor_email: string;
  program_id?: string;
  program_name?: string;
  payment_method: string;
  is_recurring: boolean;
  donor_company?: string;
}

//get all recent donations
export const loader: LoaderFunction = async ({ request }) => {
  const result = await validate_api_key(request.headers.get("x-api-key"));
  if (is_response(result)) return result;
  const page1 = await dondb.list_to_npo(result.npoId, { limit: 3 });
  const items = page1.items.map((i) => {
    const pm =
      i.paymentMethod || (i.chainId === "fiat" ? i.fiatRamp : i.chainName);
    const x: Item = {
      id: i.transactionId || "",
      date: i.transactionDate || "",
      recipient_id: i.endowmentId || 0,
      recipient_name: i.charityName || "",
      amount: i.amount || 0,
      amount_usd: i.usdValue || 0, //should be defined for finalized records
      currency: i.denomination || "",
      donor_name: i.fullName || "",
      donor_email: i.email || "",
      program_id: i.programId || "",
      program_name: i.programName || "",
      payment_method: pm || "",
      is_recurring: is_recurring(i.frequency, i.isRecurring),
      donor_company: i.company_name,
    };
    return x;
  });
  return new Response(JSON.stringify(items), { status: 200 });
};

export const action: ActionFunction = async ({ request }) => {
  const result = await validate_api_key(request.headers.get("x-api-key"));
  if (is_response(result)) return result;

  const data = await request.json();

  //subscribe
  if (request.method === "POST") {
    const id = await webhooksdb.save(data.hookUrl, result.npoId);
    return new Response(JSON.stringify({ id }), { status: 200 });
  }

  //unsubscribe
  if (request.method === "DELETE") {
    await webhooksdb.del(data.id, result.npoId);
    return new Response(null, { status: 200 });
  }

  return new Response(null, { status: 405 });
};
