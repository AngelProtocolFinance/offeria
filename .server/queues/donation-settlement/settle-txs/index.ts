import type { IBalanceTx } from "@/balance-txs";
import { type TxItems, Txs } from "@/db";
import type { IDonationFinalAttr } from "@/donation";
import type { IDonation, IDonationDist } from "@/donations";
import type { IAllocation } from "@/endowment";
import { tribute_to_final } from "@/helpers/donation";
import { produce } from "immer";
import { nanoid } from "nanoid";
import { btxdb } from "../../../tables/bal-txs";
import { baldb } from "../../../tables/balances";
import { dondb } from "../../../tables/donations-settled";
import { navdb } from "../../../tables/nav-history";
import { podb } from "../../../tables/payouts-v2";
import { type Increments, bal_deltas_fn } from "./helpers";
export async function dist_txs(
  don: IDonation,
  dist: IDonationDist
): Promise<TxItems> {
  const record: IDonationFinalAttr = {
    transactionId: don.id,
    transactionDate: don.created_at,
    parentTx: dist.parent?.id,
    network: don.env,
    amount: don.amount.base,
    usdValue: don.amount.base / don.upusd,
    frequency: don.frequency,
    feeAllowance: don.amount.fee_allowance,
    denomination: don.currency,
    allocation: dist.to_settings.alloc,
    appUsed: don.source,
    form_id: don.source_id,
    form_tag: dist.form_tag,
    via: don.via,
    endowmentId: +don.to_id, //settlement records are always to npos
    charityName: don.to_name,
    // claimed - can't donate to unclaimed endowments
    fiscalSponsored: dist.to_settings.fiscal_sponsored,
    fund_id: dist.parent?.to_id,
    fund_name: dist.parent?.to_name,
    fund_members: dist.parent?.to_members.map((x) => +x),
    // nonProfitMsg - not saved in db anymore
    programId: don.program?.id,
    programName: don.program?.name,
    donor_public: don.from_public,
    donor_message: don.from_public_msg_to_npo,
    email: don.from_email,
    kycEmail: don.from_email,
    msg_to_npo: don.from_private_msg_to_npo,
    title: don.from_title,
    fullName: don.from_name,
    streetAddress: don.from_addr_street,
    city: don.from_addr_city,
    state: don.from_addr_state,
    zipCode: don.from_addr_zip_code,
    country: don.from_addr_country,
    company_name: don.from_company_name,

    baseFee: dist.fees.base,
    fiscalSponsorFee: dist.fees.fsa,
    processingFee: dist.fees.processing,
    settledUsdAmount: dist.gross,
    donationFinalAmount: dist.net,
    donationFinalDenom: dist.currency,
    donationFinalTxDate: don.created_at,
    excessFeeAllowanceUsd: dist.fee_allowance_excess,
    donationFinalTxHash: dist.id,
  };

  if (don.tribute) {
    const { inHonorOf, tributeNotif } =
      don.tribute && tribute_to_final(don.tribute);
    record.inHonorOf = inHonorOf;
    record.tributeNotif = tributeNotif;
  }

  if (dist.referrer) {
    record.referrer = dist.referrer.id;
    record.referrer_commission = {
      from_tip: dist.referrer.cf_from_tip,
      from_fee: dist.referrer.cf_from_fee,
    };
  }
  const txs = new Txs();
  txs.put(dondb.put_txi(record));

  const net_alloc: IAllocation = {
    cash: (dist.to_settings.alloc.cash / 100) * dist.net,
    liq: (dist.to_settings.alloc.liq / 100) * dist.net,
    lock: (dist.to_settings.alloc.lock / 100) * dist.net,
  };

  // update balances
  const incs: Increments = {
    liq: net_alloc.liq,
    lock: net_alloc.lock,
    lock_units: net_alloc.lock
      ? net_alloc.lock / (await navdb.ltd().then((x) => x.price))
      : 0,
    cash: net_alloc.cash,
    tip: 0,
    fees: {
      base: dist.fees.base,
      fsa: dist.fees.fsa,
      processing: dist.fees.processing,
    },
  };
  const bal_deltas = bal_deltas_fn(incs, don.source ?? "bg-marketplace");
  txs.update(baldb.balance_update_txi(+don.to_id, bal_deltas));

  // logs and balance-txs
  if (net_alloc.lock || net_alloc.liq) {
    const { lock_units, liq } = await baldb.npo_balance(+don.to_id);
    const nav = await navdb.ltd();

    if (net_alloc.lock) {
      const purchased_units = net_alloc.lock / nav.price;

      const new_nav = produce(nav, (x) => {
        x.reason = `npo:${don.to_id} donation allocation to lock`;
        x.date = new Date().toISOString(); //each log should have its own timestamp
        x.units += purchased_units;
        // new investments are allocated to cash portion and rebalanced later
        x.composition.CASH.qty += net_alloc.lock;
        x.composition.CASH.value += net_alloc.lock;

        x.value += net_alloc.lock;
        x.holders[don.to_id] ||= 0;
        x.holders[don.to_id] += purchased_units;
      });

      txs.put(navdb.log_put_txi(new_nav));

      const lock_tx: IBalanceTx = {
        id: nanoid(),
        date_created: don.created_at,
        date_updated: don.created_at,
        owner: don.to_id,
        account: "lock",
        bal_begin: lock_units,
        bal_end: lock_units + purchased_units,
        amount: net_alloc.lock,
        amount_units: purchased_units,
        status: "final",
        account_other_id: don.id,
        account_other: "donation",
        account_other_bal_begin: net_alloc.lock,
        account_other_bal_end: 0,
      };
      txs.put(btxdb.tx_put_txi(lock_tx));
    }

    if (net_alloc.liq) {
      const lock_tx: IBalanceTx = {
        id: nanoid(),
        date_created: don.created_at,
        date_updated: don.created_at,
        owner: don.to_id,
        account: "liq",
        bal_begin: liq,
        bal_end: liq + net_alloc.liq,
        amount: net_alloc.liq,
        amount_units: net_alloc.liq,
        status: "final",
        account_other_id: don.id,
        account_other: "donation",
        account_other_bal_begin: net_alloc.liq,
        account_other_bal_end: 0,
      };
      txs.put(btxdb.tx_put_txi(lock_tx));
    }
  }

  //create payout-v2
  if (net_alloc.cash > 0) {
    const por = podb.payout_record({
      id: nanoid(),
      source_id: don.id,
      recipient_id: don.to_id,
      source: "donation",
      date: don.created_at,
      amount: net_alloc.cash,
      type: "pending",
    });
    txs.put(podb.payout_put_txi(por));
  }

  return txs.all;
}
