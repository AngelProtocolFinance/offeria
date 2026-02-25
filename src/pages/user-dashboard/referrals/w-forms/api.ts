import { nvs } from "$/env";
import { type ActionFunction, redirect } from "react-router";
import { cognito, user_ctx } from "#/.server/auth";
import { is_error } from "#/types/auth";

export interface LoaderData {
  w9_url: string;
  w8ben_url: string;
}

const anvil_form_url = (forge_slug: string) =>
  `https://app.useanvil.com/weld/${nvs.anvil.org_slug}/${forge_slug}${nvs.app.env === "staging" ? "?test=true" : ""}`;
export const loader = async () => {
  const wform: LoaderData = {
    w8ben_url: anvil_form_url("fw8ben"),
    w9_url: anvil_form_url("irs-w9"),
  };

  return wform;
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
