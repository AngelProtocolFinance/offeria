import { subsdb } from "$/tables/subscriptions";
import { getUnixTime } from "date-fns";
import { redirect } from "react-router";
import type { Route } from "./+types";

export const action = async ({ request, params }: Route.ActionArgs) => {
  const { reason } = await request.json();
  await subsdb.update(params.sub_id, {
    status: "inactive",
    status_cancel_reason: reason,
    updated_at: getUnixTime(new Date()),
  });

  return redirect("..");
};
