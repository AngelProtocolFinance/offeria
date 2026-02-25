const {
  VITE_ENVIRONMENT: env,
  VITE_STRIPE_PK: stripe_pk,
  VITE_PAYPAL_CLIENT_ID: paypal_client_id,
  VITE_CHARIOT_CONNECT_ID: chariot_connect_id,
} = import.meta.env;

// THE CONSTANTS BELOW ARE ALL CONFIGURED BY ENVIRONMENT VARIABLES
// AND DISPLAY THE DESIRED TEXT/IMAGES/URLS/ETC THROUGHOUT THE APP
export const APP_NAME = "Offeria";
export const SEO_IMAGE = "https://www.offeria.org/favicon.png";
export const EMAIL_SUPPORT = "support@offeria.org";
export const BASE_URL = `https://${env === "dev" ? "staging." : ""}offeria.org`;
export const DEV_DOCS_BASE_URL = "https://developer.offeria.org";
export const BOOK_A_DEMO =
  "https://meetings-eu1.hubspot.com/chauncey-st-john/better-giving-nonprofit-demo";
export const INTERCOM_HELP = "https://intercom.help/better-giving/en";
export const AWS_S3_PUBLIC_BUCKET = "https://endow-profiles.s3.amazonaws.com";

export { env, stripe_pk, paypal_client_id, chariot_connect_id };
