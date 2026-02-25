import { formsdb } from "$/tables/forms";
import { resp } from "@/helpers/https";
import { admin_ctx } from "#/.server/auth";
import type { Route } from "./+types";

export const loader = async (x: Route.LoaderArgs) => {
  const id = x.context.get(admin_ctx);
  const forms = await formsdb.forms_owned_by(id.toString());
  return forms;
};

export const action = async (x: Route.ActionArgs) => {
  const id = x.context.get(admin_ctx);

  const fd = await x.request.formData();
  const form_id = fd.get("form_id");
  if (typeof form_id !== "string") return resp.status(400, "form_id required");

  const form = await formsdb.form_get(form_id);
  if (!form) return resp.status(404, "form not found");
  if (form.owner !== id.toString()) return resp.status(403, "not authorized");

  await formsdb.form_update(form_id, { status: "inactive" });
  return { ok: true };
};
