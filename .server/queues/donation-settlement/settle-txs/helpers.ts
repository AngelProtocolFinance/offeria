import type { IBalanceUpdate } from "@/balance";
import type { IDistFees, IFees } from "@/donations";

/** @returns [resulting balance, excess fa ] */
export const credit_fa = (
  amount: number,
  { fa, pf }: { fa: number; pf: number }
) => {
  return [fa ? amount + pf : amount, fa ? fa - pf : 0];
};

/** @returns resulting balance after debiting fees and the actual fee amount */
export const debit_pcfs = (
  amount: number,
  fees: IDistFees
): [number, IDistFees] => {
  const base = amount * fees.base;
  const fsa = amount * fees.fsa;
  return [amount - base - fsa, { base, fsa }];
};

export interface Increments {
  liq: number;
  lock: number;
  lock_units: number;
  cash: number;
  tip: number;
  fees: IFees;
}

export const bal_deltas_fn = (
  i: Increments,
  app: string
): Readonly<IBalanceUpdate> => {
  const total = i.liq + i.lock + i.cash;
  return {
    totalContributions: ["inc", total],
    contributionsCount: ["inc", 1],
    totalContributionsViaMarketplace: [
      "inc",
      app === "bg-marketplace" || app === "angel-protocol" ? total : 0,
    ],
    totalContributionsViaWidget: ["inc", app === "bg-widget" ? total : 0],
    totalBaseFees: ["inc", i.fees.base],
    totalFiscalSponsorFees: ["inc", i.fees.fsa],
    totalProcessingFees: ["inc", i.fees.processing],
    totalTips: ["inc", i.tip],
    //include here as these would be included in atomic transaction
    payoutsPending: ["inc", total],
    liq: ["inc", i.liq],
    lock_units: ["inc", i.lock_units],
    cash: ["inc", i.cash],
  };
};

export const pick = <T, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Pick<T, K> => Object.fromEntries(keys.map((k) => [k, obj[k]])) as Pick<T, K>;
