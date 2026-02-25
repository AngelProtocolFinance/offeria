import { PayoutsDB } from "@/payouts";
import { Resource } from "sst";
import { nvs } from "../../env";

export const podb = new PayoutsDB(Resource["tbl-payouts-v2"].name, nvs.app.env);
