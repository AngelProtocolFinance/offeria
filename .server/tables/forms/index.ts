import { FormsDb } from "@/forms";
import { Resource } from "sst";
import { nvs } from "../../env";

export const formsdb = new FormsDb(Resource["tbl-forms"].name, nvs.app.env);
