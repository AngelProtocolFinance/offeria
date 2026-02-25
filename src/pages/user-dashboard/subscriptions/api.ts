import { subsdb } from "$/tables/subscriptions";
import type { ISub } from "@/subscriptions";
import { user_ctx } from "#/.server/auth";
import type { Route } from "./+types";

export interface LoaderData {
  subs: ISub[];
}

export const loader = async ({ context }: Route.LoaderArgs) => {
  const user = context.get(user_ctx);
  const subs = await subsdb.user_subs(user.email, "active");
  return { subs } satisfies LoaderData;
};
