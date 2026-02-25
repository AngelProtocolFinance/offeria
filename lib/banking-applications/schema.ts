import * as v from "valibot";
import { $, $req, file_obj, int_gte1 } from "../schemas";
export const statuses = ["under-review", "approved", "rejected"] as const;

export const priority_nums = {
  approved: 2,
  pending: 1,
  rejected: 0,
};

export const status = v.picklist(statuses);
export type TStatus = v.InferOutput<typeof status>;

export const update = v.pipe(
  v.object({
    type: v.picklist([statuses[1], statuses[2], "prioritize"]),
    reason: v.optional($),
  }),
  v.forward(
    v.partialCheck(
      [["type"], ["reason"]],
      (input) => (input.type === "rejected" ? !!input.reason : true),
      "required"
    ),
    ["reason"]
  )
);

export const new_bank = v.object({
  wiseRecipientID: $req,
  endowmentID: int_gte1,
  bankSummary: v.pipe($req, v.minLength(7)), // currency (3) + account number(last 4 digits)
  bankStatementFile: file_obj,
});

export interface IUpdate extends v.InferOutput<typeof update> {}
export interface INewBank extends v.InferOutput<typeof new_bank> {}

export interface IApplication extends INewBank {
  /** may be empty */
  rejectionReason: string;
}
