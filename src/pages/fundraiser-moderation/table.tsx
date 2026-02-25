import { toPP } from "@/helpers/date";
import { NavLink, href } from "react-router";
import { Cells, TableSection } from "#/components/table-section";
import { DeleteBtn } from "./delete-btn";
import LoadMoreBtn from "./load-more-btn";
import type { TableProps } from "./types";

export function Table({
  items,
  classes = "",
  disabled,
  loading,
  load_next,
}: TableProps) {
  return (
    <table
      className={`${classes} w-full text-sm rounded-sm border border-separate border-spacing-0 border-gray-l3`}
    >
      <TableSection
        type="thead"
        rowClass="bg-blue-l4 dark:bg-blue-d7 divide-x divide-gray-l3"
      >
        <Cells
          type="th"
          cellClass="px-3 py-4 text-xs uppercase font-semibold text-left first:rounded-tl last:rounded-tr"
        >
          <>Date created</>
          <>Name</>
          <>Creator</>
          <></>
        </Cells>
      </TableSection>
      <TableSection
        type="tbody"
        rowClass="even:bg-blue-l5 dark:odd:bg-blue-d6 dark:even:bg-blue-d7 divide-x divide-gray-l3"
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
              <>{row.created_at ? toPP(row.created_at) : "--"}</>
              <NavLink
                to={href("/fundraisers/:fundId", { fundId: row.id })}
                className="hover:text-blue-d1 [&:is(.pending)]:text-gray [&:is(.pending)]:pointer-events-none"
              >
                {row.name}
              </NavLink>
              <>{row.creator_id}</>
              <DeleteBtn fund_id={row.id} name={row.name} />
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
                  on_load_more={load_next}
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
