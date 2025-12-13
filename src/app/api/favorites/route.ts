// src/app/api/favorites/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function toClient(f: any) {
  return {
    id: f.id,
    title: f.title,
    prompt: f.content,
    createdAt: f.createdAt.toISOString(),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) return NextResponse.json([], { status: 200 });

  const favs = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(favs.map(toClient));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { title, prompt } = await req.json();

  const cleanPrompt = String(prompt ?? "").trim();
  const cleanTitle = String(title ?? "").trim() || "Промпт без названия";
  if (!cleanPrompt) {
    return NextResponse.json({ error: "Empty prompt" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // (опционально) защита от дублей: если уже есть такой content у этого пользователя — не создаём второй
  const existing = await prisma.favorite.findFirst({
    where: { userId: user.id, content: cleanPrompt },
  });
  if (existing) {
    return NextResponse.json(toClient(existing), { status: 200 });
  }

  const created = await prisma.favorite.create({
    data: {
      userId: user.id,
      title: cleanTitle,
      content: cleanPrompt,
    },
  });

  return NextResponse.json(toClient(created), { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // проверяем, что запись принадлежит пользователю
  const fav = await prisma.favorite.findUnique({ where: { id } });
  if (!fav || fav.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.favorite.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
