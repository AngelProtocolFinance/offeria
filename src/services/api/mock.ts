import type { IDonationIntent, IStripeIntentReturn } from "@/donations";
import { http, HttpResponse } from "msw";
import { href } from "react-router";
import type { ITokenEstimate } from "#/types/api";
import type { Payment } from "#/types/crypto";

const don_intent_path = href("/api/donation-intents");
export const don_intents_error_handler = http.post(don_intent_path, () =>
  HttpResponse.error()
);

export const handlers = [
  // mock stripe intent creation
  http.post(don_intent_path, async (x) => {
    const intent = await x.request.json().then((x) => x as IDonationIntent);

    if (intent.via === "stripe") {
      return HttpResponse.json({
        client_secret: "fake_intent_id",
        order_id: "fake_order_id",
      } satisfies IStripeIntentReturn);
    }
    if (intent.via === "crypto") {
      return HttpResponse.json({
        id: 123,
        address: "fake_address",
        amount: 1,
        usdpu: 1,
        description: "donation ",
        currency: "BTC",
        order_id: "fake_order_id",
      } satisfies Payment);
    }
  }),
  http.get(href("/api/tickers"), () => {
    return HttpResponse.json([
      { symbol: "AAPL", name: "Apple Inc.", amount: "", min: 0, usdpu: 1 },
    ]);
  }),
  http.get(href("/api/tokens"), () => {
    return HttpResponse.json([
      {
        id: "1",
        code: "BTC",
        symbol: "BTC",
        name: "Bitcoin",
        network: "btc",
        logo: "",
        color: "#f7931a",
        precision: 8,
        cg_id: "bitcoin",
        amount: "",
        min: 0,
        usdpu: 1,
      },
    ]);
  }),
  http.get(href("/api/tokens/:code/estimate", { code: ":code" }), () => {
    return HttpResponse.json({ min: 1, usdpu: 1 } satisfies ITokenEstimate);
  }),
  http.get(href("/api/tickers/:symbol/estimate", { symbol: ":symbol" }), () => {
    return HttpResponse.json({ min: 1, usdpu: 1 } satisfies ITokenEstimate);
  }),
];
