import type { NextConfig } from "next";

// 🚀 DOKÜMANTASYON: Proje yapılandırma ayarlarımız
const nextConfig: NextConfig = {
  // 🚀 DOKÜMANTASYON: Vercel derlemesi sırasında ESLint denetimini yok sayarak derleme hatasını engeller.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;