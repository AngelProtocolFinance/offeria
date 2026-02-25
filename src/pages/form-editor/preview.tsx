import { donor_fv_blank } from "@/donations/schema";
import { ExternalLinkIcon, EyeIcon } from "lucide-react";
import { Steps, type TDonation } from "#/components/donation";
import { ExtLink } from "#/components/ext-link";
import { DEV_DOCS_BASE_URL } from "#/constants/env";
import type { ILoader } from "./api";

interface Props extends ILoader {
  classes?: string;
  type: "script" | "iframe";
  form_id: string;
}
export function Preview({
  classes = "",
  recipient_details: rd,
  base_url,
  form_id,
  type,
  ...f
}: Props) {
  const init_state: TDonation = {
    base_url,
    method: f.donate_methods?.at(0) || "stripe",
    source: "bg-widget",
    mode: "preview",
    recipient: {
      id: f.recipient,
      name: rd.name,
      hide_bg_tip: rd.hide_bg_tip,
      members: rd.members,
      donor_address_required: false,
    },
    donor: donor_fv_blank,
    config: {
      id: f.id,
      accent_primary: f.accent_primary,
      accent_secondary: f.accent_secondary,
      method_ids: f.donate_methods,
      increments: f.increments,
      success_redirect: f.success_redirect,
      freq_opts: f.freq_opts,
      stripe: { amount_usd: "10" },
    },
  };

  return (
    <div className={classes}>
      <div className="mb-2 flex justify-between">
        <div className="text-sm flex items-center gap-x-1">
          <EyeIcon size={16} className="text-gray-d1" />
          <span>Live form preview</span>
        </div>
        <ExtLink
          className="text-sm text-blue hover:text-blue-d1 inline-flex items-center gap-1"
          href={`${DEV_DOCS_BASE_URL}/forms/${form_id}?mode=${type}`}
        >
          Embed examples
          <ExternalLinkIcon size={12} />
        </ExtLink>
      </div>
      {f.status === "inactive" ? (
        <div className="relative">
          <div className="blur-sm pointer-events-none">
            <Steps
              key={JSON.stringify(init_state)}
              init={init_state}
              className="rounded"
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded">
            <p className="text-gray-d2 font-medium">
              This form has been disabled
            </p>
          </div>
        </div>
      ) : (
        <Steps
          key={JSON.stringify(init_state)}
          init={init_state}
          className="rounded"
        />
      )}
    </div>
  );
}
