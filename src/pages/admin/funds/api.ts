import { npodb } from "$/tables/endowments";
import { funddb } from "$/tables/funds";
import { UpdateBuilder, dbc } from "@/db";
import type { INpo } from "@/endowment";
import type { IFundItem } from "@/fundraiser";
import { fund_id } from "@/fundraiser/schema";
import { resp } from "@/helpers/https";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { parse } from "valibot";
import { admin_ctx, user_ctx } from "#/.server/auth";
import { get_funds_npo_memberof } from "#/.server/funds";
import type { ActionData } from "#/types/action";
import type { UserV2 } from "#/types/auth";
import type { Route } from "./+types";

export interface LoaderData {
  user: UserV2;
  funds: IFundItem[];
  endow: INpo;
}

export const loader = async (x: Route.LoaderArgs) => {
  const id = x.context.get(admin_ctx);
  const user = x.context.get(user_ctx);

  const endow = await npodb.npo(id);
  if (!endow) return resp.status(404);

  const funds = await get_funds_npo_memberof(endow.id, {
    npo_profile_featured: false,
  });
  return { endow, funds, user } satisfies LoaderData;
};

export const action = async (x: Route.ActionArgs) => {
  const id = x.context.get(admin_ctx);

  const fv = await x.request.formData();
  const fid = parse(fund_id, fv.get("fund_id"));

  const fund = await funddb.fund(fid);
  if (!fund) return { status: 404 };
  const idx_in_members = fund.members.indexOf(id);
  if (idx_in_members === -1) {
    return { status: 400, statusText: `${id} not member of this fund` };
  }

  const upd8 = new UpdateBuilder();
  upd8.remove(`members[${idx_in_members}]`);
  const is_last_member = fund.members.length === 1;
  if (is_last_member) {
    upd8.set("active", false);
  }

  const cmd = new UpdateCommand({
    TableName: funddb.table,
    Key: funddb.key_fund(fund.id),
    ...upd8.collect(),
  });

  await dbc.send(cmd);

  return {
    __ok: "You have successfully opted out of this fund. Changes will take effect shortly.",
  } satisfies ActionData;
};
