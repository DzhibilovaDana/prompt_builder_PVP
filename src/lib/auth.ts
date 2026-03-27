import { getUserBySession, type UserRecord } from "@/lib/userStore";

export function readSessionTokenFromCookie(cookieHeader: string | null): string | null {
  const cookie = cookieHeader || "";
  const m = cookie.match(/pb_session=([A-Fa-f0-9]+);?/);
  return m ? m[1] : null;
}

export async function getRequestUser(req: Request): Promise<UserRecord | null> {
  const token = readSessionTokenFromCookie(req.headers.get("cookie"));
  if (!token) return null;
  return getUserBySession(token);
}
