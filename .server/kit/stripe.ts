import Stripe from "stripe";
import { nvs } from "../env";

export const stripe = new Stripe(nvs.stripe.secret_key);
