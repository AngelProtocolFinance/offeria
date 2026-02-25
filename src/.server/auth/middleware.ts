import { $int_gte1 } from "@/endowment/schema";
import { resp } from "@/helpers/https";
import { type MiddlewareFunction, createContext } from "react-router";
import { parse } from "valibot";
import type { UserV2 } from "#/types/auth";
import { cognito } from "./cognito";
import { to_auth } from "./to-auth";

export const user_ctx = createContext<UserV2>();

export const auth_mdlwr: MiddlewareFunction = async (
  { request, context },
  next
) => {
  const { user, headers } = await cognito.retrieve(request);
  if (!user) throw to_auth(request, headers);
  context.set(user_ctx, user);
  return next();
};

export const admin_mdlwr: MiddlewareFunction = async ({ context }, next) => {
  const user = context.get(user_ctx);
  if (!user.groups.includes("ap-admin")) throw resp.status(403);
  return next();
};

export const admin_ctx = createContext<number>();

export const npo_admin_mdlwr: MiddlewareFunction = async (
  { params, context },
  next
) => {
  const user = context.get(user_ctx);
  const id = parse($int_gte1, params.id);
  if (!user.groups.includes("ap-admin") && !user.endowments.includes(id)) {
    throw resp.status(403);
  }
  context.set(admin_ctx, id);
  return next();
};
