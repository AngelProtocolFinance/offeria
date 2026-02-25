export type AttrNames<T extends Record<string, any>> = {
  [K in keyof T as `#${string & K}`]: K;
};

declare const emptyObjectSymbol: unique symbol;
export type EmptyObject = { [emptyObjectSymbol]?: never };

export type Ensure<T, K extends keyof T> = T & Required<{ [key in K]: T[key] }>;

/** provides autocomplete for T but can also accept string */
export type OrStr<T extends string> = T | (string & {});
