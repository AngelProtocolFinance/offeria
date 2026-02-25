import { regdb } from "$/tables/registrations";
import { search } from "@/helpers/https";
import { regs_search } from "@/reg/schema";
import { data } from "react-router";
import { safeParse } from "valibot";
import { cognito, to_auth } from "#/.server/auth";
import type { Route } from "./+types";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { user, headers } = await cognito.retrieve(request);
  if (!user) return to_auth(request, headers);

  const p = safeParse(regs_search, search(request));

  if (p.issues) {
    return new Response(p.issues[0].message, { status: 400 });
  }
  const page = await regdb.regs(p.output);

  return data(page);
};
