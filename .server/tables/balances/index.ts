import { BalanceDb } from "@/balance";
import { Resource } from "sst";
import { nvs } from "../../env";

export const baldb = new BalanceDb(Resource["tbl-balances"].name, nvs.app.env);
