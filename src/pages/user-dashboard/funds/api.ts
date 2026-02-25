import { funddb } from "$/tables/funds";
import { userdb } from "$/tables/users";
import type { IFund } from "@/fundraiser";
import { user_ctx } from "#/.server/auth";
import type { Route } from "./+types/funds";

export interface LoaderData {
  funds: IFund[];
}

export const user_funds = async ({ context }: Route.LoaderArgs) => {
  const user = context.get(user_ctx);

  const user_funds = await userdb.user_funds(user.email);
  const funds = await funddb.funds_get(user_funds);

  return { funds } satisfies LoaderData;
};
