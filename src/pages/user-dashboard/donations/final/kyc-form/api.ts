import { nvs } from "$/env";
import { ses } from "$/kit/ses";
import { dondb } from "$/tables/donations-settled";
import { is_recurring } from "@/donation/helpers";
import { to_pretty_utc } from "@/helpers/date";
import { send_email } from "@/helpers/email";
import { to_amount } from "@/helpers/email";
import { resp } from "@/helpers/https";
import {
  type IDonation,
  type IDonor,
  donation_receipt as dr,
} from "@better-giving/react-emails";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { redirect } from "react-router";
import { getValidatedFormData } from "remix-hook-form";
import { user_ctx } from "#/.server/auth";
import type { Route } from "./+types";
import { type FV, schema } from "./schema";

export const loader = async ({ params, context }: Route.LoaderArgs) => {
  const user = context.get(user_ctx);

  const don = await dondb.item(params.id);
  if (!don) return resp.status(404);

  //user can only access their own donation
  if (don.email?.toLowerCase() !== user.email.toLowerCase()) {
    return resp.status(403);
  }

  return user;
};

export const action = async ({
  request,
  params,
  context,
}: Route.ActionArgs) => {
  const user = context.get(user_ctx);

  const fv = await getValidatedFormData<FV>(request, valibotResolver(schema));
  if (fv.errors) return fv;

  const don = await dondb.item(params.id);
  if (!don) return resp.status(404);

  //user can only access their own donation
  if (don.email?.toLowerCase() !== user.email.toLowerCase()) {
    return resp.status(403);
  }

  const addr = [
    fv.data.address.street,
    fv.data.address.complement,
    fv.data.city,
    fv.data.state,
    fv.data.us_state,
    fv.data.country,
    fv.data.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  const donor: IDonor = {
    full_name: `${fv.data.name.first} ${fv.data.name.last}`,
    first_name: fv.data.name.first,
    address: addr,
  };

  if (!don.transactionDate) throw "missing transactionDate";
  if (!don.charityName) throw "missing charityName";
  if (!don.denomination) throw "missing denomination";
  if (!don.amount) throw "missing amount";
  if (don.usdValue == null) throw "missing usdValue";

  const tx: IDonation = {
    id: don.transactionId,
    date: to_pretty_utc(don.transactionDate),
    to_name: don.charityName,
    program_name: don.programName,
    amount: to_amount(don.amount, don.usdValue, don.denomination),
  };
  //but can send receipt to other email
  const data: dr.IData = {
    ...tx,
    from: donor,
    is_bg: don.endowmentId === nvs.app.npo_id,
    is_recurring: is_recurring(don.frequency, don.isRecurring),
    // !taxReceiptId -> means no mention of receipt
    // for chariot donation, we don't issue tax receipt
    tax_receipt_id: don.fiatRamp !== "CHARIOT" ? don.transactionId : undefined,
  };
  const { node, subject } = dr.template(data);

  const res = await send_email(ses, { node, subject, to: [don.email] });
  console.info(res);

  return redirect("..");
};
