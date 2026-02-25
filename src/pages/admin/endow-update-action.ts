import { npodb } from "$/tables/endowments";
import type { INpoUpdate } from "@/endowment";
import { npo_update } from "@/endowment/schema";
import { type ActionFunction, redirect } from "react-router";
import { parse } from "valibot";
import { admin_ctx } from "#/.server/auth";
import type { ActionData } from "#/types/action";

type Next = { success: string } | { redirect: string };

export const endowUpdate =
  (next: Next): ActionFunction =>
  async (args) => {
    const id = args.context.get(admin_ctx);

    const update: INpoUpdate = await args.request.json();
    const parsed = parse(npo_update, update);

    // check if new slug is already taken
    if (parsed.slug) {
      const res = await npodb.npo(parsed.slug);
      if (res) {
        return {
          __err: `Slug ${parsed.slug} is already taken`,
        };
      }
    }

    await npodb.npo_update(id, parsed);

    if ("success" in next) {
      return { __ok: next.success } satisfies ActionData;
    }

    return redirect(next.redirect);
  };
