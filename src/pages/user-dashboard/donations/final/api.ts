import { dondb } from "$/tables/donations-settled";
import { page_opts } from "@/donation/schema";
import { search } from "@/helpers/https";
import { parse } from "valibot";
import { user_ctx } from "#/.server/auth";
import type { Route } from "./+types";
import { to_row } from "./helpers";

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const user = context.get(user_ctx);
  const raw = search(request);
  const { limit = 10, next: n } = parse(page_opts, raw);
  const { items, next } = await dondb.list_by_email(user.email, {
    limit,
    next: n,
  });

  return { next, user, items: items.map(to_row) };
};
