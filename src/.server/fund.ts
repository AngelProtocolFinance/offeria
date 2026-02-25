import { npodb } from "$/tables/endowments";
import { funddb } from "$/tables/funds";
import type { IFund } from "#/types/fund";

/** @param id - slug or uuid */
export const get_fund = async (id: string): Promise<IFund | undefined> => {
  const fund = await funddb.fund(id);
  if (!fund) return;

  if (fund.members.length === 0) {
    return { ...fund, members: [] };
  }

  const npos = await npodb.npos_get(fund.members, [
    "id",
    "name",
    "card_img",
    "image",
    "logo",
  ]);

  return {
    ...fund,
    members: npos.map((m) => ({
      id: m.id,
      name: m.name,
      logo: m.logo || m.card_img,
      banner: m.image,
    })),
  };
};
