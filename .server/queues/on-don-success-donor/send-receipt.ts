import type { IDonation } from "@/donations";
import { to_pretty_utc } from "@/helpers/date";
import { send_email, to_amount } from "@/helpers/email";
import {
  type IDonation as IDon,
  type IDonor,
  donation_receipt,
} from "@better-giving/react-emails";
import { nanoid } from "nanoid";
import { nvs } from "../../env";
import { ses } from "../../kit/ses";
import { npodb } from "../../tables/endowments";

export const send_receipt = async (d: IDonation) => {
  const { base, tip } = d.amount;
  const receipt_id = d.via.startsWith("chariot") ? undefined : nanoid();
  const donor: IDonor = {
    first_name: d.from_name?.split(" ")[0] ?? "Donor",
    full_name: d.from_name ?? "Valued Donor",
    address: [
      d.from_addr_street,
      d.from_addr_city,
      d.from_addr_state,
      d.from_addr_zip_code,
      d.from_addr_country,
    ]
      .filter(Boolean)
      .join(", "),
  };

  if (tip > 0) {
    const amnt = to_amount(tip, tip / d.upusd, d.currency);
    const don: IDon = {
      id: d.id,
      date: to_pretty_utc(d.created_at),
      amount: amnt,
      to_name: "Better Giving",
    };
    const x: donation_receipt.IData = {
      ...don,
      tax_receipt_id: receipt_id,
      from: donor,
    };
    const { node, subject } = donation_receipt.template(x);
    const res = await send_email(ses, { node, subject, to: [d.from_email] });
    console.info("Sent tip receipt:", res.MessageId, x);
  }

  if (d.to_type === "fund") {
    const n = d.to_members.length;
    const amnt = to_amount(base / n, base / n / d.upusd, d.currency);
    const npos = await npodb.npos_get(d.to_members.map((x) => +x));
    for (const npo of npos) {
      const don: IDon = {
        id: d.id,
        date: to_pretty_utc(d.created_at),
        amount: amnt,
        to_name: npo.name,
      };
      const x: donation_receipt.IData = {
        ...don,
        is_bg: npo.id === nvs.app.npo_id,
        tax_receipt_id: receipt_id,
        to_msg_to_from: npo.receiptMsg,
        from: donor,
      };
      const { node, subject } = donation_receipt.template(x);
      const res = await send_email(ses, { node, subject, to: [d.from_email] });
      console.info("Sent receipt fund npo member:", res.MessageId, x);
    }
    return;
  }

  d.to_type satisfies "npo";
  const npo = await npodb.npo(+d.to_id, ["receiptMsg", "id"]);
  if (!npo) throw `NPO not found: ${d.to_id}`;
  const don: IDon = {
    id: d.id,
    date: to_pretty_utc(d.created_at),
    amount: to_amount(base, base / d.upusd, d.currency),
    to_name: d.to_name,
  };

  const x: donation_receipt.IData = {
    ...don,
    from: donor,
    is_bg: npo.id === nvs.app.npo_id,
    tax_receipt_id: receipt_id,
    to_msg_to_from: npo.receiptMsg,
  };
  const { node, subject } = donation_receipt.template(x);
  const res = await send_email(ses, { node, subject, to: [d.from_email] });
  console.info("Sent npo receipt:", res.MessageId, x);
};
