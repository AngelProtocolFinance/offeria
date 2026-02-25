import { get_npos } from "#/.server/npos";
import type { Route } from "./+types/home";

// both this loader and root-loader serve at /, but they're independent:
// this loader only fetches npos — no cookies involved.
// root-loader handles referrer/session cookies separately and is already cdn-friendly.
export const headers: Route.HeadersFunction = () => ({
  "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
});

export const loader = async ({ request }: Route.LoaderArgs) => {
  const source = new URL(request.url);
  return get_npos({
    query: source.searchParams.get("query") ?? "",
    claimed: [true],
    published: [true],
    page: 1,
  });
};
