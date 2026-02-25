export type ToUpdate<Id, Fields> =
  | {
      type: "delete";
      id: Id;
    }
  | { type: "add"; id: Id; fields: Fields };

export type ToDoc<T> = {
  [K in keyof T]: T[K] extends boolean | undefined
    ? //boolean -> "0","1"
      T[K] extends boolean
      ? "0" | "1"
      : "0" | "1" | undefined
    : //number -> string
      T[K] extends number
      ? `${T[K]}`
      : //number[] to string[]
        T[K] extends Array<infer X extends string | number>
        ? // empty arrays
          `${X}`[] | undefined
        : //others
          T[K];
};

export type ToHitFields<T extends ToDoc<any>> = {
  [K in keyof T]: T[K] extends string | number | undefined
    ? T[K] extends string | number
      ? [T[K]]
      : [T[K]] | undefined
    : T[K];
};
