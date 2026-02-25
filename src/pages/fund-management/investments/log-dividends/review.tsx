import { humanize } from "@/helpers/decimal";
import { NpoName } from "#/components/npo-name";

interface Props {
  amount: number;
  per_npo_credit_usd: Record<string, number>;
  classes?: string;
}

export function Review({ classes = "", amount, per_npo_credit_usd }: Props) {
  return (
    <div className={`overflow-auto ${classes} p-6`}>
      <table className="min-w-full [&_th,&_td]:p-2 [&_th,&_td]:first:pl-0 [&_th,&_td]:text-left [&_tbody]:divide-y [&_tbody]:divide-gray-l2 divide-y divide-gray-l2 text-sm">
        <thead>
          <tr>
            <th className="font-medium text-sm text-gray">Holder</th>
            <th className="font-medium text-sm text-gray">Share</th>
            <th className="font-medium text-sm text-gray">Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(per_npo_credit_usd)
            .toSorted(([, a], [, b]) => b - a)
            .map(([npo, npo_usd]) => (
              <tr key={npo} className="text-sm text-gray-d4">
                <td>
                  <NpoName id={npo} />
                </td>
                <td className="text-right">
                  {humanize((npo_usd / amount) * 100)} %
                </td>
                <td className="text-right">${humanize(npo_usd)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
