import { userdb } from "$/tables/users";
import { Txs as Txis, dbc } from "@/db";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { ActionFunction } from "react-router";
import { parse } from "valibot";
import { user_ctx } from "#/.server/auth";
import { user_npos } from "#/.server/user";
import type { ActionData } from "#/types/action";
import type { UserV2 } from "#/types/auth";
import type { IUserNpo2 } from "#/types/user";
import type { Route } from "./+types";
import { alert_prefs } from "./schema";

export interface SettingsData {
  user: UserV2;
  user_npos: IUserNpo2[];
}

export const loader = async ({ context }: Route.LoaderArgs) => {
  const user = context.get(user_ctx);

  return {
    user,
    user_npos: await user_npos(user.email),
  } satisfies SettingsData;
};

export const action: ActionFunction = async ({ request, context }) => {
  const user = context.get(user_ctx);

  const prefs = parse(alert_prefs, await request.json());
  const txis = new Txis();
  for (const { npo, ...p } of prefs) {
    txis.update(userdb.userxnpo_update_txi(npo, user.email, { alertPref: p }));
  }

  const cmd = new TransactWriteCommand({
    TransactItems: txis.all,
  });
  await dbc.send(cmd);
  return { __ok: "Settings updated" } satisfies ActionData;
};
