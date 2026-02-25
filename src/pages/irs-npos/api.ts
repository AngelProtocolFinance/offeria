import { nonprofits } from "$/kit/mongodb";
import type { NonprofitItem } from "@/types/mongodb";
import { cognito, to_auth } from "#/.server/auth";
import { npos_search } from "#/helpers/npos-search";
import type { Route } from "./+types";

export interface LoaderData {
  items: NonprofitItem[];
  page: number;
  size: number;
  num_items: number;
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { user } = await cognito.retrieve(request);
  if (!user) return to_auth(request);
  if (!user.groups.includes("ap-admin")) {
    throw new Response(null, { status: 403 });
  }

  const { filter, page, limit, sort } = npos_search(request);
  const skip = (page - 1) * limit;
  const [sort_key, sort_dir] = sort.split("+");

  const items = await nonprofits
    .find(filter)
    .sort(sort ? { [sort_key]: sort_dir === "asc" ? 1 : -1 } : {})
    .skip(skip)
    .limit(+limit)
    .toArray();
  const count = await nonprofits.countDocuments(filter);

  return {
    items,
    page,
    size: limit,
    num_items: count,
  } satisfies LoaderData;
};
