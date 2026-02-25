import { Link, href } from "react-router";
import dapp_logo from "#/assets/images/offeria-logo-text-501c3.png";
import { Image } from "./image";

type Props = {
  classes?: string;
};

export function DappLogo({ classes = "" }: Props) {
  return (
    <Image
      className={classes}
      src={dapp_logo}
      render={(img) => (
        <Link to={href("/")} title="Go to Home page">
          {img}
        </Link>
      )}
    />
  );
}
