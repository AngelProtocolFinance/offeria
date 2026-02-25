import { nvs } from "$/env";
import { resp } from "@/helpers/https";
import type { LoaderFunction } from "react-router";

export const loader: LoaderFunction = async ({ request, params }) => {
  const from = new URL(request.url);
  const to = new URL(nvs.nowpayments.api_url);
  to.pathname = params["*"]!;
  to.search = from.searchParams.toString();

  const res = await fetch(to, {
    headers: { "x-api-key": nvs.nowpayments.api_key },
  });
  const json = await res.json();
  return resp.json(json, res.status);
};
