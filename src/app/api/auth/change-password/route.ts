import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { updateUserPassword, verifyUser } from "@/lib/userStore";

export async function POST(req: Request) {
  try {
    const currentUser = await getRequestUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const oldPassword = typeof body.oldPassword === "string" ? body.oldPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Некорректный пароль (минимум 6 символов)" }, { status: 400 });
    }

    const verified = await verifyUser(currentUser.email, oldPassword);
    if (!verified) {
      return NextResponse.json({ error: "Текущий пароль указан неверно" }, { status: 403 });
    }

    await updateUserPassword(currentUser.id, newPassword);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("Change password failed", e);
    return NextResponse.json({ error: "Система временно недоступна" }, { status: 503 });
  }
}
