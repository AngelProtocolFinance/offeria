import { type ActionFunction, redirect } from "react-router";
import { cognito, user_ctx } from "#/.server/auth";
import { is_error } from "#/types/auth";

export const action: ActionFunction = async ({ request, context }) => {
  const user = context.get(user_ctx);
  const { session } = await cognito.retrieve(request);

  const recipient_id = await request.text();
  const result = await cognito.update_user_attributes(
    [{ Name: "custom:pay_id", Value: recipient_id }],
    user.token_access
  );
  if (result !== "success") throw result.message;

  const res = await cognito.refresh(session);

  if (is_error(res)) throw res.message;

  return redirect("../referrals", {
    headers: {
      "set-cookie": res.commit,
      "x-remix-revalidate": "1",
      "cache-control": "no-cache",
    },
  });
};
