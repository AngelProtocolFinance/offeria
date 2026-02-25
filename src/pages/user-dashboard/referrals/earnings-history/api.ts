import { dondb } from "$/tables/donations-settled";
import type { IDonationFinal } from "@/donation";
import { search } from "@/helpers/https";
import type { IPageKeyed } from "@/types/api";
import { user_ctx } from "#/.server/auth";
import type { Route } from "./+types";

export interface LoaderData extends IPageKeyed<IDonationFinal> {}
export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const user = context.get(user_ctx);
  const { next } = search(request);

  const page = await dondb.referred_by(user.referral_id, {
    next: next,
    limit: 8,
  });
  return page satisfies LoaderData;
};
