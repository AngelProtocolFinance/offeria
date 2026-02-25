import { wise } from "$/kit/wise";
import { referralsdb } from "$/tables/commissions";
import { dondb } from "$/tables/donations-settled";
import type { IDonationFinal } from "@/donation";
import type { IPageKeyed } from "@/types/api";
import type { V2RecipientAccount } from "@/wise";
import type { LoaderFunctionArgs } from "react-router";
import { user_ctx } from "#/.server/auth";
import { referred_by } from "#/.server/referrals";
import type { UserV2 } from "#/types/auth";
import type { Referred } from "#/types/referrals";

export interface LoaderData {
  user: UserV2;
  referreds: Referred[];
  earnings: IPageKeyed<IDonationFinal>;
  pending_total: number;
  payout?: V2RecipientAccount;
  payout_ltd: number;
  payout_min?: number;
  base_url: string;
  w_form?: string;
}

function payout(id: number) {
  return wise.v2_account(id);
}

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const user = context.get(user_ctx);

  const [pending_total, referreds, earnings, p, payout_ltd] = await Promise.all(
    [
      referralsdb.pending_earnings(user.referral_id),
      referred_by(user.referral_id),
      dondb.referred_by(user.referral_id, { limit: 4 }),
      user.pay_id ? payout(+user.pay_id) : undefined,
      referralsdb.payout_ltd(user.referral_id),
    ]
  );

  return {
    user,
    base_url: new URL(request.url).origin,
    referreds,
    earnings,
    pending_total,
    payout: p,
    payout_min: user.pay_min ? +user.pay_min : undefined,
    payout_ltd,
    w_form: user.w_form,
  } satisfies LoaderData;
};
