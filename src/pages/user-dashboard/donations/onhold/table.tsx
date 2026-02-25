import { toPP } from "@/helpers/date";
import { humanize, ru_vdec, usdpu } from "@/helpers/decimal";
import { Link, href } from "react-router";
import { ExtLink } from "#/components/ext-link";
import { Cells, TableSection } from "#/components/table-section";
import type { IPaginator } from "#/types/components";
import { LoadMoreBtn } from "../load-more-btn";
import type { IRow } from "./helpers";
import { PaymentResumer } from "./payment-resumer";

interface Props extends IPaginator<IRow> {}

export function Table({
  items,
  classes = "",
  disabled,
  loading,

  load_next,
}: Props) {
  return (
    <table
      className={`${classes} w-full text-sm rounded-sm border border-separate border-spacing-0 border-gray-l3`}
    >
      <TableSection type="thead" rowClass="bg-blue-l4 divide-x divide-gray-l3">
        <Cells
          type="th"
          cellClass="px-3 py-4 text-xs uppercase font-semibold text-left first:rounded-tl last:rounded-tr"
        >
          <>Date</>
          <>Recipient</>
          <>Amount</>
          <>Method</>
          <>status</>
        </Cells>
      </TableSection>
      <TableSection
        type="tbody"
        rowClass="even:bg-blue-l5 divide-x divide-gray-l3"
        selectedClass="bg-blue-l4 dark:bg-blue-d4"
      >
        {items
          .map((row) => (
            <Cells
              key={row.id}
              type="td"
              cellClass={`p-3 border-t border-gray-l3 max-w-[256px] truncate ${
                load_next ? "" : "first:rounded-bl last:rounded-br"
              }`}
            >
              <>{toPP(row.date)}</>
              <div>
                <Link
                  to={
                    row.to_type === "npo"
                      ? href("/marketplace/:id", { id: row.to_id })
                      : href("/fundraisers/:fundId", {
                          fundId: row.to_id,
                        })
                  }
                  className="flex items-center justify-between gap-1 text-blue hover:text-blue-d1"
                >
                  <span className="truncate max-w-[12rem]">{row.to_name}</span>
                </Link>
                {row.program_id && (
                  <Link
                    className="text-blue hover:text-blue-d1"
                    to={href("/marketplace/:id/program/:programId", {
                      id: row.to_id.toString(),
                      programId: row.program_id,
                    })}
                  >
                    {row.program_name}
                  </Link>
                )}
              </div>
              <div>
                {row.currency}{" "}
                {ru_vdec(row.amount, usdpu(row.amount, row.amount_usd))}{" "}
                <span className="text-gray text-sm">
                  {row.currency !== "USD"
                    ? `$${humanize(row.amount_usd)}`
                    : null}
                </span>
                <p className="text-2xs text-gray-d1 uppercase">
                  {row.frequency}
                </p>
              </div>
              <span>{row.via}</span>
              <Resumer {...row} />
            </Cells>
          ))
          .concat(
            load_next ? (
              <td
                colSpan={9}
                key="load-more-btn"
                className="border-t border-gray-l3 rounded-b"
              >
                <LoadMoreBtn
                  onLoadMore={load_next}
                  disabled={disabled}
                  is_loading={loading}
                />
              </td>
            ) : (
              []
            )
          )}
      </TableSection>
    </table>
  );
}

function Resumer(props: IRow) {
  if (props.via.startsWith("crypto") && props.via_extra) {
    return (
      <PaymentResumer payment_id={props.via_extra} amount={props.amount} />
    );
  }
  if (props.via.startsWith("stripe") && props.via_extra) {
    return (
      <ExtLink
        href={props.via_extra}
        className="text-xs uppercase text-blue hover:text-blue-d1 font-semibold"
      >
        Verify Bank Account
      </ExtLink>
    );
  }
  return <></>;
}
