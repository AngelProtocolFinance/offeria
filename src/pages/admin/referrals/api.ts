import { bappdb } from "$/tables/banking-applications";
import { referralsdb } from "$/tables/commissions";
import { dondb } from "$/tables/donations-settled";
import { npodb } from "$/tables/endowments";
import type { IBapp } from "@/banking-applications";
import type { IDonationFinal } from "@/donation";
import type { IPageKeyed } from "@/types/api";
import type { LoaderFunctionArgs } from "react-router";
import { admin_ctx } from "#/.server/auth";
import { referred_by } from "#/.server/referrals";
import type { Referred } from "#/types/referrals";
import { config } from "./config";

export interface LoaderData {
  id: string;
  referreds: Referred[];
  earnings: IPageKeyed<IDonationFinal>;
  pending_total: number;
  payout?: IBapp;
  payout_ltd: number;
  payout_min?: number;
  base_url: string;
}

export const loader = async (x: LoaderFunctionArgs) => {
  const id = x.context.get(admin_ctx);

  const endow = await npodb.npo(id);
  if (!endow) throw `npo:${id} not found`;

  if (!endow.referral_id) throw `@dev: referral_id not found for npo:${id}`;

  const [pending_total, referreds, earnings, p, payout_ltd] = await Promise.all(
    [
      referralsdb.pending_earnings(endow.referral_id),
      referred_by(endow.referral_id),
      dondb.referred_by(endow.referral_id, { limit: 4 }),
      bappdb.npo_default_bapp(endow.id),
      referralsdb.payout_ltd(endow.referral_id),
    ]
  );

  return {
    id: endow.referral_id,
    base_url: new URL(x.request.url).origin,
    referreds,
    earnings,
    pending_total,
    payout: p,
    payout_min: config.pay_min,
    payout_ltd,
  } satisfies LoaderData;
};
