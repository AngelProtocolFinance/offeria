import { liqdb } from "$/tables/liquid";
import type { IBalLog, IInterestLog } from "@/liquid";
import type { Route } from "./+types";

export interface LoaderData {
  logs_bal: IBalLog[];
  logs_intr: IInterestLog[];
}

export const loader = async (_: Route.LoaderArgs) => {
  const [bal_logs, int_logs] = await Promise.all([
    liqdb.bal_logs({ limit: 3 }),
    liqdb.intr_logs({ limit: 3 }),
  ]);

  return {
    logs_bal: bal_logs.items,
    logs_intr: int_logs.items,
  } satisfies LoaderData;
};
