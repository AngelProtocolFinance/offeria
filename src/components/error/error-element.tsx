import { CircleAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  NavLink,
  href,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";
import { DefaultFallback } from "./default-fallback";

const STATUS_INFO: Record<
  number,
  { message: string; action: "back" | "reload" }
> = {
  403: {
    message: "You don't have permission to access this resource",
    action: "back",
  },
  404: { message: "The resource you requested was not found", action: "back" },
  500: { message: "Something went wrong on our end", action: "reload" },
};

export function ErrorElement() {
  const error = useRouteError();

  const elementRef = useRef<HTMLButtonElement>(null);

  //biome-ignore lint: log onmount only
  useEffect(() => {
    console.error(error);
  }, []);

  useEffect(() => {
    if (!elementRef.current) return;
    elementRef.current.scrollIntoView({ block: "center" });
  }, []);

  if (isRouteErrorResponse(error)) {
    const info = STATUS_INFO[error.status];
    if (info) {
      return (
        <div className="grid place-items-center content-center gap-6 p-4">
          <CircleAlert className="text-red" size={50} />
          <p className="-mt-4">{error.status}</p>
          <p className="text-center">{info.message}</p>
          {info.action === "back" ? (
            <NavLink
              to={href("/marketplace")}
              className="btn btn-outline text-sm px-6 py-2 rounded-full"
            >
              Back
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-outline text-sm px-6 py-2 rounded-full"
            >
              Reload
            </button>
          )}
        </div>
      );
    }
  }

  return (
    <DefaultFallback
      acknowledger={
        <button
          ref={elementRef}
          onClick={() => {
            window.location.reload();
          }}
          className="border border-gray-l3 rounded-lg px-6 py-2"
        >
          OK
        </button>
      }
    />
  );
}
