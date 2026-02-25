import { apikeysdb } from "$/tables/api-keys";
import { $int_gte1 } from "@/schemas";
import { parse } from "valibot";
import type { Route } from "./+types";

export const action = async ({ params }: Route.ActionArgs) => {
  const id = parse($int_gte1, params.id);
  const apiKey = await apikeysdb.put(id);
  return { apiKey };
};

export interface LoaderData {
  apiKey: string | undefined;
}

export const loader = async ({ params }: Route.LoaderArgs) => {
  const id = parse($int_gte1, params.id);
  const apiKey = await apikeysdb.get(id);
  return { apiKey };
};
