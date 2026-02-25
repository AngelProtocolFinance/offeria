import { type ActionFunction, redirect } from "react-router";
import { cognito, user_ctx } from "#/.server/auth";
import { type UserV2, is_error } from "#/types/auth";
import type { Route } from "./+types";

export interface LoaderData extends UserV2 {}

export const loader = async ({ context }: Route.LoaderArgs) => {
  const user = context.get(user_ctx);

  return user;
};

export const action: ActionFunction = async ({ request, context }) => {
  const user = context.get(user_ctx);
  const { session } = await cognito.retrieve(request);

  const amnt = await request.text();
  const result = await cognito.update_user_attributes(
    [{ Name: "custom:pay_min", Value: amnt }],
    user.token_access
  );
  if (result !== "success") throw result.message;

  const res = await cognito.refresh(session);

  if (is_error(res)) throw res.message;

  return redirect("..", {
    headers: {
      "set-cookie": res.commit,
      "x-remix-revalidate": "1",
      "cache-control": "no-cache",
    },
  });
};
