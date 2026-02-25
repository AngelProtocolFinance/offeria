import { navdb } from "$/tables/nav-history";
import type { ILog, IPage } from "@/nav";
import type { Route } from "./+types";

export interface LoaderData {
  ltd: ILog;
  logs: ILog[];
  recent_logs: IPage<ILog>;
}

export const loader = async (_: Route.LoaderArgs) => {
  const [ltd, logs, recent_logs] = await Promise.all([
    navdb.ltd(),
    navdb.week_series(),
    navdb.list({
      limit: 3,
    }),
  ]);

  return {
    ltd,
    logs: logs.items,
    recent_logs,
  } satisfies LoaderData;
};
