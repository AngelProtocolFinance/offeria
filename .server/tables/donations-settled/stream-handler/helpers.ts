import type { IDonationFinal } from "@/donation";
import type { Ensure } from "@/types/utils";

export const ensure = <T extends keyof IDonationFinal>(
  r: IDonationFinal,
  keys: T[]
) => {
  for (const k of keys) {
    const v = r[k];
    if (!v) throw ` missing ${k}`;
  }
  return r as Ensure<IDonationFinal, T>;
};
