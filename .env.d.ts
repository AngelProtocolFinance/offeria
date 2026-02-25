/**
 * default - special dev stage that deploys resources shared by all dev stages
 */
// biome-ignore lint: ambient type
type TStage = "production" | "default" | (string & {});

/// augment vite environment variables
interface IEnvClientShared {
  VITE_SENTRY_DSN: string;
}

interface IEnvClient {
  VITE_BASE_URL: string;
  VITE_BG_NPO_ID: `${number}`;
  VITE_CHARIOT_CONNECT_ID: string;
  VITE_ENVIRONMENT: "dev" | "production";
  VITE_PAYPAL_CLIENT_ID: string;
  VITE_STRIPE_PK: string;
}
interface ImportMetaEnv extends IEnvClient, IEnvClientShared {}
// biome-ignore lint: ambient type
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
/// augment vite environment variables

// biome-ignore lint: ambient type
interface IEnvShared {
  client: IEnvClientShared;
  app: {
    api_encryption_key: string;
    session_secret: string;
    cookie_secret: string;
  };
  ai_gateway: { api_key: string };
  aws: { region: string };
  coingecko: { api_key: string };
  crypto: {
    deposit_addr: { eth: string; evm: string; hbar: string; reef: string };
  };
  discord: {
    webbhook_url: {
      aws_monitor: string;
      fiat_monitor: string;
      bg_sales: string;
    };
  };
  finnhub: { api_key: string };
  gemini: { api_key: string };
  hubspot: {
    access_token: string;
    forms_api: string;
    portal_id: string;
    subs_form_id: string;
    owner_id: string;
    deal_stage_id: string;
  };
  mongodb: { url: string };
  openexchange: { app_id: string };
  antropic: { api_key: string };
}

// biome-ignore lint: ambient type
interface IEnv {
  client: IEnvClient;
  app: {
    env: "staging" | "production";
    npo_id: number;
    npo_id_tip: number;
  };
  anvil: {
    api_key: string;
    fsa_template_id: string;
    org_slug: string;
    webhook_token: string;
  };
  chariot: {
    api_key: string;
    api_url: string;
    signing_key: string;
  };
  aws: {
    cognito: {
      client_id: string;
      domain: string;
      endpoint: string;
      user_pool_id: string;
    };
    dynamo: {
      table_name: string;
    };
  };
  nowpayments: { api_key: string; api_url: string; ipn_secret: string };
  paypal: {
    client_id: string;
    api_url: string;
    client_secret: string;
    product_id: string;
    webhook_id: string;
    /** e.g. USD, P-1231.. */
    plans: Record<string, string>;
    /** e.g. USD, P-1231.. */
    plans_monthly: Record<string, string>;
    /** e.g. USD, P-1231.. */
    plans_weekly: Record<string, string>;
    plans_annual: Record<string, string>;
  };
  stripe: {
    secret_key: string;
    subs_product_id: string;
    webhook_secret: string;
  };
  wise: {
    api_token: string;
    api_url: string;
    profile_id: string;
    balance_id_usd: string;
  };
  google: {
    client_id: string;
    client_secret: string;
  };
}
