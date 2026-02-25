import { Buffer } from "node:buffer";
import { nvs } from "$/env";
import { cognito_client } from "$/kit/cognito";
import {
  type CognitoIdentityProviderClient,
  CognitoIdentityProviderServiceException,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  GlobalSignOutCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
  UpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { decodeJwt } from "jose";
import { referral_id } from "#/helpers/referral";
import type { AuthError, UserV2 } from "#/types/auth";
import { type Stored, commitSession, getSession } from "./session";

interface CognitoConfig {
  client_id: string;
}

interface OAuthConfig {
  client_id: string;
  domain: string;
}

interface OauthTokenRes {
  id_token: string;
  access_token: string;
  /** both access and id tokens, in seconds */
  expires_in: number;
  /** expires depending in user pool client config */
  refresh_token: string;
  token_type: string;
}

/** null: no user, string (expired): cookie to set */
type Auth = {
  user: UserV2 | undefined;
  /** include in response when !user */
  headers?: Headers;
  session: Stored;
};

export interface RefreshedUser extends UserV2 {
  commit: string;
}

class Cognito {
  private config: CognitoConfig;
  private client: CognitoIdentityProviderClient;

  constructor(config: CognitoConfig, client: CognitoIdentityProviderClient) {
    this.config = config;
    this.client = client;
  }

  private to_auth_error = (err: unknown): AuthError => {
    console.error("cognito error:", err);
    if (err instanceof CognitoIdentityProviderServiceException) {
      return {
        __type: err.name,
        message: err.message,
      };
    }
    return {
      __type: "UnknownError",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  };

  private is_err(v: unknown): v is AuthError {
    return !!v && typeof v === "object" && "__type" in v;
  }

  private to_user(
    token_id: string,
    token_access: string,
    token_refresh: string
  ): UserV2 {
    // IMPORTANT: these keys must match the "claimsToAddOrOverride" in cognito pre token trigger
    const {
      npos = "",
      funds = "",
      "cognito:groups": groups = [],
      ...p
    }: any = decodeJwt(token_id);

    return {
      token_id,
      token_access,
      token_refresh,
      groups,
      endowments: npos.split(",").map(Number) ?? [],
      funds: funds.split(",") ?? [],
      email: p.email,
      first_name: p.given_name,
      last_name: p.family_name,
      avatar: p["custom:avatar"],
      currency: p["custom:currency"],
      referral_id: p["custom:referral_id"],
      pay_id: p["custom:pay_id"],
      pay_min: p["custom:pay_min"],
      stripe_customer_id: p["custom:stripe_customer_id"],
      w_form: p["custom:w_form"],
    };
  }

  private unset(session: Stored) {
    session.unset("token_refresh");
  }

  /** request or cookie header */
  async retrieve(request: Request | string | null): Promise<Auth> {
    const cookie_header =
      typeof request === "string" || !request
        ? request
        : request.headers.get("cookie");

    const session = await getSession(cookie_header);
    const token_refresh = session.get("token_refresh");
    const h = new Headers();

    if (!token_refresh) return { user: undefined, session, headers: h };

    const cmd = new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: this.config.client_id,
      AuthParameters: { REFRESH_TOKEN: token_refresh },
    });
    const result = await this.client.send(cmd).catch((e) => {
      console.error("cognito retrieve:", e);
      return null;
    });

    if (!result) {
      // refresh token expired/invalid - clear session
      this.unset(session);
      h.append("set-cookie", await commitSession(session));
      return { user: undefined, headers: h, session };
    }

    const r = result.AuthenticationResult!;
    return {
      user: this.to_user(r.IdToken!, r.AccessToken!, token_refresh),
      session,
      headers: h,
    };
  }

  async initiate(
    username: string,
    password: string,
    cookie_header: string | null
  ) {
    const cmd = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: this.config.client_id,
      AuthParameters: { USERNAME: username, PASSWORD: password },
    });
    const result = await this.client.send(cmd).catch(this.to_auth_error);

    if (this.is_err(result))
      return result as AuthError<"UserNotConfirmedException">;

    const session = await getSession(cookie_header);
    session.set("token_refresh", result.AuthenticationResult!.RefreshToken!);
    return commitSession(session);
  }

  async refresh(session: Stored) {
    const token_refresh = session.get("token_refresh");
    if (!token_refresh) {
      return {
        __type: "InvalidSession",
        message: "No refresh token",
      } as AuthError;
    }

    const cmd = new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: this.config.client_id,
      AuthParameters: { REFRESH_TOKEN: token_refresh },
    });
    const result = await this.client.send(cmd).catch(this.to_auth_error);

    if (this.is_err(result)) return result;

    const r = result.AuthenticationResult!;
    const refreshed: RefreshedUser = {
      ...this.to_user(r.IdToken!, r.AccessToken!, token_refresh),
      commit: await commitSession(session),
    };
    return refreshed;
  }

  async signup(
    username: string,
    password: string,
    attributes: {
      firstName: string;
      lastName: string;
      "custom:user-type": string;
    }
  ): Promise<string | AuthError> {
    const ref_id = referral_id();
    const cmd = new SignUpCommand({
      ClientId: this.config.client_id,
      Username: username,
      Password: password,
      UserAttributes: [
        { Name: "family_name", Value: attributes.lastName },
        { Name: "given_name", Value: attributes.firstName },
        { Name: "email", Value: username },
        { Name: "custom:referral_id", Value: ref_id },
        { Name: "preferred_username", Value: ref_id },
      ],
    });
    const result = await this.client.send(cmd).catch(this.to_auth_error);

    if (this.is_err(result)) return result;
    return result.CodeDeliveryDetails?.Destination ?? "";
  }

  signup_confirm(
    username: string,
    code: string
  ): Promise<"success" | AuthError> {
    const cmd = new ConfirmSignUpCommand({
      ClientId: this.config.client_id,
      Username: username,
      ConfirmationCode: code,
    });
    return this.client
      .send(cmd)
      .then(() => "success" as const)
      .catch(this.to_auth_error);
  }

  async resend_confirmation_code(
    username: string
  ): Promise<"success" | AuthError> {
    const cmd = new ResendConfirmationCodeCommand({
      ClientId: this.config.client_id,
      Username: username,
    });
    return this.client
      .send(cmd)
      .then(() => "success" as const)
      .catch(this.to_auth_error);
  }

  async forgot_password(username: string): Promise<string | AuthError> {
    const cmd = new ForgotPasswordCommand({
      ClientId: this.config.client_id,
      Username: username,
    });
    const result = await this.client.send(cmd).catch(this.to_auth_error);

    if (this.is_err(result)) return result;
    return result.CodeDeliveryDetails?.Destination ?? "";
  }

  async forgot_password_confirm(
    username: string,
    new_password: string,
    code: string
  ): Promise<"success" | AuthError> {
    const cmd = new ConfirmForgotPasswordCommand({
      ClientId: this.config.client_id,
      Username: username,
      Password: new_password,
      ConfirmationCode: code,
    });
    return this.client
      .send(cmd)
      .then(() => "success" as const)
      .catch(this.to_auth_error);
  }

  async sign_out(session: Stored): Promise<string | AuthError> {
    const token_refresh = session.get("token_refresh");
    if (!token_refresh) {
      this.unset(session);
      return commitSession(session);
    }

    const refresh_cmd = new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: this.config.client_id,
      AuthParameters: { REFRESH_TOKEN: token_refresh },
    });
    const refresh_result = await this.client.send(refresh_cmd).catch((e) => {
      console.error("cognito sign_out refresh:", e);
      return null;
    });

    const access_token = refresh_result?.AuthenticationResult?.AccessToken;
    if (access_token) {
      const sign_out_cmd = new GlobalSignOutCommand({
        AccessToken: access_token,
      });
      await this.client.send(sign_out_cmd).catch((e) => {
        console.error("cognito global_sign_out:", e);
        return null;
      });
    }

    this.unset(session);
    return commitSession(session);
  }

  async update_user_attributes(
    attributes: { Name: string; Value: string }[],
    access_token: string
  ): Promise<"success" | AuthError> {
    const cmd = new UpdateUserAttributesCommand({
      AccessToken: access_token,
      UserAttributes: attributes,
    });
    return this.client
      .send(cmd)
      .then(() => "success" as const)
      .catch(this.to_auth_error);
  }
}

class OAuth {
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  initiate_url(state: string, base_url: string) {
    const scopes = [
      "email",
      "openid",
      "profile",
      "aws.cognito.signin.user.admin",
    ];

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.client_id,
      redirect_uri: `${base_url}/`,
      identity_provider: "Google",
      state: Buffer.from(state).toString("base64"),
      scope: scopes.join(" "),
    });

    return `${this.config.domain}/oauth2/authorize?${params.toString()}`;
  }

  async exchange(code: string, base_url: string, cookie_header: string | null) {
    const res = await fetch(`${this.config.domain}/oauth2/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.config.client_id,
        code,
        redirect_uri: `${base_url}/`,
      }),
    });

    if (!res.ok) {
      console.error(await res.text());
      return null;
    }
    const data: OauthTokenRes = await res.json();
    const session = await getSession(cookie_header);
    session.set("token_refresh", data.refresh_token);
    return commitSession(session);
  }
}

export const oauth = new OAuth({
  client_id: nvs.aws.cognito.client_id,
  domain: nvs.aws.cognito.domain,
});

export const cognito = new Cognito(
  { client_id: nvs.aws.cognito.client_id },
  cognito_client
);
