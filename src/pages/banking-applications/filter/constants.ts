import type { TStatus } from "@/banking-applications";

export const status: Record<TStatus, string> = {
  rejected: "Rejected",
  "under-review": "Under Review",
  approved: "Approved",
};
