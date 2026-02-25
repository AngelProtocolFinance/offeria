import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { DynamoDBRecord } from "aws-lambda";

export interface IModify<T = unknown> {
  type: "modify";
  prev: T;
  curr: T;
}
interface IInsert<T = unknown> {
  type: "insert";
  data: T;
}

interface IDelete<T = unknown> {
  type: "delete";
  data: T;
}

export type TPayload<T = unknown> = IModify<T> | IInsert<T> | IDelete<T>;

export function to_payload<T>(record: DynamoDBRecord): TPayload<T> | null {
  const oldr: any = record.dynamodb?.OldImage;
  const newr: any = record.dynamodb?.NewImage;

  if (record.eventName === "REMOVE" && oldr) {
    return { type: "delete", data: unmarshall(oldr) as T };
  }
  if (record.eventName === "MODIFY" && oldr && newr) {
    return {
      type: "modify",
      prev: unmarshall(oldr) as T,
      curr: unmarshall(newr) as T,
    };
  }
  if (record.eventName === "INSERT" && newr) {
    return { type: "insert", data: unmarshall(newr) as T };
  }
  return null;
}
