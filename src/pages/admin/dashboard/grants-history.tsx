import { podb } from "$/tables/payouts-v2";
import { search } from "@/helpers/https";
import { ChevronLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { CacheRoute, createClientLoaderCache } from "remix-client-cache";
import { admin_ctx } from "#/.server/auth";
import { Info } from "#/components/status";
import { use_paginator } from "#/hooks/use-paginator";
import type { Route } from "./+types/grants-history";
import { GrantsTable } from "./common/grants-table";

export const loader = async (x: Route.LoaderArgs) => {
  const { next } = search(x.request);
  const id = x.context.get(admin_ctx);

  return podb.npo_settlements(id.toString(), {
    next,
    limit: 5,
  });
};
export const clientLoader = createClientLoaderCache<Route.ClientLoaderArgs>();

export default CacheRoute(Page);
function Page({ loaderData: page1 }: Route.ComponentProps) {
  const [search] = useSearchParams();
  const { node } = use_paginator({
    page1,
    table: (x) => <GrantsTable {...x} />,
    empty: () => <Info>No payouts found</Info>,
    gen_loader: (load, next) => () => {
      const p = new URLSearchParams(search);
      if (next) p.set("next", next);
      load(`?${p.toString()}`);
    },
  });

  return (
    <div className="grid content-start px-6 py-4 md:px-10 md:py-8">
      <Link
        to=".."
        className="flex items-center gap-1 text-blue-d1 hover:text-blue text-sm -ml-1 mb-3"
      >
        <ChevronLeft size={18} />
        <span>Back</span>
      </Link>
      {node}
    </div>
  );
}
