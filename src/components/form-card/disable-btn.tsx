import { useEffect, useRef } from "react";
import { useFetcher, useRevalidator } from "react-router";

export function DisableBtn({
  form_id,
  name,
}: { form_id: string; name: string }) {
  const dialog_ref = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher({ key: `disable-form-${form_id}` });
  const { revalidate } = useRevalidator();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidate]);

  return (
    <>
      <button
        type="button"
        disabled={fetcher.state !== "idle"}
        onClick={() => dialog_ref.current?.showModal()}
        className="text-red hover:text-red-d1 disabled:text-gray text-xs uppercase font-medium"
      >
        disable
      </button>
      <dialog
        ref={dialog_ref}
        className="p-6 rounded-lg backdrop:bg-black/50 max-w-md fixed-center"
      >
        <h2 className="text-lg font-semibold mb-2">Disable Form</h2>
        <p className="text-gray-d1 mb-4 whitespace-normal">
          Are you sure you want to disable{" "}
          <span className="font-bold">{name}</span>? The form will no longer
          accept donations.
        </p>
        <div className="flex gap-2 justify-end">
          <form method="dialog">
            <button className="btn-outline px-4 py-2 rounded">Cancel</button>
          </form>
          <fetcher.Form
            onSubmit={() => dialog_ref.current?.close()}
            method="POST"
          >
            <button
              name="form_id"
              value={form_id}
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
