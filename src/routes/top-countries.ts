import { metricsdb } from "$/tables/metrics";
import { resp } from "@/helpers/https";
import { getISOWeek } from "date-fns";
import type { LoaderFunction } from "react-router";

export const headers = () => ({
  "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
});

export const loader: LoaderFunction = async () => {
  const Items = await metricsdb.countries();

  const latest_weeknum = getISOWeek(Items[0].gsi1SK);
  const sorted = Items.toSorted((a, b) => {
    const a7d_v =
      getISOWeek(a.gsi1SK) < latest_weeknum ? 0 : a.totalDonations7d;
    const b7d_v =
      getISOWeek(b.gsi1SK) < latest_weeknum ? 0 : b.totalDonations7d;
    //if both didn't receive donation in the last 7days
    if (!a7d_v && !b7d_v) return b.totalDonations - a.totalDonations;
    return b7d_v - a7d_v;
  });

  return resp.json(sorted.slice(0, 10).map(({ name }) => name));
};
