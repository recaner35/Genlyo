import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 🚀 Yeni oluşturduğumuz Providers'ı import ediyoruz
import { Providers } from "./providers"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Karar Destek Sistemi",
  description: "AI Destekli BI ve Analiz Paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        {/* 🚀 Tüm children'ı Providers içine alıyoruz */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}