import { referralsdb } from "$/tables/commissions";
import { npodb } from "$/tables/endowments";
import type { Referred } from "#/types/referrals";

export const referred_by = async (id: string): Promise<Referred[]> => {
  const ltds = await referralsdb.get_ltd(id);
  const npos = await npodb.npo_referred_by(id);
  return npos.map((i) => ({
    id: i.id,
    name: i.name,
    up_until: i.referrer_expiry,
    ltd: Number(ltds?.[`#${i.id}`]) || 0,
  }));
};
