import { baldb } from "$/tables/balances";
import { npodb } from "$/tables/endowments";
import { get_funds_npo_memberof } from "#/.server/funds";
import type { Route } from "./+types";
import { npo_id } from "./npo-id";

export const loader = async ({ params }: Route.LoaderArgs) => {
  const id = npo_id(params.id);
  const npo = await npodb.npo(id);
  if (!npo) throw new Response(null, { status: 404 });
  const med_page = npodb.npo_media(npo.id, {
    type: "video",
    featured: true,
  });

  return {
    npo,

    //lazy
    bal: baldb.npo_balance(npo.id),
    funds: get_funds_npo_memberof(npo.id, { npo_profile_featured: true }),
    media: med_page.then((x) => x.items),
    programs: npodb.npo_programs(npo.id),
  };
};
