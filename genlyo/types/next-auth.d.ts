import NextAuth, { DefaultSession } from "next-auth";

// NextAuth modülünü genişletiyoruz (Module Augmentation)
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      storeId: string | null;
      regionId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    storeId: string | null;
    regionId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    storeId?: string | null;
    regionId?: string | null;
  }
}