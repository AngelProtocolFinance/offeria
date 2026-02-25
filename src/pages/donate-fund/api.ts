import { fund_id } from "@/fundraiser/schema";
import { parse, union } from "valibot";
import { cognito } from "#/.server/auth";
import { get_fund } from "#/.server/fund";
import { segment } from "#/api/schema/segment";
import type { UserV2 } from "#/types/auth";
import type { IFund } from "#/types/fund";
import type { Route } from "./+types";

export interface LoaderData {
  user: UserV2 | undefined;
  fund: IFund;
  base_url: string;
}

const schema = union([fund_id, segment]);

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const { user } = await cognito.retrieve(request);
  const id = parse(schema, params.fundId);
  const fund = await get_fund(id);
  if (!fund) throw new Response(null, { status: 404 });

  return {
    user,
    fund,
    base_url: new URL(request.url).origin,
  } satisfies LoaderData;
};
