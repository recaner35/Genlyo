// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// 🚀 DOKÜMANTASYON: 
// Bu dosya, sayfa yüklenmeden önce araya girer (Middleware).
// Kullanıcının yetkisi yoksa onu otomatik olarak "signIn" sayfasına atar.

export default withAuth(
  function middleware(req) {
    // Eğer kullanıcı zaten giriş yapmışsa ve ana sayfaya ("/") girerse, onu doğrudan panele yönlendir
    if (req.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      // Token varsa (kullanıcı giriş yapmışsa) true döner ve geçişe izin verir
      authorized: ({ token }) => !!token,
    },
    pages: {
      // 🚀 YÖNLENDİRME: Yetkisiz bir işlemde veya ana sayfada gösterilecek Login ekranının yolu
      signIn: "/login", 
    },
  }
);

export const config = {
  // Hangi sayfaların bu güvenlik duvarından geçeceğini belirliyoruz.
  // "/" (Ana sayfa) ve "/dashboard" altındaki her şey koruma altında.
  matcher: ["/", "/dashboard/:path*"],
};