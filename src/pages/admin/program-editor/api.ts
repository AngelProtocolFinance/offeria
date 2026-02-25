import { npodb } from "$/tables/endowments";
import {
  $int_gte1,
  milestone_id,
  milestone_update,
  program_id,
  program_update,
} from "@/endowment/schema";
import { resp } from "@/helpers/https";
import { parse } from "valibot";
import { admin_ctx } from "#/.server/auth";
import type { ActionData } from "#/types/action";
import type { Route } from "./+types";

export const loader = async ({ params }: Route.LoaderArgs) => {
  const npo_id = parse($int_gte1, params.id);
  const pid = parse(program_id, params.programId);
  const prog = await npodb.npo_program(pid, npo_id);
  if (!prog) throw resp.status(404);
  return prog;
};

export const action = async (x: Route.ActionArgs) => {
  const id = x.context.get(admin_ctx);

  const pid = parse(program_id, x.params.programId);

  const { intent, ...p } = await x.request.json();

  if (intent === "add-milestone") {
    await npodb.prog_milestone_put(pid, {
      title: `Milestone ${p["next-milestone-num"]}`,
      description: "milestone description",
      date: new Date().toISOString(),
    });
    return { ok: true };
  }

  if (intent === "delete-milestone") {
    const mid = parse(milestone_id, p["milestone-id"]);
    await npodb.prog_milestone_delete(pid, mid);
    return { ok: true };
  }

  if (intent === "edit-milestone") {
    const { "milestone-id": id, ...rest } = p;
    const mid = parse(milestone_id, id);
    const upd8 = parse(milestone_update, rest);
    await npodb.prog_milestone_update(pid, mid, upd8);
    return { ok: true };
  }

  //edit program
  const upd8 = parse(program_update, p);
  await npodb.npo_prog_update(id, pid, upd8);

  return { __ok: "Program updated" } satisfies ActionData;
};
