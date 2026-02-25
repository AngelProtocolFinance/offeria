import { nvs } from "$/env";
import { paypal } from "$/kit/paypal";
import type { IAmount } from "@/donations";
import { rd } from "@/helpers/decimal";
import { addMinutes } from "date-fns";

export interface IInput extends IAmount {
  order_id: string;
  currency: string;
  freq: "monthly" | "weekly" | "annual";
}

const plans = {
  monthly: nvs.paypal.plans_monthly,
  weekly: nvs.paypal.plans_weekly,
  annual: nvs.paypal.plans_annual,
} as const;

export const create_subs = async (i: IInput): Promise<string> => {
  const total = i.base + i.tip + i.fee_allowance;
  const plan_id = plans[i.freq][i.currency];

  const { id = "invalid subs id" } = await paypal.create_subscription({
    custom_id: i.order_id,
    plan_id: plan_id,
    quantity: rd(total, 0),
    auto_renewal: true,
    start_time: addMinutes(new Date(), 5).toISOString(),
  });

  return id;
};
