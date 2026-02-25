import { BalanceTxsDb } from "@/balance-txs";
import { Resource } from "sst";
import { nvs } from "../../env";

export const btxdb = new BalanceTxsDb(
  Resource["tbl-bal-txs"].name,
  nvs.app.env
);
