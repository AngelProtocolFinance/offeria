import { npodb } from "$/tables/endowments";
import { formsdb } from "$/tables/forms";
import type { IForm } from "@/forms";
import { resp } from "@/helpers/https";
import type { Route } from "./+types";

export const headers: Route.HeadersFunction = () => ({
  "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
});

export interface IRecipient {
  name: string;
  hide_bg_tip?: boolean;
  donor_address_required?: boolean;
}

export interface ILoader extends IForm {
  recipient_details: IRecipient;
  base_url: string;
}

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const form = await formsdb.form_get(params.id);
  if (!form) throw resp.err(404, "form not found");

  const x = await npodb.npo(+form.recipient, [
    "name",
    "hide_bg_tip",
    "donor_address_required",
  ]);
  if (!x) throw resp.err(404, "recipient not found");

  return {
    ...form,
    recipient_details: x,
    base_url: new URL(request.url).origin,
  } satisfies ILoader;
};
