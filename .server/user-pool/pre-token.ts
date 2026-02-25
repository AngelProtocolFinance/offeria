import { UserDb } from "@/user";
import type { PreTokenGenerationTriggerHandler } from "aws-lambda";
import { Resource } from "sst";
import { nvs } from "../env";

const userdb = new UserDb(Resource["tbl-users"].name, nvs.app.env);
export const handler: PreTokenGenerationTriggerHandler = async (event) => {
  try {
    // Received data from Cognito trigger
    const { email } = event.request.userAttributes;

    const claims: { [index: string]: string } = {};

    const res = await Promise.allSettled([
      userdb.user_npos(email),
      userdb.user_funds(email),
    ]);

    if (res.every((r) => r.status === "rejected")) return event;

    const [npos, funds] = res;
    console.info(npos);
    if (npos.status === "fulfilled" && npos.value.length > 0) {
      claims.npos = npos.value.map((n) => n.id).join(",");
    }
    if (funds.status === "fulfilled" && funds.value.length > 0) {
      claims.funds = funds.value.join(",");
    }

    if (Object.values(claims).length === 0) return event;

    event.response = {
      claimsOverrideDetails: { claimsToAddOrOverride: claims },
    };
    return event;
  } catch (err) {
    console.error(err);
  }
};
