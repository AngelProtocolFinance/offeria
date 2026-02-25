import { type LoaderFunctionArgs, data } from "react-router";
import { cognito, user_ctx } from "#/.server/auth";
import type { Stored } from "#/.server/auth/session";
import { weld_data_fn } from "#/.server/registration/weld-data";
import { type UserV2, is_error } from "#/types/auth";

export interface LoaderData {
  doc_eid: string;
}

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const user = context.get(user_ctx);
  const { session } = await cognito.retrieve(request);
  const q = new URL(request.url).searchParams;
  const weld_data_eid = q.get("weldDataEid");
  if (!weld_data_eid) throw new Response(null, { status: 400 });
  const { documentGroup } = await weld_data_fn(weld_data_eid);

  const refreshed_user = await commit_wform(user, session, documentGroup.eid);
  const x = { doc_eid: documentGroup.eid } satisfies LoaderData;
  return data(x, {
    headers: {
      ...(refreshed_user && {
        "set-cookie": refreshed_user.commit,
      }),
      "x-remix-revalidate": "1",
    },
  });
};

async function commit_wform(
  user: UserV2,
  sesssion: Stored,
  doc_eid_param: string | null
): Promise<(UserV2 & { commit: string }) | null> {
  if (!doc_eid_param) return null;

  const res = await cognito.update_user_attributes(
    [{ Name: "custom:w_form", Value: doc_eid_param }],
    user.token_access
  );
  if (is_error(res)) {
    console.error("Error updating user attributes:", res.message);
    return null;
  }
  const commitment = await cognito.refresh(sesssion);
  if (is_error(commitment)) {
    console.error("Error refreshing session:", commitment.message);
    return null;
  }

  return commitment;
}
