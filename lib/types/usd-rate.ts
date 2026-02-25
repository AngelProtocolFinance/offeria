import type { ISODate } from "./alias";

/** table name "fiat_currency_data" */
export declare namespace USDRate {
  type PrimaryKey = { currency_code: string };
  type NonKeyAttributes = {
    minimum_amount: number;
    rate: number;
    timestamp: ISODate;
  };

  type DBRecord = PrimaryKey & NonKeyAttributes;

  type V2PrimaryKey = { currency_code: "_all" };
  type V2DBRecord = V2PrimaryKey & {
    /** key: uppercase ISO 4217 code; value: unit/per-usd rate */
    rates: Record<string, number>;
    timestamp: ISODate;
  };
}
