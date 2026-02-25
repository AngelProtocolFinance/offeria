import { dondb } from "$/tables/donations-settled";
import { npodb } from "$/tables/endowments";
import type { IDonationFinal } from "@/donation";
import { resp, search } from "@/helpers/https";
import type { IPageKeyed } from "@/types/api";
import { admin_ctx } from "#/.server/auth";
import type { Route } from "./+types";

export interface LoaderData extends IPageKeyed<IDonationFinal> {}

export const loader = async (args: Route.LoaderArgs) => {
  const { nextKey } = search(args.request);
  const id = args.context.get(admin_ctx);

  const x = await npodb.npo(id, ["referral_id"]);
  if (!x) return resp.status(404);

  if (!x.referral_id) throw `@dev: referral_id not found for npo:${id}`;
  return dondb.referred_by(x.referral_id, { limit: 4, next: nextKey });
};
