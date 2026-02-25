import { funddb } from "$/tables/funds";
import { fund_id } from "@/fundraiser/schema";
import { resp, search } from "@/helpers/https";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { parse } from "valibot";
import { cognito, to_auth } from "#/.server/auth";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { user, headers } = await cognito.retrieve(request);
  if (!user) return to_auth(request, headers);
  if (!user.groups.includes("ap-admin")) return resp.status(403);

  const { next } = search(request.url);
  const page = await funddb.funds({
    next,
  });
  return page;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { user, headers } = await cognito.retrieve(request);
  if (!user) return to_auth(request, headers);
  if (!user.groups.includes("ap-admin")) return resp.status(403);

  const fd = await request.formData();
  const id = parse(fund_id, fd.get("fund_id"));

  await funddb.fund_delete(id);
  return resp.json({ success: true });
};
