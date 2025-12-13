// app/api/register/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email и пароль обязательны" }, { status: 400 });
    }

    // Простая валидация пароля
    if (password.length < 8) {
      return NextResponse.json({ error: "Пароль должен быть не менее 8 символов" }, { status: 400 });
    }

    // Проверка существующего пользователя
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12); // rounds = 12

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
      },
    });

    // Не возвращаем пароль в ответе
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
