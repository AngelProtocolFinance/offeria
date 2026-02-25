import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOptions,
} from "@headlessui/react";
import type { ReactElement } from "react";
import { unpack } from "#/helpers/unpack";

interface Classes {
  container?: string;
  input?: string;
}

interface ITokenCombobox<T> {
  disabled?: boolean;
  on_change: (v: T) => void;
  value: T;
  value_disp?: T extends string ? never : (v: T) => string;
  input_disp: (v: T) => string;
  input_placeholder: string;
  btn_disp: (open: boolean) => ReactElement;
  by?: T extends object ? keyof T : never;
  opts: T[] | "loading" | "error";
  opts_styles?: Record<string, string | undefined>;

  q: string;
  on_q_change: (v: string) => void;

  opt_disp: (v: T) => ReactElement;
  classes?: Classes | string;
}

function is_loaded<T>(opts: T[] | "loading" | "error"): opts is T[] {
  return opts !== "loading" && opts !== "error";
}

const options_classes =
  "w-56 border border-gray-l3 p-1 [--anchor-max-height:15rem] overflow-y-auto rounded-md bg-gray-l5 shadow-lg focus:outline-hidden";

function status_msg(opts: unknown[] | "loading" | "error", q: string) {
  if (opts === "loading") return "Loading options...";
  if (opts === "error") return "Failed to load options";
  if (opts.length === 0 && q) return `${q} not found`;
  return null;
}

export function TokenCombobox<T>(props: ITokenCombobox<T>) {
  const s = unpack(props.classes);
  const msg = status_msg(props.opts, props.q);
  const options = is_loaded(props.opts) ? props.opts : [];

  return (
    <Combobox
      immediate
      disabled={props.disabled}
      as="fieldset"
      by={props.by as any}
      className={`${s.container} relative flex`}
      value={props.value}
      onChange={(v) => v && props.on_change(v)}
    >
      <ComboboxInput<T>
        placeholder={props.input_placeholder}
        displayValue={(x) => props.input_disp(x)}
        onBlur={msg ? () => props.on_q_change("") : undefined}
        className="w-full text-left text-sm focus:outline-hidden bg-transparent px-4"
        onChange={(event) => props.on_q_change(event.target.value)}
      />
      <ComboboxButton className="absolute right-4 top-1/2 -translate-y-1/2">
        {({ open }) => props.btn_disp(open)}
      </ComboboxButton>

      <ComboboxOptions
        style={props.opts_styles}
        className={options_classes}
        anchor={{ to: "bottom start", gap: 8 }}
      >
        {msg ? (
          <p className="p-2 text-sm text-gray">{msg}</p>
        ) : (
          options.map((opt) => props.opt_disp(opt))
        )}
      </ComboboxOptions>
    </Combobox>
  );
}
