import {
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { UserMigrationTriggerHandler } from "aws-lambda";
import { cognito_client } from "../kit/cognito";

const OLD_POOL_ID = "us-east-1_ukOlQeQIM";
const OLD_CLIENT_ID = "1btvr3blkcln99jq8bg2b427cv";

const custom_attrs = [
  "custom:currency",
  "custom:avatar",
  "custom:user-tyoe",
  "custom:referral_id",
  "custom:pay_id",
  "custom:pay_min",
  "custom:stripe_customer_id",
] as const;

const standard_attrs = [
  "email",
  "email_verified",
  "given_name",
  "family_name",
] as const;

async function get_user_attrs(username: string) {
  const { UserAttributes = [] } = await cognito_client.send(
    new AdminGetUserCommand({ UserPoolId: OLD_POOL_ID, Username: username })
  );

  const attrs: Record<string, string> = {};
  for (const { Name, Value } of UserAttributes) {
    if (!Name || !Value) continue;
    if (
      (standard_attrs as readonly string[]).includes(Name) ||
      (custom_attrs as readonly string[]).includes(Name)
    ) {
      attrs[Name] = Value;
    }
  }
  return attrs;
}

export const handler: UserMigrationTriggerHandler = async (event) => {
  const username = event.userName;
  const password = event.request.password;

  try {
    if (event.triggerSource === "UserMigration_Authentication") {
      // authenticate against old pool
      await cognito_client.send(
        new AdminInitiateAuthCommand({
          UserPoolId: OLD_POOL_ID,
          ClientId: OLD_CLIENT_ID,
          AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
          AuthParameters: { USERNAME: username, PASSWORD: password },
        })
      );

      const attrs = await get_user_attrs(username);
      attrs.email_verified = "true";
      event.response.userAttributes = attrs;
      event.response.finalUserStatus = "CONFIRMED";
      event.response.messageAction = "SUPPRESS";
    }

    if (event.triggerSource === "UserMigration_ForgotPassword") {
      const attrs = await get_user_attrs(username);
      attrs.email_verified = "true";
      event.response.userAttributes = attrs;
      event.response.finalUserStatus = "RESET_REQUIRED";
      event.response.messageAction = "SUPPRESS";
    }

    return event;
  } catch (err) {
    console.error("UserMigration error:", err);
    throw err;
  }
};
