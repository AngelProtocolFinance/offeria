import type { INpoItem } from "@/endowment";
import type { IFundItem } from "@/fundraiser";
import type { NonprofitItem } from "@/types/mongodb";
import { MongoClient } from "mongodb";
import { nvs_shared } from "../env";

export const mongodb = new MongoClient(nvs_shared.mongodb.url);
export const nonprofits = mongodb
  .db("better-giving")
  .collection<NonprofitItem>("nonprofits");

export const funds_collection = mongodb
  .db("better-giving")
  .collection<IFundItem>("funds");

export const npos_collection = mongodb
  .db("better-giving")
  .collection<INpoItem>("npos");
