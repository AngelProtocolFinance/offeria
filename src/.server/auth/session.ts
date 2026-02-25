import { createCookieSessionStorage } from "react-router";
import { bg_session } from "../cookie";

export interface SessionData {
  token_refresh: string;
}

interface FlashData {
  error: string;
}

export const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, FlashData>({
    cookie: bg_session,
  });

export type Stored = Awaited<ReturnType<typeof getSession>>;
