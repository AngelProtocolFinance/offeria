import { endOfDay, format, getWeek } from "date-fns";
export { startOfDay, endOfDay } from "date-fns";
import * as v from "valibot";

/** @see {@link https://date-fns.org/v4.1.0/docs/format} */
export function toPP(date: string | Date) {
  return format(new Date(date), "PP");
}

export const iso_date = (formatter: typeof endOfDay, required?: "required") =>
  v.lazy((x) => {
    if (!x) {
      return required === "required"
        ? v.pipe(v.string(), v.nonEmpty("required"))
        : v.string();
    }

    return v.pipe(
      v.string(),
      v.transform((v) => new Date(v)),
      v.date("invalid date"),
      v.maxValue(endOfDay(new Date()), "can't be later than today"),
      v.transform((x) => formatter(x).toISOString())
    );
  });

export const to_pretty_utc = (date: string | Date) =>
  `${format(new Date(date), "yyyy-MM-dd HH:mm:ss")} (UTC)`;

export const YYYYWW = (date: Date | string) => {
  const d = new Date(date);
  const year = format(d, "yyyy");
  const week = getWeek(d, { weekStartsOn: 1 });
  return `${year}${week.toString().padStart(2, "0")}`;
};

export const YYYYMMDD = (date: Date | string) => {
  const d = new Date(date);
  return format(d, "yyyyMMdd");
};
