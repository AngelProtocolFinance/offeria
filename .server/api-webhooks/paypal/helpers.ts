import crypto from "node:crypto";
import { crc32 } from "node:zlib";
import type { APIGatewayProxyResultV2 } from "aws-lambda";
import { nvs } from "../../env";
import { resp } from "../resp";

const cert_cache = new Map<string, string>();
async function download_and_cache_cert(cert_url: string): Promise<string> {
  if (cert_cache.has(cert_url)) return cert_cache.get(cert_url)!;
  const res = await fetch(cert_url);
  if (!res.ok) throw res;
  const cert = await res.text();
  cert_cache.set(cert_url, cert);
  return cert;
}

export async function verified_body(
  body: string,
  headers: Record<string, string | undefined>
): Promise<string | APIGatewayProxyResultV2> {
  try {
    const transmission_id = headers["paypal-transmission-id"];
    const timestamp = headers["paypal-transmission-time"];
    const cert_url = headers["paypal-cert-url"];
    const signature = headers["paypal-transmission-sig"];

    if (!transmission_id)
      return resp.status(201, "missing paypal-transmission-id");
    if (!timestamp) return resp.status(201, "missing paypal-transmission-time");
    if (!cert_url) return resp.status(201, "missing paypal-cert-url");
    if (!signature) return resp.status(201, "missing paypal-transmission-sig");

    const crc_body = crc32(body);
    const message = [
      transmission_id,
      timestamp,
      nvs.paypal.webhook_id,
      crc_body,
    ].join("|");

    const cert = await download_and_cache_cert(cert_url);
    const verifier = crypto.createVerify("SHA256");
    verifier.update(message);

    const signature_buffer = Buffer.from(signature, "base64");
    const is_valid = verifier.verify(cert, signature_buffer);
    if (!is_valid) return resp.status(201, "invalid signature");

    return body;
  } catch (error) {
    console.error(error);
    return resp.status(201, "signature verification error");
  }
}
