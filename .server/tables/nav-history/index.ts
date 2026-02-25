import { NavHistoryDB } from "@/nav";
import { Resource } from "sst";
import { nvs } from "../../env";

export const navdb = new NavHistoryDB(
  Resource["tbl-nav-history"].name,
  nvs.app.env
);
