import { Heart } from "lucide-react";
import { useState } from "react";
import { Arrow, Content, Tooltip } from "#/components/tooltip";
import { use_user } from "#/hooks/use-user";
import type { INpoBookmark } from "#/types/user";

type Props = {
  classes?: string;
  npo: INpoBookmark;
};

export function BookmarkBtn({ classes = "", npo }: Props) {
  const { user, toggle_bookmark } = use_user();
  const [pending, set_pending] = useState(false);

  if (user === "loading") {
    return (
      <Heart size={19} className={`${classes} text-gray-l4 animate-pulse`} />
    );
  }

  if (!user) {
    return (
      <Tooltip
        tip={
          <Content className="px-4 py-2 bg-gray-d4 text-white text-sm rounded-lg shadow-lg">
            Login to save your favorites
            <Arrow />
          </Content>
        }
      >
        <Heart size={19} className={`${classes} text-gray`} />
      </Tooltip>
    );
  }

  const is_bookmarked = user.bookmarks.some((b) => b.id === npo.id);

  return (
    <Tooltip
      tip={
        !is_bookmarked ? (
          <Content className="px-4 py-2 bg-gray-d4 text-white text-sm rounded-lg shadow-lg">
            Add to favorites
            <Arrow />
          </Content>
        ) : null
      }
    >
      <button
        type="button"
        disabled={pending}
        aria-label="Add to favorites button"
        className={`flex items-center gap-1 disabled:text-gray-l4 ${classes}`}
        onClick={async () => {
          set_pending(true);
          await toggle_bookmark(npo, user);
          set_pending(false);
        }}
      >
        <Heart size={19} className={is_bookmarked ? "fill-red text-red" : ""} />
      </button>
    </Tooltip>
  );
}
