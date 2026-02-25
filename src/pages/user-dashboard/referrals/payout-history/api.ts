import { referralsdb } from "$/tables/commissions";
import { search } from "@/helpers/https";
import { user_ctx } from "#/.server/auth";
import type { Route } from "./+types";

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const user = context.get(user_ctx);

  const { nextKey: next } = search(request);
  return referralsdb.payouts(user.referral_id, { next, limit: 8 });
};
