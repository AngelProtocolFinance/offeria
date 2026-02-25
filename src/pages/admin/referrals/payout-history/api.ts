import { referralsdb } from "$/tables/commissions";
import { npodb } from "$/tables/endowments";
import { resp, search } from "@/helpers/https";
import { admin_ctx } from "#/.server/auth";
import type { Route } from "./+types";

export const loader = async (args: Route.LoaderArgs) => {
  const id = args.context.get(admin_ctx);

  const x = await npodb.npo(id, ["referral_id"]);
  if (!x) return resp.status(404);

  if (!x.referral_id) throw `@dev: referral_id not found for npo:${id}`;

  const { nextKey: next } = search(args.request);
  return referralsdb.payouts(x.referral_id, { next, limit: 8 });
};
