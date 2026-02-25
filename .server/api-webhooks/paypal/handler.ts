import type { IDonationSettled, IDonationUpdate } from "@/donations";
import { to_full } from "@/helpers/name";
import type { ISub, TInterval } from "@/subscriptions";
import type {
  Capture,
  Order,
  Sale,
  Subs,
  WebhookEvent,
} from "@better-giving/paypal";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getUnixTime } from "date-fns";
import { paypal } from "../../kit/paypal";
import { to_q_don_settled, to_q_don_success } from "../../queues/helpers";
import { don2db } from "../../tables/donations";
import { subsdb } from "../../tables/subscriptions";
import { resp } from "../resp";
import { verified_body } from "./helpers";

type TIntervalFrom = "DAY" | "WEEK" | "MONTH" | "YEAR";
const to_interval = (from: TIntervalFrom): TInterval => {
  switch (from) {
    case "DAY":
      return "day";
    case "WEEK":
      return "week";
    case "MONTH":
      return "month";
    case "YEAR":
      return "year";
  }
};

interface IAddress {
  address_line_1?: string;
  address_line_2?: string;
  admin_area_1?: string;
  admin_area_2?: string;
  postal_code?: string;
  country_code: string;
}
interface IName {
  given_name?: string;
  surname?: string;
}

interface ISettlement {
  net: number;
  fee: number;
  c: string;
}

const donor_update = (
  email: string,
  name: IName | undefined,
  address?: IAddress | undefined
): IDonationUpdate => {
  const {
    address_line_1: l1,
    address_line_2: l2,
    admin_area_1: state,
    admin_area_2: city,
    postal_code: zip,
    country_code: country,
  } = address || {};

  const update: IDonationUpdate = {};

  const fn = [name?.given_name, name?.surname].filter(Boolean).join(" ") || "";
  const str = [l1, l2].filter(Boolean).join(" ") || "";
  if (email) update.from_email = email;
  if (fn) update.from_name = to_full(name?.given_name, name?.surname);
  if (str) update.from_addr_street = str;
  if (city) update.from_addr_city = city;
  if (state) update.from_addr_state = state;
  if (zip) update.from_addr_zip_code = zip;
  if (country) update.from_addr_country = country;
  return update;
};

