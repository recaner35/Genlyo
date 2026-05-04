// Dosya Yolu: app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
// 🚀 DOKÜMANTASYON: Ayarlarımızı merkezi lib/auth.ts dosyasından çekiyoruz.
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

// 🚀 DOKÜMANTASYON: Bu dosyadan sadece Next.js'in izin verdiği HTTP metodlarını dışarı aktarıyoruz.
export { handler as GET, handler as POST };