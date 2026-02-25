import { stripe } from "$/kit/stripe";
import { table } from "$/tables/table";
import { type ActionFunction, data } from "react-router";
import { cognito, user_ctx } from "#/.server/auth";
import { to_currencies_fv } from "#/helpers/currency";
import type { ActionData } from "#/types/action";
import { type UserV2, is_error } from "#/types/auth";
import type { ICurrenciesFv } from "#/types/currency";
import type { Route } from "./+types";

export interface LoaderData extends ICurrenciesFv {
  user: UserV2;
}

export const loader = async ({ context }: Route.LoaderArgs) => {
  const user = context.get(user_ctx);

  const { supported_payment_currencies } =
    await stripe.countrySpecs.retrieve("US");

  const currencies_fv = to_currencies_fv(
    user.currency,
    supported_payment_currencies,
    await table.currency_map("Usd").then((x) => x.all)
  );

  return { user, ...currencies_fv } satisfies LoaderData;
};

export const action: ActionFunction = async ({ request, context }) => {
  const user = context.get(user_ctx);
  const { session } = await cognito.retrieve(request);

  const attributes = await request.json();
  const result = await cognito.update_user_attributes(
    attributes,
    user.token_access
  );
  if (result !== "success") throw result.message;

  const res = await cognito.refresh(session);

  if (is_error(res)) throw res.message;

  return data({ __ok: "User profile updated" } satisfies ActionData, {
    headers: {
      "set-cookie": res.commit,
      "x-remix-revalidate": "1",
    },
  });
};
