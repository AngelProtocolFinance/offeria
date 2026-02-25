import type { update_org_fv } from "@/reg/schema";
import type { InferOutput } from "valibot";
export { update_org_fv as schema } from "@/reg/schema";

export interface FV extends InferOutput<typeof update_org_fv> {}
