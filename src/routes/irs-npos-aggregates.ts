import { nonprofits } from "$/kit/mongodb";
import { resp } from "@/helpers/https";
import { cognito, to_auth } from "#/.server/auth";
import type { Route } from "./+types/irs-npos-aggregates";

export const loader = async ({
  params: { type },
  request,
}: Route.LoaderArgs) => {
  const { user } = await cognito.retrieve(request);
  if (!user) return to_auth(request);
  if (!user.groups.includes("ap-admin")) throw resp.status(403);

  const states = await nonprofits
    .distinct(type)
    .then((s) => s.filter((x) => x != null));
  return new Response(JSON.stringify(states));
};
