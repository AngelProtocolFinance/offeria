import { increment_label_max_chars } from "@/schemas";
import { Field as HuiField, Input, Label, Textarea } from "@headlessui/react";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { DollarSign } from "lucide-react";
import { useController, useFieldArray, useForm } from "react-hook-form";
import { DonateFrequencies } from "#/components/donate-frequencies";
import { DonateMethods } from "#/components/donate-methods";
import { Field, Form } from "#/components/form";
import { GoalSelector } from "#/components/goal-selector";
import { Increments } from "#/components/increments";
import { bg_accent_primary, bg_accent_secondary } from "#/styles/colors";
import { type FVBasic, schema_basic } from "./types";

interface Props extends FVBasic {
  classes?: string;
  is_submitting: boolean;
  on_submit: (fv: FVBasic) => void;
}

export function SettingsBasic({
  classes = "",
  on_submit,
  is_submitting,
  accent_primary = bg_accent_primary,
  accent_secondary = bg_accent_secondary,
  ...fv
}: Props) {
  const {
    handleSubmit,
    reset: hookFormReset,
    formState: { isDirty, errors, isSubmitting },
    watch,
    register,
    control,
  } = useForm<FVBasic>({
    resolver: valibotResolver(schema_basic),
    //set new config as default, so user would need to make a change to be able to update again
    values: { ...fv, accent_primary, accent_secondary },
  });

  const { field: donate_methods } = useController({
    control: control,
    name: "methods",
  });

  const increments = useFieldArray({
    control,
    name: "increments",
  });

  const { field: target } = useController({
    control,
    name: "target.type",
  });

  const { field: freqs } = useController({
    control,
    name: "frequencies",
  });

  const incs = watch("increments");

  return (
    <Form
      disabled={isSubmitting}
      className={`${classes} @container/configurer bg-white rounded p-4 self-start`}
      onSubmit={handleSubmit((x) => on_submit(x), console.error)}
      onReset={(e) => {
        e.preventDefault();
        hookFormReset();
      }}
    >
      <DonateMethods
        classes={{
          tooltip: "italic",
          label: "font-medium",
        }}
        values={donate_methods.value}
        on_change={donate_methods.onChange}
        ref={donate_methods.ref}
        error={
          <p className="text-red text-xs mb-1 empty:hidden">
            {errors.methods?.message}
          </p>
        }
      />

      <DonateFrequencies
        classes="mt-6"
        value={freqs.value}
        on_change={freqs.onChange}
        error={errors.frequencies?.message}
        ref={freqs.ref}
      />

      <p className="mt-8 text-sm font-semibold">Style</p>
      <HuiField className="flex items-center gap-2 mt-1">
        <Input type="color" {...register("accent_primary")} />
        <Label className="text-sm"> Accent primary</Label>
      </HuiField>
      <HuiField className="flex items-center gap-2 mt-2">
        <Input type="color" {...register("accent_secondary")} />
        <Label className="text-sm">Accent secondary</Label>
      </HuiField>

      <Increments
        classes="mt-8 mb-10"
        fields={increments.fields}
        onAdd={(val) => {
          if (increments.fields.length >= 4) {
            return alert("You can only have 4 increments");
          }
          increments.append({ value: val, label: "" });
        }}
        onRemove={(idx) => increments.remove(idx)}
        countError={errors.increments?.root?.message}
        field={(idx) => (
          <>
            <HuiField className="grid grid-rows-subgrid row-span-2">
              <div className="relative w-full">
                <DollarSign
                  size={14}
                  className="text-gray absolute top-1/2 left-3 -translate-y-1/2"
                />
                <Input
                  type="number"
                  placeholder="0.00"
                  step="any"
                  {...register(`increments.${idx}.value`)}
                  className="w-full h-full outline-blue-d1 rounded-sm text-sm font-medium bg-transparent pl-8 pr-4 py-3.5 placeholder:text-gray text-gray-d4 border border-gray-l3 disabled:pointer-events-none disabled:bg-gray-l5 disabled:text-gray"
                />
              </div>
              <p className="mt-1 empty:hidden text-left text-xs text-red">
                {errors.increments?.[idx]?.value?.message}
              </p>
            </HuiField>
            <HuiField className="grid grid-rows-subgrid row-span-2">
              <Textarea
                rows={2}
                {...register(`increments.${idx}.label`)}
                className="w-full  outline-blue-d1 rounded-sm text-sm font-medium bg-transparent px-4 py-3.5 placeholder:text-gray text-gray-d4 border border-gray-l3 disabled:pointer-events-none disabled:bg-gray-l5 disabled:text-gray"
              />
              <p
                data-error={!!errors.increments?.[idx]?.label?.message}
                className="mt-1 text-left text-xs data-[error='true']:text-red"
              >
                {incs[idx].label.length}/{increment_label_max_chars}
              </p>
            </HuiField>
          </>
        )}
      />

      <div>
        <p className="font-semibold mb-3 text-sm">Donation goal</p>
        <GoalSelector value={target.value} onChange={target.onChange} />
        {target.value === "fixed" && (
          <Field
            {...register("target.value", { shouldUnregister: true })}
            label="How much money do you want to raise?"
            required
            classes="mt-4 mb-6"
            placeholder="$"
            error={errors?.target?.value?.message}
          />
        )}
      </div>

      <Field
        sub="A meaningful label to help you identify this form."
        {...register("tag")}
        label="Tag"
        placeholder="e.g. in mywebsite.com"
        required
        classes={{ container: "mt-6", label: "font-semibold text-sm" }}
        error={errors.tag?.message}
      />

      <button
        disabled={!isDirty}
        type="submit"
        className="mt-6 justify-self-end btn btn-blue normal-case text-sm px-4 py-2"
      >
        {isSubmitting ? "Saving.." : "Save"}
      </button>
    </Form>
  );
}
