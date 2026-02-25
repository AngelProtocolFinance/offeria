import { nvs } from "$/env";
import { ses } from "$/kit/ses";
import { donordb } from "$/tables/donation-messages";
import { don2db } from "$/tables/donations";
import { userdb } from "$/tables/users";
import { Txs, dbc } from "@/db";
import type { IPublicDonor } from "@/donation";
import { is_paid } from "@/donations/helpers";
import { to_pretty_utc } from "@/helpers/date";
import { send_email, to_amount } from "@/helpers/email";
import { resp } from "@/helpers/https";
import { from_full } from "@/helpers/name";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
  donation_private_message as dpm,
  donation_tribute_notif as dtn,
} from "@better-giving/react-emails";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { href } from "react-router";
import { getValidatedFormData } from "remix-hook-form";
import { cognito, to_auth } from "#/.server/auth";
import {
  type IDonationIntentExpiries,
  donations_cookie,
} from "#/.server/cookie";
import type { ActionData } from "#/types/action";
import type { Route } from "./+types";
import { type Schema, schema } from "./schema";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const don = await don2db.get(params.id);
  if (!don) throw resp.status(404, "donation not found");

  const base_url = url.origin;
  const donate_thanks_path = href("/donations/:id", { id: params.id });
  const donate_path =
    don.to_type === "fund"
      ? href("/donate-fund/:fundId", { fundId: don.to_id })
      : href("/donate/:id", { id: don.to_id });
  const donate_url = `${base_url}${donate_path}`;
  const donate_thanks_url = `${base_url}${donate_thanks_path}`;
  const profile_path =
    don.to_type === "fund"
      ? href("/fundraisers/:fundId", { fundId: don.to_id })
      : href("/marketplace/:id", { id: don.to_id });
  const profile_url = `${base_url}${profile_path}`;

  return { ...don, donate_url, donate_thanks_url, profile_url };
};

export const action = async ({ request, params }: Route.ActionArgs) => {
  const fv = await getValidatedFormData<Schema>(
    request,
    valibotResolver(schema)
  );
  if (fv.errors) return fv;

  const { data: p } = fv;

  const don = await don2db.get(params.id);
  if (!don) throw resp.status(404, "donation not found");
  if (don.to_type === "fund") {
    throw resp.status(400, "cannot add tribute or messages to fund donations");
  }

  // prioritize cookie authentication over user authentication
  const expiry_per_intent = await donations_cookie
    .parse(request.headers.get("cookie"))
    .then<IDonationIntentExpiries>((x) => x || {});

  if (
    expiry_per_intent &&
    expiry_per_intent[params.id] &&
    expiry_per_intent[params.id] >= Date.now()
  ) {
    // cookie is valid, proceed without further auth checks
  } else {
    // fall back to user authentication
    const { user } = await cognito.retrieve(request);
    if (!user) return to_auth(request);
    if (user.email !== don.from_email) {
      throw resp.status(403, "not authorized");
    }
  }

  if (p.type === "tribute" && !don.tribute) {
    await don2db.update(don.id, { tribute: p });

    const amount_usd = don.amount.base / don.upusd;

    //send only if paid
    if (p.notif && is_paid(don.status)) {
      const data: dtn.IData = {
        to_name: don.to_name,
        in_honor_of: p.full_name,
        notif_to_full_name: p.notif.to_fullname,
        from: {
          first_name: from_full(don.from_name).fn ?? "Anonymous",
          full_name: don.from_name ?? "Anonymous",
        },
        from_msg: p.notif.from_msg,
        amount: to_amount(don.amount.base, amount_usd, don.currency),
      };
      const { node, subject } = dtn.template(data);

      await send_email(ses, { node, to: [p.notif.to_email], subject });
    }
    return { __ok: "Tribute added to donation." } satisfies ActionData;
  }

  if (p.type === "public_msg" && !don.from_public_msg_to_npo) {
    if (!is_paid(don.status)) {
      // only write to holding record, don't send email yet - it will be
      await don2db.update(don.id, { from_public_msg_to_npo: p.msg });
      return { __ok: "Your message is posted!" } satisfies ActionData;
    }

    const txs = new Txs();
    const tx1 = don2db.update_txi(don.id, { from_public_msg_to_npo: p.msg });
    txs.update(tx1);
    const d: IPublicDonor = {
      id: don.id,
      date: new Date().toISOString(),
      amount: don.amount.base,
      donation_id: don.id,
      donor_id: don.from_email,
      donor_message: p.msg,
      donor_name: don.from_name || "Anonymous",
      env: nvs.app.env,
      recipient_id: don.to_id,
    };
    const tx2 = donordb.put_txi(d);
    txs.put(tx2);
    const cmd = new TransactWriteCommand({
      TransactItems: txs.all,
    });
    const res = await dbc.send(cmd);
    console.info(res);
    return { __ok: "Your message is posted." } satisfies ActionData;
  }
  if (
    p.type === "private_msg" &&
    // hasn't sent one yet
    !don.from_private_msg_to_npo
  ) {
    await don2db.update(don.id, { from_private_msg_to_npo: p.msg });

    if (!is_paid(don.status)) {
      return { __ok: "Your private message is sent." } satisfies ActionData;
    }

    // send email to npo admins
    const adms = await userdb.npo_admins(+don.to_id);

    const data: dpm.IData = {
      id: don.id,
      amount: to_amount(
        don.amount.base,
        don.amount.base / don.upusd,
        don.currency
      ),
      date: to_pretty_utc(don.created_at),
      to_name: don.to_name,
      from: {
        first_name: from_full(don.from_name).fn || "Anonymous",
        full_name: don.from_name || "Anonymous",
      },
      message: p.msg,
    };
    const { node, subject } = dpm.template(data);

    const res = await send_email(ses, {
      node,
      subject,
      to: adms.map((a) => a.email),
    });

    console.info(res);
    return { __ok: "Your private message is sent." } satisfies ActionData;
  }
};
