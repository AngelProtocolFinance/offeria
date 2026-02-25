import { nvs } from "$/env";
import { npos_collection } from "$/kit/mongodb";
import type { INposPage, INposSearchObj } from "@/endowment";
import type { Document } from "mongodb";

const HITS_PER_PAGE = 20;

export async function get_npos(params: INposSearchObj): Promise<INposPage> {
  try {
    const { fields, query: q, page = 1, ...p } = params;

    const pipeline: Document[] = [];
    const filter_clauses = filters(p);

    // build $search stage
    const search_stage: Document = {
      $search: {
        index: "npos-search-index",
        compound: {
          must: [],
          filter: filter_clauses,
        },
      },
    };

    // add text search if query provided
    if (q) {
      search_stage.$search.compound.must.push({
        compound: {
          should: [
            {
              text: {
                query: q,
                path: "name",
                score: { boost: { value: 3 } },
              },
            },
            {
              text: {
                query: q,
                path: "tagline",
                score: { boost: { value: 2 } },
              },
            },
            {
              text: {
                query: q,
                path: "registration_number",
                score: { boost: { value: 1 } },
              },
            },
          ],
        },
      });
    } else {
      // match all when no query
      search_stage.$search.compound.must.push({ exists: { path: "env" } });
    }

    pipeline.push(search_stage);

    // sort
    if (q) {
      pipeline.push({
        $addFields: { search_score: { $meta: "searchScore" } },
      });
      pipeline.push({ $sort: { search_score: -1 } });
    } else {
      pipeline.push({ $sort: { name: 1 } });
    }

    // pagination with $facet
    const skip = (page - 1) * HITS_PER_PAGE;

    // build projection
    const projection: Document = { _id: 0, search_score: 0 };
    if (fields?.length) {
      // reset projection to only include specified fields
      for (const key of Object.keys(projection)) {
        if (key !== "_id") delete projection[key];
      }
      for (const f of fields) {
        projection[f] = 1;
      }
      projection.id = 1; // always include id
    }

    pipeline.push({
      $facet: {
        items: [
          { $skip: skip },
          { $limit: HITS_PER_PAGE },
          { $project: projection },
        ],
        total_count: [{ $count: "count" }],
      },
    });

    const [result] = await npos_collection.aggregate(pipeline).toArray();

    const hits = result?.items || [];
    const found = result?.total_count?.[0]?.count || 0;

    if (hits.length === 0 && !found) {
      return {
        items: [],
        page: 1,
        pages: 1,
      };
    }

    return {
      items: hits.map((x: any) => {
        // id: `${env}-${number}` format
        const { id, ...rest } = x;
        // if id is already a number, return as-is
        if (typeof id === "number") return { id, ...rest };
        // if id is string format, extract number
        return { id: +id.split("-")[1], ...rest };
      }),
      page,
      pages: Math.ceil(found / HITS_PER_PAGE),
    };
  } catch (err) {
    console.error(err);
    return { items: [], page: 1, pages: 1 };
  }
}

function filters(
  params: Omit<INposSearchObj, "fields" | "page" | "query">
): Document[] {
  const filters: Document[] = [{ equals: { path: "env", value: nvs.app.env } }];

  // published filter
  if (params.published?.length) {
    filters.push(build_or_filter("published", params.published));
  }

  // claimed filter
  if (params.claimed?.length) {
    filters.push(build_or_filter("claimed", params.claimed));
  }

  // countries: match hq_country or active_in_countries
  if (params.countries?.length) {
    const country_clauses: Document[] = [];
    for (const country of params.countries) {
      country_clauses.push({ equals: { path: "hq_country", value: country } });
      country_clauses.push({
        equals: { path: "active_in_countries", value: country },
      });
    }
    filters.push({
      compound: {
        should: country_clauses,
        minimumShouldMatch: 1,
      },
    });
  }

  // endow_designation filter
  if (params.endow_designation?.length) {
    filters.push(
      build_or_filter("endow_designation", params.endow_designation)
    );
  }

  // kyc_only filter
  if (params.kyc_only?.length) {
    filters.push(build_or_filter("kyc_donors_only", params.kyc_only));
  }

  // fund_opt_in filter
  if (params.fund_opt_in?.length) {
    filters.push(build_or_filter("fund_opt_in", params.fund_opt_in));
  }

  // sdgs filter
  if (params.sdgs?.length) {
    filters.push(build_or_filter("sdgs", params.sdgs));
  }

  return filters;
}

function build_or_filter(field: string, values: any[]): Document {
  if (values.length === 1) {
    return { equals: { path: field, value: values[0] } };
  }
  return {
    compound: {
      should: values.map((v) => ({ equals: { path: field, value: v } })),
      minimumShouldMatch: 1,
    },
  };
}
