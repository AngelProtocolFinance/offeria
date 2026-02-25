import { SubsDb } from "@/subscriptions";
import { Resource } from "sst";
import { nvs } from "../../env";

export const subsdb = new SubsDb(Resource["tbl-subs"].name, nvs.app.env);
