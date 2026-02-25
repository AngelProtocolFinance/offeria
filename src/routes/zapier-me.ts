import type { LoaderFunctionArgs } from "react-router";
import { is_response, validate_api_key } from "./helpers/validate-api-key";

export async function loader({ request }: LoaderFunctionArgs) {
  const result = await validate_api_key(request.headers.get("x-api-key"));
  if (is_response(result)) return result;
  //data for connection label
  return new Response(JSON.stringify(result), { status: 200 });
}
