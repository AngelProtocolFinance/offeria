import { npodb } from "$/tables/endowments";
import { npo_search } from "@/endowment/schema";
import { resp, search } from "@/helpers/https";
import { $int_gte1, segment } from "@/schemas";
import type { LoaderFunction } from "react-router";
import * as v from "valibot";

export const headers = () => ({
  "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
});

export const loader: LoaderFunction = async ({ params, request }) => {
  const id = v.parse(v.union([$int_gte1, segment]), params.id);
  const { fields } = v.parse(npo_search, search(request));
  const npo = await npodb.npo(id, fields);
  if (!npo) return resp.status(404);
  return resp.json(npo);
};
