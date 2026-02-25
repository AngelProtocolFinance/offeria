import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { Resource } from "sst";
import { nvs } from "../env";

const userdb = new UserDb(Resource["tbl-users"].name, nvs.app.env);

export const handler: PostConfirmationTriggerHandler = async (event) => {
  try {
    const client_id = event.callerContext.clientId;

    const { email, family_name, given_name } = event.request.userAttributes;

    // Build user record for DynamoDB
    const signup_date = new Date().toISOString();

    const record: Partial<IUserDb> = {
      clientID: client_id,
      familyName: family_name,
      givenName: given_name,
      signupDate: signup_date,
    };

    await userdb.user_update(email, record);

    return event;
  } catch (err) {
    console.error("PostConfirmation error:", err);
    throw err;
  }
};
