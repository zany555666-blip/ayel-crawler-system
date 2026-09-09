import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const LOCK_BASE_MINUTES = 15;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("INVALID");
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const ip = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
        const userAgent = request?.headers?.get("user-agent") || null;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.password) {
          throw new Error("INVALID");
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const remainingMin = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000));
          throw new Error(`LOCKED_${remainingMin}`);
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password);

        if (!isValid) {
          const attempts = user.failedLoginAttempts + 1;
          let lockedUntil: Date | null = null;
          if (attempts >= 5) {
            const round = Math.floor(attempts / 5);
            const minutes = Math.min(LOCK_BASE_MINUTES * Math.pow(2, round - 1), 480);
            lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
          }

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil: lockedUntil || user.lockedUntil,
            },
          });

          await prisma.loginLog.create({
            data: { userId: user.id, email: user.email, ip, userAgent, success: false },
          });

          if (lockedUntil) {
            const remainingMin = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
            throw new Error(`LOCKED_${remainingMin}`);
          }
          throw new Error("INVALID");
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        });

        await prisma.loginLog.create({
          data: { userId: user.id, email: user.email, ip, userAgent, success: true },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.tv = (user as any).tokenVersion ?? 0;
      } else {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { tokenVersion: true },
        });
        if (!dbUser || dbUser.tokenVersion !== (token.tv as number)) {
          return null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});