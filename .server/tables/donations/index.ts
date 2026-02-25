import { Don2Db } from "@/donations";
import { Resource } from "sst";
import { nvs } from "../../env";

export const don2db = new Don2Db(Resource["tbl-dons"].name, nvs.app.env);
