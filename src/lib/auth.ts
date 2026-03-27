import { getUserBySession } from "@/lib/userStore";

export function getSessionTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/pb_session=([A-Fa-f0-9]+);?/);
  return m ? m[1] : null;
}

export async function getUserIdFromRequest(req: Request): Promise<number | null> {
  const token = getSessionTokenFromRequest(req);
  if (!token) return null;
  const user = await getUserBySession(token);
  return user ? user.id : null;
}
