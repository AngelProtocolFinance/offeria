import { bappdb } from "$/tables/banking-applications";
import type { IBapp } from "@/banking-applications";
import { admin_ctx } from "#/.server/auth";
import type { Route } from "./+types";

export interface LoaderData {
  methods: IBapp[];
}

export const loader = async (x: Route.LoaderArgs) => {
  const id = x.context.get(admin_ctx);

  const page = await bappdb.npo_bapps(id);
  return { methods: page.items } satisfies LoaderData;
};
