import { FundDb } from "@/fundraiser";
import { Resource } from "sst";
import { nvs } from "../../env";

export const funddb = new FundDb(Resource["tbl-funds"].name, nvs.app.env);
