import { Table } from "@/table/db";
import { Resource } from "sst";
import { nvs } from "../../env";

export const table = new Table(Resource["tbl-main"].name, nvs.app.env);
