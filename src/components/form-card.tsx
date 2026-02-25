import type { IForm } from "@/forms";
import { TagIcon } from "lucide-react";
import { NavLink, href } from "react-router";
import { DisableBtn } from "./form-card/disable-btn";
import { Target } from "./target";

interface Props extends IForm {
  classes?: string;
}
export function FormCard({ classes = "", ...f }: Props) {
  const styles: Record<string, string | undefined> = {
    "--accent-primary": f.accent_primary,
    "--accent-secondary": f.accent_secondary,
  };
  return (
    <div
      style={styles}
      key={f.id}
      className="grid [grid-template-rows:subgrid] row-span-4 bg-white rounded p-4"
    >
      <div className="flex items-center gap-2">
        <h3 className="text-lg">{f.name}</h3>
        {f.status === "inactive" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-gray-l4 text-gray-d2">
            <span className="w-1.5 h-1.5 rounded-full bg-gray" />
            Inactive
          </span>
        )}
      </div>
      <p className="text-sm text-gray-d4 mt-1">
        {f.program ? (
          <>
            <span className="text-2xs bg-gray-l3 p-1 rounded-xs">Program</span>{" "}
            <span className="text-sm font-medium text-gray">
              {f.program.name}
            </span>
          </>
        ) : (
          <span className="invisible">placeholder</span>
        )}
      </p>
      <Target classes="mt-8 mb-4" target={f.target} progress={f.ltd} />
      <div className="flex items-center justify-between">
        {f.tag && (
          <p className="pl-1 text-gray">
            <TagIcon size={13} className="inline-block  mr-1" />
            <span className=" text-sm">{f.tag}</span>
          </p>
        )}
        <div className="flex items-center gap-3">
          {f.status === "active" && <DisableBtn form_id={f.id} name={f.name} />}
          <NavLink
            to={href("/forms/:id/edit", { id: f.id })}
            className="btn btn-outline text-xs py-2 px-3.5 justify-self-end"
          >
            View
          </NavLink>
        </div>
      </div>
    </div>
  );
}
