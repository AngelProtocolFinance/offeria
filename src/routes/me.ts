import { userdb } from "$/tables/users";
import { $int_gte1 } from "@/schemas";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { parse } from "valibot";
import { cognito, to_auth } from "#/.server/auth";
import { user_bookmarks, user_npos } from "#/.server/user";
import type { PublicUser } from "#/types/auth";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { user, headers } = await cognito.retrieve(request);

  if (!user) {
    headers?.set("cache-control", "private, no-store");
    return Response.json(null, { headers });
  }

  const [bookmarks, orgs] = await Promise.all([
    user_bookmarks(user.email),
    user_npos(user.email),
  ]);

  const public_user: PublicUser = {
    avatar: user.avatar,
    groups: user.groups,
    bookmarks,
    orgs,
  };

  headers?.set("cache-control", "private, no-store");
  return Response.json(public_user, { headers });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { user, headers } = await cognito.retrieve(request);
  if (!user) return to_auth(request, headers);

  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "toggle-bookmark") {
    const bookmark_action = form.get("action") as string;
    const npo_id = parse($int_gte1, form.get("npo_id"));

    if (bookmark_action === "add") {
      await userdb.user_bookmark_put(user.email, npo_id);
    } else if (bookmark_action === "delete") {
      await userdb.user_bookmark_del(user.email, npo_id);
    }

    return Response.json({ ok: true });
  }

  return new Response("invalid intent", { status: 400 });
};
