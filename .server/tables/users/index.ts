import { UserDb } from "@/user";
import { Resource } from "sst";
import { nvs } from "../../env";

export const userdb = new UserDb(Resource["tbl-users"].name, nvs.app.env);
