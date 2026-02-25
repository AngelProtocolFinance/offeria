import { don2db } from "$/tables/donations";
import { page_opts } from "@/donation/schema";
import { search } from "@/helpers/https";
import { parse } from "valibot";
import { user_ctx } from "#/.server/auth";
import type { Route } from "./+types";
import { to_row } from "./helpers";

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const user = context.get(user_ctx);
  const raw = search(request);
  const { next, limit = 10 } = parse(page_opts, raw);
  const { items, next: n } = await don2db.dons_from(user.email, {
    next,
    limit,
  });
  return { next: n, user, items: items.map(to_row) };
};
