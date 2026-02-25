import type { TRecord } from "../db";
import type { IMedia, TBinFlag } from "./interfaces";
import type { IMediaSearchObj, TMediaType } from "./schema";

export const med_sk = (ksuid: string, type: TMediaType, featured: TBinFlag) =>
  `MediaList#${featured}#${ksuid}#${type}`;

export const med_sk_attr = (sk: string) => {
  const [featured, ksuid, type] = sk.split("#").slice(1) as [
    TBinFlag,
    string,
    TMediaType,
  ];
  return { featured, ksuid, type };
};

export function med_key_filter(
  PK: string,
  params: IMediaSearchObj
): [string, Record<string, string>] {
  /** KSUID string is base62, length:27 */
  const min_ksuid = "0".repeat(27);
  const max_ksuid = "z".repeat(27);

  //media categories: get all media per type, all featured - sorted by date
  if (params.featured && params.type) {
    return [
      "gsi1PK = :pk AND gsi1SK BETWEEN :startSK and :endSK",
      {
        ":pk": PK,
        ":startSK": med_sk(min_ksuid, params.type, "0"),
        ":endSK": med_sk(max_ksuid, params.type, "0"),
      },
    ];
  }

  //media type page: get all media per type - sorted by featured and date
  if (params.type) {
    return [
      "gsi1PK = :pk AND gsi1SK BETWEEN :startSK and :endSK",
      {
        ":pk": PK,
        ":startSK": med_sk(min_ksuid, params.type, "0"),
        ":endSK": med_sk(max_ksuid, params.type, "1"),
      },
    ];
  }

  //endow-profile: get all media, all featured - sorted by date
  if (params.featured) {
    return [
      "gsi1PK = :pk AND begins_with(gsi1SK, :sk)",
      { ":pk": PK, ":sk": "MediaList#0" },
    ];
  }

  return [
    "gsi1PK = :pk AND begins_with(gsi1SK, :sk)",
    { ":pk": PK, ":sk": "MediaList#" },
  ];
}

export const to_imedia = (d: TRecord): IMedia => {
  const { gsi1SK, gsi1PK, PK, SK, ...rest } = d;
  const x = med_sk_attr(gsi1SK);
  return { ...rest, featured: x.featured === "0" } as any;
};
