import { Buffer } from "node:buffer";
import { ApiKeysDb } from "@/api-keys";
import { Resource } from "sst";
import { nvs, nvs_shared } from "../../env";

const encryption_key = Buffer.from(nvs_shared.app.api_encryption_key, "base64");
export const apikeysdb = new ApiKeysDb(
  Resource["tbl-api-keys"].name,
  nvs.app.env,
  encryption_key
);
