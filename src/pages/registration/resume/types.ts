import { reg_id } from "@/reg/schema";
import { $req } from "@/schemas";
import { type InferOutput, object, pipe } from "valibot";

export const schema = object({ reference: pipe($req, reg_id) });

export interface FV extends InferOutput<typeof schema> {}
