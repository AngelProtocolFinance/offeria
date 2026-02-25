import type { Environment } from "@/schemas";

export namespace Metrics {
  export namespace CountryMetricsTime {
    export type Keys = {
      PK: "CountryMetricsTime";
      SK: Environment;
    };

    type NonKeyAttributes = {
      /** weekNumber (YYYY + WW) e.g. `2024 + 23 = 2047`  */
      weekNum: number;
    };

    export type DBRecord = Keys & NonKeyAttributes;
  }

  export namespace Country {
    /** lowercased country name separated by `_`  */
    type CountryNameKey = string;
    export interface Keys {
      PK: `Country#${CountryNameKey}`;
      SK: Environment;
    }

    type NonKeyAttributes = {
      totalDonations7d: number;
      totalDonations: number;
      name: string;
      gsi1PK: `Countries#${Environment}`;
      /** last updated */
      gsi1SK: string;
    };

    export type DBRecord = Keys & NonKeyAttributes;
    export namespace Gsi1 {
      export type Keys = Pick<NonKeyAttributes, "gsi1PK" | "gsi1SK">;
      //copies all attributes
      export type DBRecord = Country.DBRecord;
    }
  }
}
