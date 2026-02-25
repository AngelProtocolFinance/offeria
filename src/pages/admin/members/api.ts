import { npodb } from "$/tables/endowments";
import { userdb } from "$/tables/users";
import type { INpoAdmin } from "@/user";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { redirect } from "react-router";
import { getValidatedFormData } from "remix-hook-form";
import { admin_ctx, user_ctx } from "#/.server/auth";
import type { UserV2 } from "#/types/auth";
import type { Route } from "./+types/members";
import { type ISchema, schema } from "./schema";

export interface LoaderData {
  user: UserV2;
  admins: INpoAdmin[];
}

export const members = async (x: Route.LoaderArgs) => {
  const id = x.context.get(admin_ctx);
  const user = x.context.get(user_ctx);
  const admins = await userdb.npo_admins(id);
  return { admins, user } satisfies LoaderData;
};

export const delete_action = async (x: Route.ActionArgs) => {
  const id = x.context.get(admin_ctx);
  const { to_remove } = await x.request.json();
  await userdb.userxnpo_del(id, to_remove);

  return { ok: true };
};

export const add_action = async (x: Route.ActionArgs) => {
  const id = x.context.get(admin_ctx);
  const user = x.context.get(user_ctx);

  const fv = await getValidatedFormData<ISchema>(
    x.request,
    valibotResolver(schema([]))
  );
  if (fv.errors) return fv;

  const npo = await npodb.npo(id, ["name"]);
  if (!npo) return { status: 404 };

  await userdb.npo_admin_tx(id, {
    endowName: npo.name,
    invitee: fv.data.email,
    inviteeFirstName: fv.data.first_name,
    invitor: user.email,
  });

  return redirect("..");
};