export const index: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = event.body ?? "";
    const jsonstr = await verified_body(body, event.headers);
    if (typeof jsonstr !== "string") return jsonstr;

    const ev: WebhookEvent = JSON.parse(jsonstr);

    console.info("[paypal webhook] received:", JSON.stringify(ev, null, 2));

    switch (ev.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        const {
          id: subs_id,
          subscriber,
          custom_id: don_id,
          create_time = new Date().toISOString(),
          update_time = new Date().toISOString(),
          ...s
        } = ev.resource as Subs;

        if (!s.plan_id) return resp.status(400, "missing subscription plan id");
        const plan = await paypal.get_plan(s.plan_id);
        if (!plan) return resp.status(400, "plan not found");

        const cycle = plan.billing_cycles?.[0];
        if (!cycle) {
          return resp.status(400, "missing plan billing cycle");
        }

        const interval = cycle.frequency?.interval_unit;
        const interval_count = cycle.frequency?.interval_count || 1;
        if (!interval) {
          return resp.status(400, "missing plan frequency interval unit");
        }
        const next_billing = s.billing_info?.next_billing_time;
        if (!next_billing) {
          return resp.status(400, "missing next billing time");
        }
        if (!s.quantity) return resp.status(400, "missing subscription qty");
        if (!plan.product_id)
          return resp.status(400, "missing plan product id");

        if (!don_id) return resp.status(400, "missing don id");
        const don = await don2db.get(don_id);
        if (!don) return resp.status(400, "don record not found");

        //create subs record
        if (!subscriber?.email_address)
          return resp.status(400, "missing subscriber email");

        const donor = donor_update(
          subscriber.email_address,
          subscriber.name,
          subscriber.shipping_address?.address
        );

        // update onholddb with donor info
        const updated_don = await don2db.update(don_id, donor);
        console.info("don donor info updated:", updated_don);

        if (!subs_id) return resp.status(400, "missing subscription id");

        const total =
          don.amount.base + don.amount.tip + don.amount.fee_allowance;
        const total_usd = total / don.upusd;
        const subs_db: ISub = {
          id: subs_id,
          created_at: getUnixTime(new Date(create_time)),
          updated_at: getUnixTime(new Date(update_time)),
          interval: to_interval(interval),
          interval_count,
          next_billing: getUnixTime(new Date(next_billing)),
          amount: total,
          amount_usd: total_usd,
          currency: don.currency,
          product_id: plan.product_id,
          to_id: don.to_id,
          to_type: don.to_type,
          to_name: don.to_name,
          platform: "paypal",
          status: "active",
          env: don.env,
          from_id: updated_don.from_email,
        };

        await subsdb.put(subs_db);
        return resp.status(200, `created subscription record ${subs_id}`);
      }
      case "CHECKOUT.ORDER.APPROVED": {
        const {
          id: order_id,
          payment_source,
          purchase_units,
        } = ev.resource as Order;

        if (!order_id) return resp.status(400, "missing order id");

        const ps = payment_source?.venmo || payment_source?.paypal;

        /** we only expect paypal and venmo */
        if (!ps) return resp.status(400, "paypal and venmo not found");
        if (!ps.email_address)
          return resp.status(400, "missing payer email address");
        const donor = donor_update(ps.email_address, ps.name, ps.address);

        const don_id = purchase_units?.[0]?.custom_id;
        if (!don_id) {
          return resp.status(400, `missing onhold id for order: ${order_id}`);
        }
        await don2db.update(don_id, donor);

        return resp.status(200, "updated onhold donor info");
      }
      case "PAYMENT.CAPTURE.COMPLETED": {
        const {
          id: cid,
          create_time: create_date = new Date().toISOString(),
          custom_id: don_id,
          seller_receivable_breakdown: b,
          supplementary_data,
        } = ev.resource as Capture;
        if (!cid) return resp.status(400, "missing capture id");

        if (!b || !b.net_amount || !b.paypal_fee) {
          return resp.status(400, `missing breakdown for capture ${cid}`);
        }

        const settled = ((r): ISettlement => {
          const n = b.net_amount.value;
          const p = b.paypal_fee.value;
          const c = b.net_amount.currency_code;
          if (r) {
            return { net: +n * +r, fee: +p * +r, c };
          }
          return { net: +n, fee: +p, c };
        })(b.exchange_rate?.value);

        if (!don_id)
          return resp.status(400, `missing onhold id for capture: ${cid}`);

        // fetch order to get real payer email before settling
        const order_id = supplementary_data?.related_ids?.order_id;
        if (order_id) {
          try {
            const order = await paypal.get_order(order_id);
            const ps =
              order.payment_source?.venmo || order.payment_source?.paypal;
            if (ps?.email_address) {
              const donor = donor_update(ps.email_address, ps.name, ps.address);
              await don2db.update(don_id, donor);
            }
          } catch (err) {
            console.error("failed to fetch order for donor update:", err);
          }
        }

        const sttl_record = {
          id: cid,
          date: create_date,
          currency: "USD",
          fee: settled.fee,
          net: settled.net,
        } as const;

        const payload = await don2db.update(don_id, {
          status: "settled",
          settlement: sttl_record,
        });

        const msg_id_1 = await to_q_don_settled(payload);
        const msg_id_2 = await to_q_don_success(payload);

        console.info(`Final donation record sent:${msg_id_1}, ${msg_id_2}`);
        return resp.json({ msg_id_1, msg_id_2 });
      }
      case "PAYMENT.SALE.COMPLETED": {
        const {
          id: sale_id,
          create_time: create_date = new Date().toISOString(),
          billing_agreement_id: subs_id,
          transaction_fee,
          receivable_amount,
          amount: sale_amount,
          exchange_rate: rate, // unit per usd
        } = ev.resource as Sale;
        if (!sale_id) return resp.status(400, "missing sale id");

        const tf = transaction_fee?.value;
        // receivable_amount only present on currency conversions
        const net =
          receivable_amount?.value ??
          (sale_amount?.total && tf
            ? String(+sale_amount.total - +tf)
            : undefined);
        const c = receivable_amount?.currency ?? sale_amount?.currency;

        if (!net || !tf || !c)
          return resp.status(400, `missing amounts for sale: ${sale_id}`);

        const settled: ISettlement = {
          net: +net,
          fee: rate ? +tf * +rate : +tf,
          c: c,
        };

        if (!subs_id) return resp.status(400, "missing billing agreement id");
        const sub = await paypal.get_subscription(subs_id);
        if (!sub) return resp.status(400, "subscription not found");
        if (!sub.subscriber) return resp.status(400, "missing subscriber info");
        if (!sub.custom_id) return resp.status(400, "missing onhold id");
        const { email_address: email, shipping_address, name } = sub.subscriber;
        if (!email) return resp.status(400, "missing subscriber email");

        const donor = donor_update(email, name, shipping_address?.address);
        const don = await don2db.update(sub.custom_id, {
          ...donor,
        });
        const sttl_record = {
          id: sale_id,
          date: create_date,
          currency: c,
          fee: settled.fee,
          net: settled.net,
        } as const;

        const p = don.settlement
          ? // if previously settled, create a new record with sale_id, and sttl_record
            ({
              ...don,
              id: sale_id,
              created_at: create_date,
              settlement: sttl_record,
            } satisfies IDonationSettled)
          : await don2db.update(sub.custom_id, {
              status: "settled",
              settlement: sttl_record,
            });

        const msg_id_1 = await to_q_don_settled(p);
        const msg_id_2 = await to_q_don_success(p);

        return resp.json({ msg_id_1, msg_id_2 });
      }
    }
    console.info(JSON.stringify(ev, null, 2));
    return resp.status(201, `event type not handled: ${ev.event_type}`);
  } catch (error) {
    console.error("[paypal webhook] error processing webhook:", error);
    return resp.status(500, "error processing webhook");
  }
};
