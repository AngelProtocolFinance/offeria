import { donor_fv_blank } from "@/donations/schema";
import { useEffect } from "react";
import { Steps, type TDonation } from "#/components/donation";
import type { Route } from "./+types";
export { loader, headers } from "./api";

export default function Page({ loaderData, params }: Route.ComponentProps) {
  const { recipient_details: rd, base_url, ...d } = loaderData;
  const init_state: TDonation = {
    base_url,
    method: d.donate_methods?.at(0) || "stripe",
    source: "bg-widget",
    mode: "preview",
    donor: donor_fv_blank,
    recipient: {
      id: d.recipient,
      name: d.name,
      hide_bg_tip: rd.hide_bg_tip,
      members: [],
      donor_address_required: rd.donor_address_required,
    },
    config: {
      id: d.id,
      accent_primary: d.accent_primary,
      accent_secondary: d.accent_secondary,
      method_ids: d.donate_methods,
      increments: d.increments,
      success_redirect: d.success_redirect,
      freq_opts: d.freq_opts,
      stripe: d.defaults?.stripe,
    },
    program: d.program,
  };

  useEffect(() => {
    const send_height_to_parent = () => {
      const height = document.body.scrollHeight;
      window.parent.postMessage(
        {
          type: "resize",
          form_id: params.id,
          height,
        },
        "*"
      );
    };

    send_height_to_parent();

    const resize_observer = new ResizeObserver(() => {
      send_height_to_parent();
    });

    resize_observer.observe(document.body);

    return () => {
      resize_observer.disconnect();
    };
  }, [params.id]);

  const steps = <Steps key={JSON.stringify(init_state)} init={init_state} />;

  if (d.status === "inactive") {
    return (
      <div className="relative">
        <div className="blur-sm pointer-events-none">{steps}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <p className="text-gray-d2 font-medium">
            This form has been disabled
          </p>
        </div>
      </div>
    );
  }

  return steps;
}
