// Dosya Yolu: lib/auth.ts

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from "bcryptjs";

// 🚀 DOKÜMANTASYON: Veritabanı adaptörümüzü ve bağlantımızı burada kuruyoruz
const connectionString = process.env.DATABASE_URL as string;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 🚀 DOKÜMANTASYON: Ayarları merkezi bir dosya olarak dışa aktarıyoruz ki Dashboard sayfası da okuyabilsin
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Giriş Yap",
      credentials: {
        email: { label: "E-Posta", type: "email", placeholder: "mail@sirket.com" },
        password: { label: "Şifre", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Lütfen e-posta ve şifrenizi girin.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() }
        });

        if (!user || !user.isActive) {
          throw new Error("Kullanıcı bulunamadı veya hesabınız pasif.");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        
        if (!isPasswordValid) {
          throw new Error("Hatalı şifre.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          storeId: user.storeId,
          regionId: user.regionId
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as string;
        token.storeId = (user as any).storeId;
        token.regionId = (user as any).regionId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).storeId = token.storeId;
        (session.user as any).regionId = token.regionId;
      }
      return session;
    }
  },
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" }
};