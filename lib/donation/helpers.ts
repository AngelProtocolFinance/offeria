import type { TFrequency } from "../schemas";

/**
 * @description combines the new frequency field and legacy is_recurring flag
 * @param freq
 * @param is_recurring legacy flag
 */
export const is_recurring = (freq?: TFrequency, is_recurring = false) => {
  return freq ? freq !== "one-time" : is_recurring;
};

/**
 * @description combines legacy is_recurring flag to frequency
 * @param is_recurring
 */
export const freq = (freq?: TFrequency, is_recurring = false): TFrequency => {
  return freq ?? (is_recurring ? "monthly" : "one-time");
};
