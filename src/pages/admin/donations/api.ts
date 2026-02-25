import { dondb } from "$/tables/donations-settled";
import { donations_search } from "@/donation/schema";
import { search } from "@/helpers/https";
import { parse } from "valibot";
import { admin_ctx } from "#/.server/auth";
import { endowUpdate } from "../endow-update-action";
import type { Route } from "./+types";

export const loader = async (x: Route.LoaderArgs) => {
  const id = x.context.get(admin_ctx);

  const { limit = 10, ...q } = parse(donations_search, search(x.request));
  const page = await dondb.list_to_npo(id, { ...q, limit });

  return page;
};

export const action = endowUpdate({ redirect: "." });
