import { npodb } from "$/tables/endowments";
import type { IProgramDb } from "@/endowment";
import { program_id } from "@/endowment/schema";
import { redirect } from "react-router";
import { parse } from "valibot";
import { admin_ctx } from "#/.server/auth";
import { routes } from "../routes";
import type { Route } from "./+types";

export interface LoaderData {
  programs: IProgramDb[];
}

export const loader = async (x: Route.LoaderArgs) => {
  const id = x.context.get(admin_ctx);

  const programs = await npodb.npo_programs(id);
  return { programs } satisfies LoaderData;
};

export const action = async (x: Route.ActionArgs) => {
  const id = x.context.get(admin_ctx);

  if (x.request.method === "DELETE") {
    const fv = await x.request.formData();
    const pid = parse(program_id, fv.get("programId"));
    await npodb.npo_prog_del(id, pid);
    return { ok: true };
  }

  //new program
  const new_id = await npodb.npo_program_put(id, {
    title: "New Program",
    description: "Program description",
    milestones: [],
  });

  return redirect(`../${routes.program_editor}/${new_id}`);
};
