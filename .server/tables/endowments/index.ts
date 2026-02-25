import { NpoDb } from "@/endowment";
import { Resource } from "sst";
import { nvs } from "../../env";

export const npodb = new NpoDb(Resource["tbl-endowments"].name, nvs.app.env);
