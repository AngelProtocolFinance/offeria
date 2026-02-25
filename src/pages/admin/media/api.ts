import { npodb } from "$/tables/endowments";
import { media_ksuid } from "@/endowment/schema";
// import { parseWithValibot } from "conform-to-valibot";
import { search } from "@/helpers/https";
import { $int_gte1 } from "@/schemas";
import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  type ActionFunction,
  type LoaderFunctionArgs,
  redirect,
} from "react-router";
import { getValidatedFormData } from "remix-hook-form";
import { parse } from "valibot";
import { admin_ctx } from "#/.server/auth";
import { type ISchema, schema } from "./schema";

export const featured_media = async ({ params }: LoaderFunctionArgs) => {
  const endowId = parse($int_gte1, params.id);
  return npodb.npo_media(endowId, { featured: true, type: "video", limit: 3 });
};
export const all_videos = async ({ request, params }: LoaderFunctionArgs) => {
  const { nextPageKey: next } = search(request);
  const endowId = parse($int_gte1, params.id);
  const page = await npodb.npo_media(endowId, {
    type: "video",
    limit: 5,
    next,
  });
  return page;
};

export const videos_action: ActionFunction = async (x) => {
  const id = x.context.get(admin_ctx);

  const fv = await x.request.formData();
  const intent = fv.get("intent") as "feature" | "delete";
  const featured = fv.get("featured") === "1";
  const mid = parse(media_ksuid, fv.get("mediaId"));

  const prev = await npodb.npo_med(id, mid);
  if (!prev) return { status: 404 };

  if (intent === "feature") {
    await npodb.npo_med_update(id, prev, {
      featured: !featured,
    });
    return { ok: true };
  }

  await npodb.npo_med_delete(id, prev.id);
  return { ok: true };
};

export const new_action: ActionFunction = async (x) => {
  const id = x.context.get(admin_ctx);

  const fv = await getValidatedFormData<ISchema>(
    x.request,
    valibotResolver(schema)
  );
  if (fv.errors) return fv;

  await npodb.npo_med_put(id, fv.data.url);

  return redirect("..");
};

export const edit_action: ActionFunction = async (x) => {
  const mid = parse(media_ksuid, x.params.mediaId);
  const id = x.context.get(admin_ctx);

  const fv = await getValidatedFormData<ISchema>(
    x.request,
    valibotResolver(schema)
  );
  if (fv.errors) return fv;

  const m = await npodb.npo_med(id, mid);
  if (!m) return { status: 404 };

  await npodb.npo_med_update(id, m, {
    url: fv.data.url,
  });

  return redirect("..");
};
