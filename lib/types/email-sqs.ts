import type { Environment } from "./list";

export declare namespace EmailSQS {
  type BankingApplicationsPayload = {
    recipients: string[];
    accountSummary: string;
  } & (
    | {
        template:
          | "banking-applications-approval"
          | "banking-applications-default"
          | "banking-applications-new";
      }
    | { template: "banking-applications-rejection"; rejectionReason: string }
  );

  type RegistrationPayload = { recipient: string; env: Environment } & (
    | {
        template: "registration-new";
        referenceID: string;
      }
    | {
        template: "registration-approved";
        orgName: string;
        registrantFirstName: string;
        endowID: string;
      }
    | {
        template: "registration-rejected";
        registrantFirstName: string;
        rejectionReason: string;
      }
  );

  type NewEndowAdminPayload = {
    template: "new-endow-admin";
    recipient: string;
    firstName: string;
    endowName: string;
    invitor: string;
  };

  type FundOptOutPayload = {
    template: "fund-opt-out-notif";
    recipient: string;
    firstName: string;
    endowName: string;
  };

  type DonationTxData = {
    transactionID: string;
    transactionDate: string;
    prettyAmount: string;
    prettyUSDamount: string;
    nonprofitName: string;
  };

  namespace Donation {
    type Tx = {
      transactionID: string;
      transactionDate: string;
      /**@example "3.14 GBP" */
      prettyAmount: string;
      /**
       * won't show if falsy
       * @example "3.14" | "" | undefined */
      prettyUSDamount: string | undefined;
      nonprofitName: string;
      programName?: string;
      isBg?: boolean;
      isRecurring?: boolean;
      //has8283?:boolean
    };

    type Donor = {
      //SES templates are just JSON objects, and can't operate on data
      firstName: string;
      fullName: string;
      address?: string;
      title?: string;
    };

    //Receipts for non-kyc donation, and <$5K doesn't need address
    type ReceiptData = Tx & {
      donor: Donor;
      /** For chariot donations, remove mention of receipts when set to `undefined`.  */
      taxReceiptId: string | undefined;
      nonProfitMsg?: string;
    };

    type NonprofitNotifData = Tx & {
      donor?: Donor;
      claimed?: boolean;
      nonprofitID: string;
      msg_to_npo?: string;
    };

    type DonorNotifData = {
      donorFirstName: string;
      nonprofitName: string;
      programName?: string;
      transactionID: string;
      isGuest?: boolean;
      isRecurring?: boolean;
    };

    type TributeNotifData = Pick<Tx, "prettyAmount" | "nonprofitName"> & {
      inHonorOf: string;
      toFullName: string;
      donor: Donor;
      fromMsg?: string;
    };

    type MicrodepositActionData = {
      donorFirstName: string;
      recipientName: string;
      verificationLink: string;
    };

    type ErrorData = {
      donorFirstName: string;
      recipientName: string;
      errorMessage: string;
    };

    type Payload = { recipients: string[] } & (
      | {
          template: "donation-nonprofit-notif";
          data: NonprofitNotifData;
        }
      | { template: "donation-donor-notif"; data: DonorNotifData }
      | { template: "donation-receipt"; data: ReceiptData }
      | { template: "donation-tribute-notif"; data: TributeNotifData }
      | {
          template: "donation-microdeposit-action";
          data: MicrodepositActionData;
        }
      | { template: "donation-error"; data: ErrorData }
    );
  }

  type Payload =
    | BankingApplicationsPayload
    | RegistrationPayload
    | NewEndowAdminPayload
    | FundOptOutPayload
    | Donation.Payload;
}
