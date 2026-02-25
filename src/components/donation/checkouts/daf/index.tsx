import { PROCESSING_RATES } from "@/constants/common";
import type { ChariotMetadata } from "@/donations";
import { partition } from "@/donations/helpers";
import type {
  IAmount,
  IDonationIntent,
  IDonorAddress,
} from "@/donations/schema";
import { min_fee_allowance } from "@/helpers/donation";
import { to_full } from "@/helpers/name";
import { useState } from "react";
import ChariotConnect from "react-chariot-connect";
import { href } from "react-router";
import { ulid } from "ulid";
import { ContentLoader } from "#/components/content-loader";
import { ErrorBoundaryClass } from "#/components/error";
import { type IPrompt, Prompt } from "#/components/prompt";
import { chariot_connect_id } from "#/constants/env";
import { error_prompt } from "#/helpers/error-prompt";
import { to_atomic } from "#/helpers/stripe";
import { usd_option } from "../../common/constants";
import { currency } from "../../common/currency";
import { Summary } from "../../common/summary";
import { use_donation } from "../../context";
import {
  type DafDonationDetails,
  tip_from_val,
  tip_val,
  to_step,
} from "../../types";
import { DonationTerms } from "../donation-terms";

export function ChariotCheckout(props: DafDonationDetails) {
  const { don_set, don } = use_donation();
  const [prompt, set_prompt] = useState<IPrompt>();
  const [grant_state, set_grant_state] = useState<"pending">();

  const tipv = tip_val(props.tip_format, props.tip, +props.amount);
  const mfa = props.cover_processing_fee
    ? min_fee_allowance(tipv + +props.amount, PROCESSING_RATES.chariot)
    : 0;

  return (
    <Summary
      classes="group grid content-start p-4 @xl/steps:p-8 [&_#connectContainer]:mt-8"
      on_back={() => to_step("daf", props, "form", don_set)}
      Amount={currency(usd_option)}
      amount={+props.amount}
      fee_allowance={mfa}
      frequency="one-time"
      tip={tipv ? { value: tipv, charity_name: don.recipient.name } : undefined}
    >
      <ErrorBoundaryClass>
        <ChariotConnect
          theme="LightBlueTheme"
          disabled={grant_state === "pending"}
          cid={chariot_connect_id}
          // https://givechariot.readme.io/reference/integrating-connect#pre-populate-data-into-your-connect-session
          onDonationRequest={async () => {
            const total = +props.amount + tipv + mfa;
            const amnt: IAmount = {
              base: +props.amount,
              tip: tipv,
              fee_allowance: mfa,
            };
            const metadata = {
              don_id: ulid(),
              amount: amnt,
            } satisfies ChariotMetadata;

            return {
              amount: to_atomic(total, [2, 2]),
              metadata,
            };
          }}
          // see https://givechariot.readme.io/reference/integrating-connect#capture-your-grant-intent
          onSuccess={async (event) => {
            const {
              grantIntent,
              workflowSessionId,
              user: grantor,
            } = event.detail;
            const m: ChariotMetadata = grantIntent.metadata;

            try {
              set_prompt({
                type: "loading",
                children: "Processing payment",
                isDismissable: false,
              });

              /** user may input amount different from our donate form */
              const parts = partition(m.amount);
              const grant_amount: number = grantIntent.amount / 100;
              const adj = parts(grant_amount);

              //reflect adjustment to state
              don_set((x) => ({
                ...x,
                method: "daf",
                daf: {
                  type: "daf",
                  step: "checkout",
                  fv: { ...props, ...tip_from_val(adj.tip, adj.base) },
                },
              }));

              const { postalCode, line1, line2, city, state } = grantor.address;
              const addr_street = [line1, line2].filter(Boolean).join(", ");

              const addr: IDonorAddress = {
                street: addr_street,
                city,
                state,
                zip_code: postalCode,
              };

              const intent: IDonationIntent = {
                via: "chariot",
                via_extra: workflowSessionId,
                frequency: "one-time",
                currency: usd_option.code,
                amount: adj,
                to_id: don.recipient.id,
                donor: {
                  title: "",
                  email: grantor.email,
                  first_name: grantor.firstName,
                  last_name: grantor.lastName,
                  company_name: "",
                  address: addr,
                },
                source: don.source,
              };

              if (don.program) intent.program = don.program;
              if (don.config?.id) intent.source_id = don.config.id;

              set_grant_state("pending");
              const res = await fetch(href("/api/donation-intents"), {
                method: "POST",
                body: JSON.stringify(intent),
              });
              if (!res.ok) throw await res.text();
              const { id } = await res.json();

              set_prompt(undefined);

              const custom_redirect = don.config?.success_redirect;
              const url = custom_redirect
                ? new URL(custom_redirect)
                : new URL(`${don.base_url}${href("/donations/:id", { id })}`);

              if (custom_redirect) {
                url.searchParams.set(
                  "donor_name",
                  to_full(grantor.firstName, grantor.lastName)
                );
                url.searchParams.set(
                  "donation_amount",
                  grant_amount.toString()
                );
                url.searchParams.set("donation_currency", usd_option.code);
                url.searchParams.set("payment_method", "daf");
              }
              const return_url = url.toString();

              // redirect via postMessage if in iframe, otherwise navigate directly
              if (window.self !== window.top) {
                window.parent.postMessage(
                  {
                    type: "redirect",
                    redirect_url: return_url,
                    form_id: don.config?.id,
                  },
                  "*"
                );
              } else {
                window.location.href = return_url;
              }
            } catch (err) {
              set_prompt(error_prompt(err, { context: "processing donation" }));
            } finally {
              set_grant_state(undefined);
            }
          }}
        />
      </ErrorBoundaryClass>
      <ContentLoader className="h-12 mt-4 block group-has-[chariot-connect]:hidden" />
      <DonationTerms
        endowName={don.recipient.name}
        classes="border-t border-gray-l3 mt-5 pt-4 "
      />
      {prompt && <Prompt {...prompt} onClose={() => set_prompt(undefined)} />}
    </Summary>
  );
}
