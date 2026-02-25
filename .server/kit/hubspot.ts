import { Client } from "@hubspot/api-client";
import { nvs_shared } from "../env";

export const hubspot = new Client({
  accessToken: nvs_shared.hubspot.access_token,
});
