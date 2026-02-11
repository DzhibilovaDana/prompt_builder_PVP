// src/lib/auth.ts
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

//тэги
//может пулы полей
//

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name ?? null };
      },
    }),
  ],

  // <-- ЗАМЕНА: используем JWT-стратегию (вместо database)
  session: { strategy: "jwt" },

  callbacks: {
    // Поддерживаем JWT — когда user появляется (при входе), добавляем id в token
    async jwt({ token, user }) {
      if (user?.id) {
        // https://next-auth.js.org/tutorials/refresh-token-rotation
        token.sub = user.id;
      }
      return token;
    },

    // При создании session ставим user.id из token.sub (или token.id)
    async session({ session, token }) {
      if (session?.user) {
        // @ts-expect-error - NextAuth typings иногда не знают про id в user
        session.user.id = token.sub ?? (token as any).id ?? null;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
