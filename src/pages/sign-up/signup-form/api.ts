import { resp } from "@/helpers/https";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { type ActionFunction, href, redirect } from "react-router";
import { getValidatedFormData } from "remix-hook-form";
import { cognito, oauth } from "#/.server/auth";
import type { IFormInvalid } from "#/types/action";
import { type ISignUp, is_error, sign_up } from "#/types/auth";
import { evaluate } from "./evaluate";

export const action: ActionFunction = async ({ request }) => {
  const from = new URL(request.url);
  const fv = await request.formData();
  const redirect_to = from.searchParams.get("redirect") || href("/marketplace");

  const { user } = await cognito.retrieve(request);
  if (user) return redirect(redirect_to);

  if (fv.get("intent") === "oauth") {
    return redirect(oauth.initiate_url(redirect_to, from.origin));
  }

  const p = await getValidatedFormData<ISignUp>(fv, valibotResolver(sign_up));
  if (p.errors) return p;

  // Honeypot validation - reject if the honeypot field is filled
  if (p.data.middle_name && p.data.middle_name !== "") {
    console.warn("Honeypot triggered - potential bot submission detected");
    // Return a generic error to avoid revealing the honeypot
    return resp.status(400);
  }

  const evl = await evaluate({
    first_name: p.data.first_name,
    last_name: p.data.last_name,
    email: p.data.email,
  }).catch((err) => {
    console.error("evaluation failed", err);
    return undefined;
  });

  console.info(evl);

  if (evl && evl.is_spam) {
    if (evl.field === "first_name") {
      return {
        receivedValues: p.receivedValues,
        errors: { first_name: { type: "value", message: evl.explanation } },
      } satisfies IFormInvalid<ISignUp>;
    }
    if (evl.field === "last_name") {
      return {
        receivedValues: p.receivedValues,
        errors: { last_name: { type: "value", message: evl.explanation } },
      } satisfies IFormInvalid<ISignUp>;
    }
    return {
      receivedValues: p.receivedValues,
      errors: { email: { type: "value", message: evl.explanation } },
    } satisfies IFormInvalid<ISignUp>;
  }

  const is_npo = redirect_to.startsWith(href("/register"));
  const res = await cognito.signup(
    p.data.email.toLowerCase(),
    p.data.password,
    {
      firstName: p.data.first_name,
      lastName: p.data.last_name,
      "custom:user-type": is_npo ? "npo" : "donor",
    }
  );
  if (is_error(res)) {
    return {
      receivedValues: p.receivedValues,
      errors: { email: { type: "value", message: res.message } },
    } satisfies IFormInvalid<ISignUp>;
  }

  const to = new URL(from);
  to.pathname = `${from.pathname}/confirm`;
  to.searchParams.set("email", p.data.email);
  return redirect(to.toString());
};
