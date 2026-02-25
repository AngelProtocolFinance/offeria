import { npodb } from "$/tables/endowments";
import { reg_number } from "@/endowment/schema";
import { resp } from "@/helpers/https";
import type { LoaderFunction } from "react-router";
import * as v from "valibot";

export const loader: LoaderFunction = async ({ params }) => {
  const id = v.parse(reg_number, params.id);
  const res = await npodb.npo_with_regnum(id);
  if (!res) return resp.status(404);
  return resp.json(res);
};
