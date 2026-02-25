import { navdb } from "$/tables/nav-history";
import { resp } from "@/helpers/https";
import { dividend_log_fv } from "@/nav/schemas";
import type { ActionFunction } from "react-router";
import { parse } from "valibot";
import { cognito, to_auth } from "#/.server/auth";
import { npo_dividend_comps } from "#/.server/npos-dividend-comps";

export const action: ActionFunction = async ({ request }) => {
  const { user, headers } = await cognito.retrieve(request);
  if (!user) return to_auth(request, headers);
  if (!user.groups.includes("ap-admin")) return { status: 403 };

  const fv = parse(dividend_log_fv, await request.json());

  const nav = await navdb.ltd();
  const comps = await npo_dividend_comps(+fv.total, nav);

  return resp.json(comps);
};
