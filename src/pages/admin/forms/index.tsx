import type { IForm } from "@/forms";
import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { FormCard } from "#/components/form-card";
import { metas } from "#/helpers/seo";
import type { Route } from "./+types";

export { action, loader } from "./api";

export const meta: Route.MetaFunction = () =>
  metas({ title: "Donation forms" });

type Filter = "all" | IForm["status"];
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function Page({ loaderData: d }: Route.ComponentProps) {
  const [filter, set_filter] = useState<Filter>("active");

  const filtered =
    filter === "all" ? d.items : d.items.filter((f) => f.status === filter);

  return (
    <div className="px-6 py-4 md:px-10 md:py-8 bg-gray-l5 h-full">
      <div className="flex items-start">
        <div className="flex-1">
          <h3 className="text-2xl">Donation forms</h3>
          <p className="mb-6 font-medium mt-1 text-gray-d1">
            Accept donations from your website today!
          </p>
        </div>
        <NavLink
          to="create"
          className="btn btn-blue text-sm normal-case px-4 py-2"
        >
          Create Form
        </NavLink>
      </div>
      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => set_filter(f.value)}
            className={`px-3 py-1.5 text-sm rounded ${
              filter === f.value
                ? "bg-blue-d1 text-white"
                : "bg-white text-gray-d1 hover:bg-gray-l4"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 grid-cols-2 [grid-template-rows:repeat(auto-fill,auto_auto_1fr_auto)]">
        {filtered.map((f) => (
          <FormCard key={f.id} {...f} />
        ))}
      </div>
      {/** form-create prompt */}
      <Outlet />
    </div>
  );
}
