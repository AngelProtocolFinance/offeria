import { LiquidDb } from "@/liquid";
import { Resource } from "sst";
import { nvs } from "../../env";

export const liqdb = new LiquidDb(Resource["tbl-liquid"].name, nvs.app.env);
