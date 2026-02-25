import type { TFrequency } from "@/schemas";
import { Field, Label, Radio, RadioGroup } from "@headlessui/react";
import { freqs_default } from "./constants";

const opt_style =
  "group text-sm border-gray-l3 rounded px-4 py-2 border flex items-center justify-center @md/frequency:justify-start aria-checked:bg-(--accent-primary) aria-checked:text-white aria-checked:border-none select-none";

const freqs_disp = {
  "one-time": "Once",
  weekly: "Weekly",
  monthly: "Monthly",
  annual: "Annually",
} as const;

export const freqs_shown = (
  freqs: TFrequency[] | undefined
): TFrequency[] | null => {
  if (!freqs || freqs.length === 0) return freqs_default;
  // hide frequency selector if only one option and it's one-time
  if (freqs.length === 1 && freqs[0] === "one-time") return null;
  return freqs;
};

interface Props {
  opts: TFrequency[] | undefined;
  value: TFrequency;
  onChange: (freq: TFrequency) => void;
  error?: string;
}
export function Frequency({
  value,
  onChange,
  error,
  opts = freqs_default,
}: Props) {
  return (
    <Field className="@container/frequency">
      <Label className="mb-1 block label font-semibold">
        Frequency <span className="text-red">*</span>
      </Label>

      <RadioGroup
        value={value}
        onChange={onChange}
        className="grid grid-cols-2 gap-2 @md/frequency:flex"
      >
        {opts.map((f) => (
          <Radio key={f} value={f} className={opt_style}>
            Give {freqs_disp[f]}
          </Radio>
        ))}
      </RadioGroup>
      {error && <p className="field-err text-left mt-1">{error}</p>}
      <p className="text-gray text-sm my-2">
        <span className="text-gray-d4 font-medium text-sm">
          Recurring donations
        </span>{" "}
        help nonprofits focus on mission and long-term impact, not fundraising.
        Cancel anytime.
      </p>
    </Field>
  );
}
