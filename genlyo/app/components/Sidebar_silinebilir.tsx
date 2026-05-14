"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();

  // 1. DEDEKTİF KODU: Sistemin seni nasıl tanıdığını görmek için
  useEffect(() => {
    console.log("🕵️‍♂️ Sistemdeki Rolünüz:", userRole);
  }, [userRole]);

  const menuItems = [
    { name: "Ana Panel", path: "/dashboard", icon: "📊", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
    { name: "Kanal Yönetimi", path: "/dashboard/channels", icon: "🏢", roles: ["ADMIN"] },
    { name: "Bölge Yönetimi", path: "/dashboard/regions", icon: "🗺️", roles: ["ADMIN"] },
    { name: "Mağaza Yönetimi", path: "/dashboard/stores", icon: "🏪", roles: ["ADMIN", "REGION_MANAGER"] },
    { name: "Personel Yönetimi", path: "/dashboard/personnel", icon: "👥", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
    { name: "Prim Kuralları", path: "/dashboard/bonus-rules", icon: "⚙️", roles: ["ADMIN"] }, 
    { name: "Hedef Yönetimi", path: "/dashboard/targets", icon: "🎯", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
    { name: "Ciro Yönetimi", path: "/dashboard/sales", icon: "💰", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
    
    // 🚀 TEST İÇİN HERKESE AÇIK YAPTIK: "USER" rolünü bile ekledik
    { name: "Performans Paneli", path: "/dashboard/store-performance", icon: "🏆", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER", "USER"] }, 
    
    { name: "Raporlar", path: "/dashboard/analysis", icon: "📈", roles: ["ADMIN", "REGION_MANAGER"] },
    { name: "YZ Tahminleri", path: "/dashboard/analysis/motor2", icon: "🤖", roles: ["ADMIN"] },
  ];

  // 2. GÜÇLENDİRİLMİŞ FİLTRE: Küçük/büyük harf ve boşluk hatalarını yoksayar
  const filteredMenu = menuItems.filter(item => {
    if (!userRole) return false;
    const cleanUserRole = userRole.toString().toLowerCase().trim();
    return item.roles.some(r => r.toLowerCase().trim() === cleanUserRole);
  });

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col transition-all">
      <div className="h-20 flex items-center justify-center border-b border-slate-800">
        <h1 className="text-2xl font-black text-white tracking-widest">GENLYO<span className="text-blue-500">.BI</span></h1>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-1">
        <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Modüller</p>
        {filteredMenu.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-center text-slate-500">
        Genlyo BI © 2026
      </div>
    </aside>
  );
}
