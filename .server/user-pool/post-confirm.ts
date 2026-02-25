import { type IUserDb, UserDb } from "@/user";
import {
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { customAlphabet } from "nanoid";
import { Resource } from "sst";
import { nvs, nvs_shared } from "../env";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const nanoid = customAlphabet(alphabet, 8);
const referral_id_fn = (): string => {
  const rawId = nanoid();
  return `${rawId.slice(0, 4)}-${rawId.slice(4)}`;
};

//TODO: remove after user-db v2
const cognito = new CognitoIdentityProviderClient({
  region: nvs_shared.aws.region,
});
const userdb = new UserDb(Resource["tbl-users"].name, nvs.app.env);

export const handler: PostConfirmationTriggerHandler = async (event) => {
  try {
    const client_id = event.callerContext.clientId;
    const user_pool_id = event.userPoolId;
    const username = event.userName;

    const {
      email,
      family_name,
      given_name,
      "custom:referral_id": existing_referral_id,
    } = event.request.userAttributes;

    let referral_id = existing_referral_id;

    //TODO: remove after user-db v2
    // If referral_id doesn't exist, generate and save to Cognito
    if (!referral_id) {
      referral_id = referral_id_fn();
      const cmd = new AdminUpdateUserAttributesCommand({
        UserPoolId: user_pool_id,
        Username: username,
        UserAttributes: [{ Name: "custom:referral_id", Value: referral_id }],
      });

      await cognito.send(cmd);
      console.info(
        `Generated and saved referral_id: ${referral_id} for ${username}`
      );
    }

    // Build user record for DynamoDB
    const signup_date = new Date().toISOString();

    const record: Partial<IUserDb> = {
      clientID: client_id,
      familyName: family_name,
      givenName: given_name,
      signupDate: signup_date,
    };

    await userdb.user_update(email, record);
    console.info(
      `User ${email} updated in DynamoDB with referralID: ${referral_id}`
    );

    return event;
  } catch (err) {
    console.error("PostConfirmation error:", err);
    throw err;
  }
};
