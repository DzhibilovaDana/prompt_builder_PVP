// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github"; // пример провайдера
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma"; // импорт Prisma Client

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    // можно добавить EmailProvider или CredentialsProvider
  ],
  session: {
    strategy: "database", // или "jwt"
  },
  callbacks: {
    async session({ session, user }) {
      // добавить userId в сессию
      (session as any).user.id = user.id;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
