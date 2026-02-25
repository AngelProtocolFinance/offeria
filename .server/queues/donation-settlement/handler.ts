import { fees } from "@/constants";
import { default_allocation } from "@/constants/common";
import { Txs, dbc } from "@/db";
import type {
  IDonation,
  IDonationDist,
  IDonationSettled,
  IParent,
  IToSettings,
} from "@/donations";
import { amnt_sum, partition } from "@/donations/helpers";
import { resp } from "@/helpers/https";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { SQSBatchItemFailure, SQSHandler } from "aws-lambda";
import { ulid } from "ulid";
import { nvs } from "../../env";
import { donordb } from "../../tables/donation-messages";
import { don2db } from "../../tables/donations";
import { npodb } from "../../tables/endowments";
import { formsdb } from "../../tables/forms";
import { funddb } from "../../tables/funds";
import { referral_commission_rate } from "./config";
import {
  type IReferrerLtdItem,
  commission_fn,
  ltd_by_referrer,
  referrer_ltd_update_txi,
} from "./helpers";
import { dist_txs } from "./settle-txs";
import { credit_fa, debit_pcfs } from "./settle-txs/helpers";

const handle_record = async (b: IDonationSettled) => {
  try {
    const {
      id: parent_id,
      created_at: parent_created_at,
      amount: parent_amount,
      settlement: parent_settlement,
      to_id: parent_to_id,
      to_type: parent_to_type,
      to_name: parent_to_name,
      to_members: parent_to_members,
      to_tip_allowed: parent_to_tip_allowed,
      ...tx
    } = b;

    const total = amnt_sum(parent_amount);
    const total_usd = total / tx.upusd;

    // partition settlement amounts base on original partition of amount
    const parts = partition(parent_amount);
    const p_amnt = parts(total);
    const p_amnt_usd = parts(total_usd);
    /** in usd/usdc */
    const p_sttl_net = parts(parent_settlement.net);
    /** in usd/usdc */
    const p_sttl_fee = parts(parent_settlement.fee);

    // fee allowance is reprortioned based on original amount partition
    const p_fa = parts(p_amnt.fee_allowance);
    const p_fa_usd = parts(p_amnt_usd.fee_allowance);

    const form_tag = tx.source_id
      ? await formsdb.form_get(tx.source_id).then((f) => f?.tag)
      : undefined;

    const txs = new Txs();

    const [tip_fa_added, tip_fa_excess] = credit_fa(p_sttl_net.tip, {
      fa: p_fa_usd.tip,
      pf: p_sttl_fee.tip,
    });

    const [tip_net, tip_pcfs] = debit_pcfs(tip_fa_added, {
      base: parent_to_tip_allowed ? 0 : fees.base,
      fsa: 0,
    });
    const cf_from_tip = tip_net * referral_commission_rate;
    const tip_tos: string[] = [];

    /** donation to a fund */
    if (parent_to_type === "fund") {
      const n = parent_to_members.length;
      let fund_net = 0;
      const parent: IParent = {
        id: parent_id,
        to_id: parent_to_id,
        to_name: parent_to_name,
        to_members: parent_to_members,
      };
      const commission_ltds: IReferrerLtdItem[] = [];
      for (const member of parent_to_members) {
        const m = await npodb.npo(+member);
        if (!m) {
          console.error(`Endowment ${member} not found!`);
          continue;
        }

        const m_sttld = p_sttl_net.base / n;
        const m_fa_usd = p_fa_usd.base / n;
        const [base_fa_added, base_fa_excess] = credit_fa(m_sttld, {
          fa: m_fa_usd,
          pf: p_sttl_fee.base / n,
        });
        const [m_net, m_pcfs] = debit_pcfs(base_fa_added, {
          base: m.hide_bg_tip ? fees.base : 0,
          fsa: m.fiscal_sponsored ? fees.fiscal_sponsor : 0,
        });
        const cf_from_npo_pcfs =
          m_net * Object.values(m_pcfs).reduce((a, b) => a + b, 0);

        const m_settings: IToSettings = {
          fiscal_sponsored: m.fiscal_sponsored,
          alloc: m.allocation ?? default_allocation,
        };

        const m_dist: IDonationDist = {
          id: parent_settlement.id,
          gross: m_sttld,
          net: m_net,
          currency: parent_settlement.currency,
          fees: { ...m_pcfs, processing: p_sttl_fee.base / n },
          fee_allowance: m_fa_usd,
          fee_allowance_excess: base_fa_excess,
          parent,
          to_settings: m_settings,
        };

        const m_date = new Date();
        const m_id = ulid(m_date.getTime());
        const m_don_record: IDonation = {
          id: m_id,
          created_at: m_date.toISOString(),
          to_id: m.id.toString(),
          to_name: m.name,
          to_type: "npo",
          to_tip_allowed: m.hide_bg_tip ?? false,
          to_members: [],
          amount: {
            base: p_amnt.base / n,
            tip: 0,
            fee_allowance: p_amnt.fee_allowance / n,
          },
          dist: m_dist,
          ...tx,
        };
        // back-write npo-record
        txs.put(don2db.put_txi(m_don_record));

        // for fund members without referrer, commission remains with BG
        // BG is treated as the referrer for the NPO (organic)
        const c = commission_fn(
          { tip: cf_from_tip / n, fee: cf_from_npo_pcfs, id: parent_id },
          m
        );
        if (c) {
          const { record, ltd, ...ref } = c;
          m_dist.referrer = ref;
          txs.put(record);
          tip_tos.push(ltd.id);
          commission_ltds.push(ltd);
        }

        const m_dist_txs = await dist_txs(m_don_record, m_dist);
        txs.append(m_dist_txs);
        //use net as it reflects fee allowance add-back
        fund_net += base_fa_added;

        // creates single donation message record per fund member
        if (tx.from_public) {
          const r = donordb.record({
            id: m_id,
            donation_id: m_id,
            date: parent_settlement.date,
            donor_id: tx.from_email,
            donor_message: tx.from_public_msg_to_npo ?? "",
            donor_name: tx.from_name || "Anonymous",
            env: m.env,
            recipient_id: m.id.toString(),
            amount: total_usd / n,
          });
          txs.put(donordb.put_txi(r));
        }
      }
      //commit ltds per referrer
      for (const [r, i] of Object.entries(ltd_by_referrer(commission_ltds))) {
        txs.update(referrer_ltd_update_txi(r, i));
      }
      txs.update(funddb.fund_contrib_update_txi(parent_to_id, fund_net));

      // to single endowment
    } else {
      const npo = await npodb.npo(+parent_to_id);
      if (!npo) {
        console.error(`Endowment ${parent_to_id} not found!`);
        return;
      }

      const [base_fa_added, base_fa_excess] = credit_fa(p_sttl_net.base, {
        fa: p_fa_usd.base,
        pf: p_sttl_fee.base,
      });

      const [npo_net, npo_pcfs] = debit_pcfs(base_fa_added, {
        base: npo.hide_bg_tip ? fees.base : 0,
        fsa: npo.fiscal_sponsored ? fees.fiscal_sponsor : 0,
      });

      const cf_from_npo_pcfs =
        npo_net * Object.values(npo_pcfs).reduce((a, b) => a + b, 0);

      const npo_settings: IToSettings = {
        fiscal_sponsored: npo.fiscal_sponsored,
        alloc: npo.allocation ?? default_allocation,
      };

      const npo_dist: IDonationDist = {
        id: parent_settlement.id,
        gross: p_sttl_net.base,
        net: npo_net,
        currency: parent_settlement.currency,
        fees: { ...npo_pcfs, processing: p_sttl_fee.base },
        fee_allowance: p_fa_usd.base,
        fee_allowance_excess: base_fa_excess,
        to_settings: npo_settings,
        form_tag,
      };

      const npo_don_record: IDonation = {
        ...tx,
        id: parent_id,
        created_at: parent_settlement.date,
        to_id: npo.id.toString(),
        to_name: npo.name,
        to_type: "npo",
        to_tip_allowed: npo.hide_bg_tip ?? false,
        to_members: [],
        amount: {
          base: p_amnt.base,
          tip: 0,
          fee_allowance: p_amnt.fee_allowance,
        },
        dist: npo_dist,
      };

      const c = commission_fn(
        { tip: cf_from_tip, fee: cf_from_npo_pcfs, id: parent_to_id },
        npo
      );
      if (c) {
        const { ltd, record, ...ref } = c;
        npo_dist.referrer = ref;
        txs.put(record);
        tip_tos.push(ltd.id);
        txs.update(referrer_ltd_update_txi(ltd.id, [ltd.source]));
      }
      const dists = await dist_txs(npo_don_record, npo_dist);
      txs.append(dists);

      //program is not selected for fund donations
      if (tx.program?.id) {
        const x = npodb.npo_prog_contrib_update_txi(
          npo.id,
          tx.program.id,
          npo_net
        );
        txs.update(x);
      }

      //increment form_id ltd
      if (tx.source_id) {
        const x = formsdb.form_ltd_inc_txi(tx.source_id, npo_net);
        txs.update(x);
      }

      /** creates donation message for single fund/npo donation */
      if (tx.from_public) {
        const r = donordb.record({
          id: parent_id,
          date: parent_settlement.date,
          donor_id: tx.from_email,
          donor_message: tx.from_public_msg_to_npo ?? "",
          donor_name: tx.from_name || "Anonymous",
          env: nvs.app.env,
          recipient_id: parent_to_id,
          donation_id: parent_id,
          amount: total_usd,
        });
        txs.put(donordb.put_txi(r));
      }
    }

    if (tip_net > 0) {
      // TIP RECORD
      const tip_id = ulid(new Date(parent_settlement.date).getTime());
      const tip_dist: IDonationDist = {
        id: tip_id,
        gross: p_sttl_net.tip,
        net: tip_net,
        currency: parent_settlement.currency,
        fees: { ...tip_pcfs, processing: p_sttl_fee.tip },
        fee_allowance: p_fa_usd.base,
        fee_allowance_excess: tip_fa_excess,
        to_settings: {
          fiscal_sponsored: false,
          alloc: { liq: 100, cash: 0, lock: 0 },
        },
        form_tag,
        parent: {
          id: parent_id,
          to_id: parent_to_id,
          to_name: parent_to_name,
          to_members: parent_to_members,
        },
      };

      const tip_don_record: IDonation = {
        ...tx,
        id: tip_id,
        created_at: parent_settlement.date,
        to_id: nvs.app.npo_id_tip.toString(),
        to_name: "Offeria",
        to_type: "npo",
        to_tip_allowed: false,
        to_members: [],
        amount: { base: p_amnt.tip, tip: 0, fee_allowance: p_fa.tip },
        dist: tip_dist,
      };
      //back-write tip-record
      txs.put(don2db.put_txi(tip_don_record));

      //deduct paid commissions
      if (tip_tos.length > 0) {
        tip_dist.referrer = {
          id: `internal:${tip_tos.join(",")}`,
          cf_from_fee: 0,
          cf_from_tip,
        };
        tip_dist.net -= cf_from_tip;
      }
      const dists = await dist_txs(tip_don_record, tip_dist);
      txs.append(dists);
    }

    const res = await dbc.send(
      new TransactWriteCommand({ TransactItems: txs.all })
    );
    return resp.json(res.$metadata);
  } catch (err) {
    console.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
    throw err;
  }
};

export const index: SQSHandler = async (event) => {
  const failures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      const b = JSON.parse(record.body) as IDonationSettled;
      await handle_record(b);
    } catch (err) {
      console.error(
        "failed to process donation settlement:",
        record.messageId,
        err
      );
      failures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures: failures };
};
