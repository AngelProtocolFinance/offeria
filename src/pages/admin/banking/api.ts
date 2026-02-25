import { bappdb } from "$/tables/banking-applications";
import { new_bank as schema } from "@/banking-applications/schema";
import { type ActionFunction, redirect } from "react-router";
import * as v from "valibot";
import { routes } from "../routes";

export const action: ActionFunction = async (args) => {
  const payload = await args.request.json();
  const x = v.parse(schema, payload);

  await bappdb.bapp_put({ ...x, rejectionReason: "" });

  return redirect(`../${routes.banking}`);
};
