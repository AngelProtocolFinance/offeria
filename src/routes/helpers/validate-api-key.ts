import { apikeysdb } from "$/tables/api-keys";
import type { IApiKeyPayload } from "@/api-keys";
import { resp } from "@/helpers/https";

/**@param api_key - from header */
export async function validate_api_key(
  api_key: string | null
): Promise<IApiKeyPayload | Response> {
  //no api key in header
  if (!api_key) return resp.status(400);
  const payload = apikeysdb.decode(api_key);

  //npoId indeed has api key saved/active
  const retrieved = await apikeysdb.get(payload.npoId);
  if (!retrieved) return resp.status(404);

  // api key used in this request is the same as the one saved/active
  if (retrieved !== api_key) return resp.status(401);
  return payload;
}

export const is_response = (x: any): x is Response => x instanceof Response;
