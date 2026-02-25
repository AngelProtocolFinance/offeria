import type { INpoItem } from "@/endowment";
import type { IFundItem } from "@/fundraiser";
import type { NonprofitItem } from "@/types/mongodb";
import { MongoClient } from "mongodb";
import { nvs_shared } from "../env";

export const mongodb = new MongoClient(nvs_shared.mongodb.url);

const db = mongodb.db("offeria");

export const nonprofits = db.collection<NonprofitItem>("nonprofits");
export const funds_collection = db.collection<IFundItem>("funds");
export const npos_collection = db.collection<INpoItem>("npos");
