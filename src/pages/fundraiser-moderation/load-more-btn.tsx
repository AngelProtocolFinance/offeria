import { LoaderRing } from "#/components/loader-ring";

export default function LoadMoreBtn({
  on_load_more,
  disabled,
  is_loading,
}: {
  on_load_more(): void;
  disabled?: boolean;
  is_loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={on_load_more}
      disabled={disabled}
      className="flex items-center justify-center gap-3 uppercase text-sm font-bold rounded-b w-full h-12 hover:bg-blue-l5 disabled:bg-gray-l3 disabled:text-gray aria-disabled:bg-gray-l3"
    >
      {is_loading ? (
        <>
          <LoaderRing thickness={10} classes="w-6" /> Loading...
        </>
      ) : (
        "Load More"
      )}
    </button>
  );
}
