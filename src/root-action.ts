import { nvs_shared } from "$/env";
import { hubspot } from "$/kit/hubspot";
import { valibotResolver } from "@hookform/resolvers/valibot";
import type { ActionFunction } from "react-router";
import { getValidatedFormData } from "remix-hook-form";
import { type IEmailSubs, email_subs } from "#/types/hubspot-subscription";

export const action: ActionFunction = async ({ request }) => {
  const r = request.clone();
  const form = await r.formData();
  const intent = form.get("intent");

  if (intent === "subscribe") {
    const fv = await getValidatedFormData<IEmailSubs>(
      form,
      valibotResolver(email_subs)
    );
    if (fv.errors) return fv;

    const res = await hubspot.apiRequest({
      method: "POST",
      path: `/submissions/v3/integration/submit/${nvs_shared.hubspot.portal_id}/${nvs_shared.hubspot.subs_form_id}`,
      body: { fields: [{ name: "email", value: fv.data.email }] },
    });
    if (!res.ok) return "error";
    return "success";
  }

  return new Response("Invalid intent", { status: 400 });
};
