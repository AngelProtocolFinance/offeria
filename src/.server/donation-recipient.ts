import { npodb } from "$/tables/endowments";
import { funddb } from "$/tables/funds";
import type { IAllocation } from "@/donation/schema";
import type { ITo } from "@/donations";

export interface Recipient {
  npo: {
    /** 0 when recipient is fund */
    id: number;
  };
  fund: {
    /** empty when recipient is npo */
    id: string;
    members: number[];
  };
  name: string;
  claimed: boolean;
  hide_bg_tip: boolean;
  fiscal_sponsored: boolean;
  receiptMsg: string;
  allocation: IAllocation;
}

/**
 * @param id - endow id or fund uuid
 * @param dynamo - dynamodb client that has access to the tables
 */
export async function to_fn(id: string | number): Promise<ITo | undefined> {
  //recipient is endowment
  if (typeof id === "number") {
    const npo = await npodb.npo(id);
    if (!npo) return undefined;
    const recipient: ITo = {
      to_id: id.toString(),
      to_type: "npo",
      to_name: npo.name,
      to_tip_allowed: !(npo.hide_bg_tip ?? false),
      to_members: [],
    };

    return recipient;
  }

  return funddb.fund(id).then((data) => {
    if (!data) return undefined;
    const recipient: ITo = {
      to_id: data.id,
      to_type: "fund",
      to_name: data.name,
      to_tip_allowed: !data.settings.hide_bg_tip,
      to_members: data.members.map((n) => n.toString()),
    };
    return recipient;
  });
}
