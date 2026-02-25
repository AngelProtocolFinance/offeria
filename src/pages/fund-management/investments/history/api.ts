import { navdb } from "$/tables/nav-history";
import * as v from "valibot";
import type { Route } from "./+types";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { searchParams: s } = new URL(request.url);

  const key = v.parse(
    v.nullable(v.pipe(v.string(), v.base64())),
    s.get("next")
  );

  const page = await navdb.list({
    limit: 6,
    next: key ?? undefined,
  });

  return page;
};
