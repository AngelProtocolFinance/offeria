import { WebhooksDb } from "@/webhooks";
import { Resource } from "sst";
import { nvs } from "../../env";

export const webhooksdb = new WebhooksDb(
  Resource["tbl-webhooks"].name,
  nvs.app.env
);
