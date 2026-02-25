import { nvs_shared } from "$/env";
import { createCookie } from "react-router";
export const reg_cookie = createCookie("bg-registration", { path: "/" });
export const bg_session = createCookie("bg-session", {
  secrets: [nvs_shared.app.session_secret],
});

// give temporary donation access
export const donations_cookie = createCookie("donations", {
  path: "/",
  secrets: [nvs_shared.app.session_secret],
  secure: true,
  sameSite: "none",
});

/** Map of donation intent ID to expiry timestamp (milliseconds since epoch) */
export interface IDonationIntentExpiries extends Record<string, number> {}
