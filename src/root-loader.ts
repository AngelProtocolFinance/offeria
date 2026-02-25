import { Buffer } from "node:buffer";
import { search } from "@/helpers/https";
import { addDays } from "date-fns";
import { type LoaderFunctionArgs, data, redirect } from "react-router";
import { oauth } from "#/.server/auth";
import { reg_cookie } from "#/.server/cookie";

// only sets cookie when value changes to allow Vercel CDN caching
async function append_referrer(
  referrer: string,
  cookie_header: string
): Promise<string | null> {
  const rc = await reg_cookie.parse(cookie_header).then((x) => x || {});

  // Already has this referrer
  if (rc.referrer === referrer) return null;

  // Has different unexpired referrer - keep the original
  if (rc.referrer && rc.referrer_expiry) {
    const expiry = new Date(rc.referrer_expiry);
    if (expiry > new Date()) return null;
  }

  // Set new referrer
  rc.referrer = referrer;
  rc.referrer_expiry = addDays(new Date(), 90).toISOString();
  return reg_cookie.serialize(rc);
}

// exchanges code for session, returns redirect response if successful
interface IOAuth {
  code: string;
  state: string;
  base_url: string;
  cookie_header: string;
  headers: (h: Headers) => Headers;
}
async function handle_oauth(i: IOAuth): Promise<Response | null> {
  const session = await oauth.exchange(i.code, i.base_url, i.cookie_header);
  if (!session) return null;

  const redirect_to = Buffer.from(i.state, "base64").toString();
  const h = new Headers();
  const headers = i.headers(h);
  headers.append("set-cookie", session);
  return redirect(redirect_to, { headers });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const { code, state, referrer } = search(url);
  const cookie_header = request.headers.get("cookie");

  const rc_promise =
    referrer && cookie_header
      ? append_referrer(referrer, cookie_header)
      : Promise.resolve(null);
  const rc = await rc_promise;

  if (code && state && cookie_header) {
    const res = await handle_oauth({
      code,
      state,
      cookie_header,
      base_url: url.origin,
      headers(h) {
        if (rc) h.set("set-cookie", rc);
        return h;
      },
    });
    if (res) return res;
    return redirect(url.toString());
  }

  const headers = rc ? new Headers({ "set-cookie": rc }) : undefined;
  return data(undefined, { headers });
};
