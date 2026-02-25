import { Db } from "@/db";
import { Resource } from "sst";
import { nvs } from "../../env";

export const users_meta_db = new Db(
  Resource["tbl-users-meta"].name,
  nvs.app.env
);
