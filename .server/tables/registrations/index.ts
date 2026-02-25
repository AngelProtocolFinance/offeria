import { RegDb } from "@/reg";
import { Resource } from "sst";
import { nvs } from "../../env";

export const regdb = new RegDb(Resource["tbl-registrations"].name, nvs.app.env);
