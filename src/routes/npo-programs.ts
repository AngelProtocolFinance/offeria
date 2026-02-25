import { npodb } from "$/tables/endowments";
import { resp } from "@/helpers/https";
import { $int_gte1 } from "@/schemas";
import type { LoaderFunction } from "react-router";
import { parse } from "valibot";

export const headers = () => ({
  "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
});

export const loader: LoaderFunction = async ({ params }) => {
  const id = parse($int_gte1, params.id);
  const res = await npodb.npo_programs(id);
  return resp.json(res);
};
