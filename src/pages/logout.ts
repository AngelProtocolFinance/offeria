import { type ActionFunction, href, redirect } from "react-router";
import { cognito, to_auth } from "#/.server/auth";
import { is_error } from "#/types/auth";

export const action: ActionFunction = async ({ request }) => {
  const { user, session } = await cognito.retrieve(request);
  if (!user) return to_auth(request);

  const res = await cognito.sign_out(session);
  if (is_error(res)) return redirect(href("/marketplace"), { status: 500 });
  return redirect(href("/marketplace"), {
    headers: { "set-cookie": res },
  });
};
