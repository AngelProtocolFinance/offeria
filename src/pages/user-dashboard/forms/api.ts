import { formsdb } from "$/tables/forms";
import { resp } from "@/helpers/https";
import { user_ctx } from "#/.server/auth";
import type { Route } from "./+types";

export const loader = async ({ context }: Route.LoaderArgs) => {
  const user = context.get(user_ctx);

  const forms = await formsdb.forms_owned_by(user.email);
  return forms;
};

export const action = async ({ request, context }: Route.ActionArgs) => {
  const user = context.get(user_ctx);

  const fd = await request.formData();
  const form_id = fd.get("form_id");
  if (typeof form_id !== "string") return resp.status(400, "form_id required");

  const form = await formsdb.form_get(form_id);
  if (!form) return resp.status(404, "form not found");
  if (form.owner !== user.email) return resp.status(403, "not authorized");

  await formsdb.form_update(form_id, { status: "inactive" });
  return { ok: true };
};
