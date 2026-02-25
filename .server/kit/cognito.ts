import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
export { ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";

export const cognito_client = new CognitoIdentityProviderClient({});
