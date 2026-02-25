import type { ITributeNotif } from "@/donation";
import type { ITribute } from "@/donations";
import type { TFrequency } from "@/schemas";

export function min_fee_allowance(
  amount: number,
  rate: number,
  flat = 0
): number {
  /**
   * fee(1) = amount * rate + flat
   * fee(2) = (amount + fee(1)) * rate + flat
   * fee(3) = (amount + fee(2)) * rate + flat
   * i.e. F₍ₙ₎ = a · ∑ᵏ⁼¹ⁿ (rᵏ) + f · ∑ᵏ⁼⁰ⁿ⁻¹ (rᵏ)
   * which converges to this formula: n approaches infinity
   */
  return (amount * rate + flat) / (1 - rate);
}
export const tribute_to_holding = (
  honoree?: string,
  notif?: ITributeNotif
): ITribute | undefined => {
  if (!honoree) return undefined;

  const tribute: ITribute = {
    full_name: honoree,
  };

  if (notif) {
    tribute.notif = {
      to_fullname: notif.toFullName,
      to_email: notif.toEmail,
      from_msg: notif.fromMsg,
    };
  }
  return tribute;
};

export const tribute_to_final = (
  t: ITribute
): { inHonorOf?: string; tributeNotif?: ITributeNotif } => {
  const result: { inHonorOf?: string; tributeNotif?: ITributeNotif } = {
    inHonorOf: t.full_name,
  };

  if (t.notif) {
    result.tributeNotif = {
      toEmail: t.notif.to_email,
      toFullName: t.notif.to_fullname,
      fromMsg: t.notif.from_msg,
    };
  }

  return result;
};

export const freq_fv_default = (
  freqs: TFrequency[] | undefined
): TFrequency => {
  if (!freqs || freqs.length === 0) return "one-time";
  return freqs[0];
};

const freqs_all: TFrequency[] = ["one-time", "weekly", "monthly", "annual"];

export const to_freqs = (freq_bools: boolean[]): TFrequency[] => {
  return freqs_all.filter((_, i) => freq_bools[i]);
};

export const to_freq_bools = (
  freqs_in: TFrequency[] | undefined
): boolean[] => {
  return freqs_in
    ? freqs_all.map((f) => freqs_in.includes(f))
    : [true, false, true, false];
};
