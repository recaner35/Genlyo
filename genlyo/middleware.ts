// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// 🚀 DOKÜMANTASYON: Middleware sadece yönlendirme işini yapar, veritabanına bağlanmaz!
export default withAuth(
  function middleware(req) {
    if (req.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login", 
    },
  }
);

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};