import { useRef } from "react";
import { useFetcher } from "react-router";

export function DeleteBtn({
  fund_id,
  name,
}: { fund_id: string; name: string }) {
  const dialog_ref = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher({ key: `delete-fund-${fund_id}` });

  return (
    <>
      <button
        type="button"
        disabled={fetcher.state !== "idle"}
        onClick={() => dialog_ref.current?.showModal()}
        className="text-red hover:text-red-d1 disabled:text-gray text-xs uppercase font-medium"
      >
        delete
      </button>
      <dialog
        ref={dialog_ref}
        className="p-6 rounded-lg backdrop:bg-black/50 max-w-md fixed-center"
      >
        <h2 className="text-lg font-semibold mb-2">Delete Fundraiser</h2>
        <p className="text-gray-d1 mb-4 whitespace-normal">
          Are you sure you want to delete{" "}
          <span className="font-bold">{name}</span> This action cannot be
          undone.
        </p>
        <div className="flex gap-2 justify-end">
          <form method="dialog">
            <button className="btn-outline px-4 py-2 rounded">Cancel</button>
          </form>
          <fetcher.Form
            onSubmit={() => dialog_ref.current?.close()}
            method="DELETE"
          >
            <button
              name="fund_id"
              value={fund_id}
              className="btn-red text-sm px-4 py-2 rounded"
            >
              Proceed
            </button>
          </fetcher.Form>
        </div>
      </dialog>
    </>
  );
}
