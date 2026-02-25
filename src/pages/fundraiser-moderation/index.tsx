import { useSearchParams } from "react-router";
import { CacheRoute, createClientLoaderCache } from "remix-client-cache";
import { metas } from "#/helpers/seo";
import { use_paginator } from "#/hooks/use-paginator";
import type { Route } from "./+types/index";
import { Table } from "./table";

export { ErrorBoundary } from "#/components/error";
export { action, loader } from "./api";
export const clientLaoder = createClientLoaderCache<Route.ClientLoaderArgs>();
export const meta = () => metas({ title: "Fundraiser moderation" });

export default CacheRoute(Page);
function Page({ loaderData: page1 }: Route.ComponentProps) {
  const [params] = useSearchParams();

  const { node } = use_paginator({
    table: (x) => <Table {...x} />,
    page1,
    gen_loader: (load, next) => () => {
      const copy = new URLSearchParams(params);
      if (next) copy.set("next", next);
      load(`?${copy.toString()}`);
    },
  });

  return (
    <div className="grid content-start gap-y-4 lg:gap-y-8 lg:gap-x-3 relative xl:container xl:mx-auto px-5 py-20 lg:pt-10">
      <h1 className="text-3xl col-span-full max-lg:mb-4">Fundraisers</h1>
      <div className="grid col-span-full overflow-x-auto">{node}</div>
    </div>
  );
}
