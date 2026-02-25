import { $int_gte1, segment } from "@/schemas";
import { parse, union } from "valibot";

export const npo_id = (id_or_slug: string) =>
  parse(union([segment, $int_gte1]), id_or_slug);
