import crypto from "node:crypto";
import type { Alert } from "@/discord";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { nvs_shared } from "../../env";
import { coingecko } from "../../kit/coingecko";
import { aws_monitor } from "../../kit/discord";
import { resp } from "../resp";
import type { IPayload, IPriceByKey, TAlchemyChainId } from "./types";

const cg_platform_ids: { [key in TAlchemyChainId]: string } = {
  "eth-mainnet": "ethereum",
  "bnb-mainnet": "binance-smart-chain",
};

const chain_env_key: { [key in TAlchemyChainId]: string } = {
  "eth-mainnet": "eth",
  "bnb-mainnet": "bsc",
};

export const index: APIGatewayProxyHandlerV2 = async (event) => {
  const chain_id = event.pathParameters?.chain_id as TAlchemyChainId;
  const signing_key = event.pathParameters?.signing_key ?? "";

  const body = event.body ?? "";
  const sig = event.headers["x-alchemy-signature"];
  const hmac = crypto.createHmac("sha256", signing_key);
  hmac.update(body, "utf8");
  const digest = hmac.digest("hex");

  if (sig !== digest) return resp.status(200, "invalid signature");

  const p: IPayload = JSON.parse(body);
  console.info(JSON.stringify(p, null, 2));

  for (const activity of p.event.activity) {
    // we are only interested in receives
    const to = nvs_shared.deposit_addr_envs(chain_env_key[chain_id]);
    if (activity.toAddress !== to) {
      console.warn(`not a receive transaction, to: ${activity.toAddress}`);
      continue;
    }
    const contract = activity.rawContract.address?.toLowerCase();
    if (!contract) {
      console.warn("not a token transfer, skipping");
      continue;
    }

    // fetch usd_rate
    const platform = cg_platform_ids[chain_id];
    const cg_res = await coingecko((x) => {
      x.pathname = `api/v3/simple/token_price/${platform}?contract_addresses=${contract}&vs_currencies=usd`;
      return x;
    });

    if (!cg_res.ok) {
      console.error(`cg fetch failed: ${cg_res.statusText}`);
      continue;
    }

    const data: IPriceByKey = await cg_res.json();
    const usd_rate = data?.[contract]?.usd ?? 0;

    const usd_value = activity.value * usd_rate;
    const alert: Alert = {
      from: "alchemy-webhook",
      type: "NOTICE",
      title: `New ${chain_id} donation`,
      fields: [
        { name: "Asset", value: activity.asset, inline: true },
        { name: "Chain", value: chain_id, inline: true },
        { name: "From", value: activity.fromAddress },
        { name: "Amount", value: activity.value.toString(), inline: true },
        { name: "USD Value", value: usd_value.toFixed(2), inline: true },
        { name: "Hash", value: activity.hash },
      ],
    };
    console.info(JSON.stringify(alert, null, 2));

    const res = await aws_monitor.send_alert(alert);
    console.info("discord notif", res.status, res.statusText);
  }

  return resp.status(200, "ok");
};
