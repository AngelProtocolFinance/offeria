import { liqdb } from "$/tables/liquid";
import * as v from "valibot";
import type { Route } from "./+types";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { searchParams: s } = new URL(request.url);

  const key = v.parse(
    v.nullable(v.pipe(v.string(), v.base64())),
    s.get("next")
  );

  const page = await liqdb.intr_logs({
    limit: 6,
    next: key ?? undefined,
  });

  return page;
};
