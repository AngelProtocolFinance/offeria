import { DONATION_INCREMENTS, logo_url } from "@/constants/common";
import { ru_vdec } from "@/helpers/decimal";
import { type IToken, chains, is_custom } from "@better-giving/crypto";
import { CloseButton, ComboboxOption } from "@headlessui/react";
import { useState } from "react";
import { href } from "react-router";
import use_swr, { type SWRResponse } from "swr";
import {
  type TTokenState,
  TokenCombobox,
  TokenField,
  btn_disp,
} from "#/components/token-field";
import { use_debouncer } from "#/hooks/use-debouncer";
import type { ITokenEstimate } from "#/types/api";
import { CpfToggle } from "../../common/cpf-toggle";
import { Incrementers } from "../../common/incrementers";
import { MethodBenefits } from "../../common/method-benefits";
import { TipField } from "../../common/tip-field";
import { use_donation } from "../../context";
import { type TMethodState, to_step } from "../../types";
import { use_rhf } from "./use-rhf";

const fetcher = (path: string) =>
  fetch(path).then<IToken[]>((res) => res.json());

function to_union<T>(
  resp: SWRResponse<T[], any, any>
): T[] | "loading" | "error" {
  if (resp.error) return "error";
  if (!resp.data) return "loading";
  return resp.data;
}

export function Form(props: TMethodState<"crypto">) {
  const { don, don_set } = use_donation();
  const [token_state, set_token_state] = useState<TTokenState>(undefined);
  const [token_q, set_token_q] = useState("");
  const [token_q_debounced] = use_debouncer(token_q, 300);

  const tokens = use_swr(
    `${href("/api/tokens")}?q=${encodeURIComponent(token_q_debounced)}`,
    fetcher
  );

  const {
    handleSubmit,
    reset,
    token,
    errors,
    on_increment,
    tip_format,
    cpf,
    setFocus,
    setValue,
    getValues,
    register,
  } = use_rhf(props.fv, don.recipient.hide_bg_tip ?? false);

  const combobox = (
    <TokenCombobox
      by="code"
      classes="[&:has(:placeholder-shown)]:w-34 w-24"
      disabled={token_state === "loading"}
      q={token_q}
      on_q_change={(x) => set_token_q(x)}
      btn_disp={(open) => btn_disp(open, token_state)}
      input_disp={(t) => t.symbol}
      input_placeholder="Select token"
      opt_disp={(t) => {
        return (
          <ComboboxOption
            as={CloseButton}
            key={t.code}
            className={
              "w-full grid grid-cols-[auto_1fr] justify-items-start items-center gap-x-2 p-2 hover:bg-(--accent-secondary) data-selected:bg-(--accent-secondary) data-selected:pointer-events-none cursor-pointer"
            }
            value={t}
          >
            <img
              src={logo_url(t.logo, is_custom(t.id))}
              className="w-6 h-6 rounded-full row-span-2"
            />

            <span className="text-[13px]">{t.symbol}</span>

            <p
              style={{ color: t.color }}
              className="text-xs col-start-2 text-left"
            >
              {chains[t.network].name}
            </p>
          </ComboboxOption>
        );
      }}
      value={token.value}
      opts={to_union(tokens)}
      // reapply to portaled
      opts_styles={{ "--accent-secondary": don.config?.accent_secondary }}
      on_change={async (t) => {
        try {
          const current_amount = token.value.amount;
          token.onChange({ ...t, amount: current_amount });
          set_token_state("loading");
          const res = await fetch(
            href("/api/tokens/:code/estimate", { code: t.code })
          );
          if (!res.ok) throw res;
          const { usdpu, min }: ITokenEstimate = await res.json();
          set_token_state(undefined);
          token.onChange({ ...t, amount: current_amount, usdpu, min });
        } catch (err) {
          console.error(err);
          set_token_state("error");
        }
      }}
    />
  );

  return (
    <form
      onSubmit={handleSubmit((x) => {
        to_step("crypto", x, "donor", don_set);
        reset();
      })}
      className="flex flex-col gap-y-2 rounded-md min-h-full"
      autoComplete="off"
    >
      <TokenField
        combobox={combobox}
        ref={token.ref}
        amount={token.value.amount}
        amount_usd={token.value.usdpu * +token.value.amount}
        on_change={(x) => token.onChange({ ...token.value, amount: x })}
        error={errors.token?.amount?.message || errors.token?.id?.message}
        label="Donation amount"
      />

      {token.value.code && !token_state && (
        <Incrementers
          classes="-mt-1"
          disabled={token_state === "error" || token_state === "loading"}
          on_increment={on_increment}
          code={token.value.symbol}
          rate={token.value.usdpu}
          precision={token.value.precision}
          increments={(don.config?.increments || DONATION_INCREMENTS).map(
            (i) => {
              const v = +i.value / token.value.usdpu ** 2;
              return { ...i, value: v.toString() };
            }
          )}
        />
      )}

      {don.recipient.hide_bg_tip ? null : (
        <TipField
          classes="mt-2"
          checked={tip_format.value !== "none"}
          checked_changed={(checked) => {
            if (checked) {
              tip_format.onChange("15");
            } else {
              tip_format.onChange("none");
              setValue("tip", "");
            }
          }}
          tip_format={tip_format.value}
          tip_format_changed={async (format) => {
            tip_format.onChange(format);
            if (format === "none") {
              return setValue("tip", "");
            }
            if (format === "custom") {
              await new Promise((r) => setTimeout(r, 50));
              return setFocus("tip");
            }

            const tkn = getValues("token");
            if (!tkn.amount) return setValue("tip", "");

            const v = (+format / 100) * +tkn.amount;
            setValue("tip", ru_vdec(v, tkn.usdpu, tkn.precision));
          }}
          custom_tip={
            tip_format.value === "custom" ? (
              <div className="relative w-full flex">
                <span className="font-bold text-xs text-gray-d1 self-center">
                  {token.value.symbol}
                </span>
                <input
                  {...register("tip")}
                  inputMode="decimal"
                  className="w-full text-sm pl-2 focus:outline-none"
                  placeholder="Enter contribution amount"
                  aria-invalid={!!errors.tip?.message}
                />
                <span className="right-6 text-xs text-red text-right absolute top-1/2 -translate-y-1/2 empty:hidden">
                  {errors.tip?.message}
                </span>
              </div>
            ) : undefined
          }
        />
      )}

      <CpfToggle
        classes="mt-1"
        checked={cpf.value}
        checked_changed={(x) => cpf.onChange(x)}
      />
      <MethodBenefits subject="crypto" classes="mt-2" />

      <button
        disabled={token_state === "error" || token_state === "loading"}
        className="mt-auto btn btn-blue text-sm enabled:bg-(--accent-primary)"
        type="submit"
      >
        Continue
      </button>
    </form>
  );
}
