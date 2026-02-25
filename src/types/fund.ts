import type { IFund as IFundDb } from "@/fundraiser";

export interface IFundMember {
  id: number;
  name: string;
  logo: string | undefined;
  banner: string | undefined;
}
export interface IFund extends Omit<IFundDb, "members"> {
  members: IFundMember[];
}
