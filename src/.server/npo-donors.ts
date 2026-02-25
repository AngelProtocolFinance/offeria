import { donordb } from "$/tables/donation-messages";
import { users_meta_db } from "$/tables/users-meta";
import { dbc } from "@/db";
import { BatchGetCommand } from "@aws-sdk/lib-dynamodb";

export const npo_donors = async (
  recipient_id: string /** uuid or number id */,
  next?: string
) => {
  const { items: donors, next: n } = await donordb.list(recipient_id, {
    next,
    limit: 10,
  });

  if (donors.length === 0) {
    return { items: [], next: undefined };
  }

  const distinct_donor_ids = new Set<string>(donors.map((x) => x.donor_id));
  const batch_get = new BatchGetCommand({
    RequestItems: {
      [users_meta_db.table]: {
        Keys: Array.from(distinct_donor_ids.values()).map((x) => {
          return {
            PK: `User#${x}`,
            SK: users_meta_db.env,
          };
        }),
        ProjectionExpression: "email, photo",
      },
    },
  });
  const { Responses } = await dbc.send(batch_get);

  const photo_map = (Responses?.[users_meta_db.table] ?? []).reduce(
    (acc, x) => {
      acc[x.email] = x.photo;
      return acc;
    },
    {}
  );

  const items = (donors || []).map(({ donor_id, env, ...x }) => ({
    ...x,
    photo: photo_map[donor_id],
  }));

  return {
    items,
    next: n,
  };
};
