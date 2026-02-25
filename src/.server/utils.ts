import { $int_gte1 } from "@/endowment/schema";
import { resp } from "@/helpers/https";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  Params,
} from "react-router";
import { parse } from "valibot";
import { cognito, to_auth } from "#/.server/auth";

export { to_q_don_settled, to_q_don_success } from "$/queues/helpers";

interface IChecked {
  req: Request;
  params: Params<string>;
  id: number;
  email: string;
  groups: string[];
  endowments: number[];
}

export const admin_checks = async ({
  request,
  params,
}: LoaderFunctionArgs | ActionFunctionArgs): Promise<Response | IChecked> => {
  const id = parse($int_gte1, params.id);
  const { user, headers } = await cognito.retrieve(request);
  if (!user) return to_auth(request, headers);
  if (!user.groups.includes("ap-admin") && !user.endowments.includes(id)) {
    return resp.status(403);
  }
  return { ...user, id, req: request, params };
};

export const is_resp = (x: any): x is Response => x instanceof Response;
