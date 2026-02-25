import { Field, Fieldset, Input, Label, Legend } from "@headlessui/react";
import { forwardRef } from "react";

interface Props {
  classes?: string;
  value: boolean[];
  on_change: (frequencies: boolean[]) => void;
  error?: string;
}

export const DonateFrequencies = forwardRef<HTMLInputElement, Props>(
  ({ classes = "", ...p }, ref) => {
    return (
      <Fieldset
        className={`${classes} grid grid-cols-[auto_1fr] gap-x-2 gap-y-1`}
      >
        <Legend className="col-span-2 label font-semibold mb-1">
          Donation frequency
        </Legend>
        <input ref={ref} className="sr-only" />
        <p className="grid col-span-2 text-red text-xs empty:hidden">
          {p.error}
        </p>
        {Array.from({ length: 4 }).map((_, idx) => (
          <Field
            key={idx}
            className="border border-gray-l3 p-2 rounded accent-blue-d1 grid grid-cols-subgrid col-span-2"
          >
            <Input
              type="checkbox"
              checked={p.value[idx] || false}
              onChange={(e) => {
                const new_values = [...p.value];
                new_values[idx] = e.target.checked;
                p.on_change(new_values);
              }}
            />
            <Label className="text-sm">
              {idx === 0
                ? "One time"
                : idx === 1
                  ? "Weekly"
                  : idx === 2
                    ? "Monthly"
                    : "Annual"}
            </Label>
          </Field>
        ))}
      </Fieldset>
    );
  }
);
