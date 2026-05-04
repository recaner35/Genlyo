// Dosya: middleware.ts

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// 🚀 DOKÜMANTASYON: Bu dosyanın en üstüne ASLA "bcryptjs", "pg", "Prisma" 
// veya bu kütüphaneleri barındıran "lib/auth.ts" gibi dosyaları İÇE AKTARMIYORUZ (import etmiyoruz).

export default withAuth(
  function middleware(req) {
    // 🚀 MANTIK: Kullanıcı zaten giriş yapmışsa ve ana sayfaya ("/") girmeye çalışıyorsa,
    // onu doğrudan kontrol paneline (dashboard) yönlendiriyoruz.
    if (req.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    pages: {
      // 🚀 MANTIK: Kullanıcı yetkisiz bir işlem yaparsa onu doğrudan giriş sayfasına yönlendir.
      signIn: "/login",
    },
  }
);

// 🚀 DOKÜMANTASYON: Hangi sayfaların korunacağını (middleware'den geçeceğini) belirliyoruz.
export const config = {
  // Sadece ana sayfa ve dashboard altındaki sayfalar koruma altındadır.
  matcher: ["/", "/dashboard/:path*"],
};