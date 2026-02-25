import { wise } from "$/kit/wise";
import { bappdb } from "$/tables/banking-applications";
import { resp } from "@/helpers/https";
import { $int_gte1 } from "@/schemas";
import { redirect } from "react-router";
import * as v from "valibot";
import { admin_ctx } from "#/.server/auth";
import type { ActionData } from "#/types/action";
import type { Route } from "./+types/payout-method";

export const loader = async (args: Route.LoaderArgs) => {
  const bankId = v.parse($int_gte1, args.params.bankId);
  const id = args.context.get(admin_ctx);

  const x = await bappdb.npo_bapp(bankId.toString(), id);
  if (!x) return resp.status(404);

  const y = await wise.v2_account(bankId);
  return { ...y, ba: x };
};

export const delete_action = async (x: Route.ActionArgs) => {
  const bank_id = v.parse($int_gte1, x.params.bankId);

  await bappdb.bapp_delete(bank_id.toString());
  return redirect("../..");
};

export const prioritize_action = async (args: Route.ActionArgs) => {
  const bank_id = v.parse($int_gte1, args.params.bankId);

  const x = await bappdb.bapp(bank_id.toString());
  if (!x) return { status: 404, statusText: `Bank:${bank_id} not found` };

  await bappdb.bapp_update(x, { type: "prioritize" });
  return { __ok: "Payout method prioritized" } satisfies ActionData;
};
