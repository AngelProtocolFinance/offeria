import { type MetaFunction, Outlet } from "react-router";
import { metas } from "#/helpers/seo";

export const meta: MetaFunction = () => metas({ title: "Sign Up - Offeria" });

export default function Layout() {
  return (
    <div className="grid place-items-center px-4 py-14 text-gray">
      <Outlet />
    </div>
  );
}
