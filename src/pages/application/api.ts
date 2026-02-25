import { wise } from "$/kit/wise";
import { regdb } from "$/tables/registrations";
import type { IReg } from "@/reg";
import { reg_id } from "@/reg/schema";
import type { V2RecipientAccount } from "@/wise";
import { parse } from "valibot";
import { cognito, to_auth } from "#/.server/auth";
import type { UserV2 } from "#/types/auth";
import type { Route } from "./+types";

export interface LoaderData {
  user: UserV2;
  reg: IReg;
  wacc: V2RecipientAccount;
}

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const { user, headers } = await cognito.retrieve(request);
  if (!user) return to_auth(request, headers);

  const id = parse(reg_id, params.id);

  const reg = await regdb.reg(id);
  if (!reg) throw new Response("Registration not found", { status: 404 });

  if (!reg.o_bank_id) throw "No bank account associated with application";

  const wacc = await wise.v2_account(+reg.o_bank_id);

  return {
    reg,
    user,
    wacc,
  } satisfies LoaderData;
};
