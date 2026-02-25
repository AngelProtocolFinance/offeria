import { nvs } from "$/env";
import { funds_collection } from "$/kit/mongodb";
import type {
  IFundItem,
  IFundItemsPage,
  IFundsNpoMemberOfSearchObj,
  IFundsSearchObj,
} from "@/fundraiser";
import type { Document } from "mongodb";

const HITS_PER_PAGE = 25;

const now_fn = () => Math.floor(Date.now() / 1000);

export const get_funds = async ({
  query = "",
  page = 1,
}: IFundsSearchObj): Promise<IFundItemsPage> => {
  const pipeline: Document[] = [];

  // build $search stage
  const search_stage: Document = {
    $search: {
      index: "funds-search",
      compound: {
        must: [],
        filter: [
          { equals: { path: "env", value: nvs.app.env } },
          { equals: { path: "active", value: true } },
          { equals: { path: "featured", value: true } },
          { range: { path: "expiration", gte: now_fn() } },
        ],
      },
    },
  };

  // add text search if query provided
  if (query) {
    search_stage.$search.compound.must.push({
      compound: {
        should: [
          {
            text: { query, path: "name", score: { boost: { value: 3 } } },
          },
          {
            text: {
              query,
              path: "description",
              score: { boost: { value: 2 } },
            },
          },
          {
            text: {
              query,
              path: "creator_name",
              score: { boost: { value: 1 } },
            },
          },
        ],
      },
    });
  } else {
    // match all when no query
    search_stage.$search.compound.must.push({
      exists: { path: "env" },
    });
  }

  pipeline.push(search_stage);

  // sort stage
  if (query) {
    pipeline.push({
      $addFields: { search_score: { $meta: "searchScore" } },
    });
    pipeline.push({
      $sort: { search_score: -1, name: 1 },
    });
  } else {
    pipeline.push({
      $sort: { name: 1 },
    });
  }

  // pagination with $facet
  const skip = (page - 1) * HITS_PER_PAGE;

  pipeline.push({
    $facet: {
      items: [
        { $skip: skip },
        { $limit: HITS_PER_PAGE },
        { $project: { _id: 0, search_score: 0 } },
      ],
      total_count: [{ $count: "count" }],
    },
  });

  const [result] = await funds_collection.aggregate(pipeline).toArray();

  const items: IFundItem[] = result?.items || [];
  const found = result?.total_count?.[0]?.count || 0;

  if (items.length === 0 && !found) {
    return {
      items: [],
      page: 1,
      pages: 1,
    };
  }

  return {
    items,
    page,
    pages: Math.ceil(found / HITS_PER_PAGE),
  };
};

export const get_funds_npo_memberof = async (
  endow_id: number,
  params: IFundsNpoMemberOfSearchObj
): Promise<IFundItem[]> => {
  const pipeline: Document[] = [];

  // build filter clauses
  const filter_clauses: Document[] = [
    { equals: { path: "env", value: nvs.app.env } },
    // creator_id or members contains endow_id
    {
      compound: {
        should: [
          { equals: { path: "creator_id", value: endow_id.toString() } },
          { equals: { path: "members", value: endow_id } },
        ],
        minimumShouldMatch: 1,
      },
    },
  ];

  // add additional filters if npo_profile_featured
  if (params.npo_profile_featured) {
    filter_clauses.push({ equals: { path: "active", value: true } });
    filter_clauses.push({ range: { path: "expiration", gte: now_fn() } });
    filter_clauses.push({ equals: { path: "members", value: endow_id } });
  }

  pipeline.push({
    $search: {
      index: "funds-search",
      compound: {
        must: [{ exists: { path: "env" } }],
        filter: filter_clauses,
      },
    },
  });

  // sort by active desc, expiration desc
  pipeline.push({
    $sort: { active: -1, expiration: -1 },
  });

  // limit results
  pipeline.push({ $limit: HITS_PER_PAGE });

  // remove mongodb internal fields
  pipeline.push({ $project: { _id: 0 } });

  const items = await funds_collection.aggregate<IFundItem>(pipeline).toArray();

  return items;
};
