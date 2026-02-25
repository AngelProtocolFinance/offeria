import { npodb } from "$/tables/endowments";
import type { INpo } from "@/endowment";
import { resp } from "@/helpers/https";
import type { ActionFunction } from "react-router";
import { admin_ctx } from "#/.server/auth";
import type { EndowmentSettingsAttributes } from "#/types/npo";
import { endowUpdate } from "../endow-update-action";
import type { Route } from "./+types";

export interface LoaderData
  extends Pick<INpo, "id" | EndowmentSettingsAttributes> {}

const fields: EndowmentSettingsAttributes[] = [
  "receiptMsg",
  "hide_bg_tip",
  "progDonationsAllowed",
  "donateMethods",
  "target",
  "increments",
  "fund_opt_in",
  "donor_address_required",
  "donate_frequencies",
];
export const loader = async (x: Route.LoaderArgs) => {
  const id = x.context.get(admin_ctx);

  const n = await npodb.npo(id, fields);
  if (!n) return resp.status(404);
  return { ...n, id } satisfies LoaderData;
};

export const action: ActionFunction = endowUpdate({
  success: "Settings updated",
});
