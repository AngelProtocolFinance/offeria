import type { INpo } from "@/endowment";
import type { UserV2 } from "#/types/auth";

export interface LoaderData {
  id: number;
  user: UserV2;
  endow: Pick<INpo, "logo" | "name" | "allocation" | "payout_minimum">;
}
