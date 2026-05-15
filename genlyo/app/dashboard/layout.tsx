"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const MENU_ITEMS = [
  { name: "Ana Sayfa", path: "/dashboard", icon: "📊", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
  { name: "Performans Paneli", path: "/dashboard/store-performance", icon: "🏆", roles: ["ADMIN", "STORE_MANAGER"] },
  { name: "Kanal Yönetimi", path: "/dashboard/channels", icon: "🏢", roles: ["ADMIN"] },
  { name: "Bölge Yönetimi", path: "/dashboard/regions", icon: "🗺️", roles: ["ADMIN"] },
  { name: "Kapanış Kokpiti", path: "/dashboard/daily-tasks", icon: "💵", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
  { name: "Sayım Defteri", path: "/dashboard/inventory-count", icon: "📋", roles: ["ADMIN", "STORE_MANAGER"] },
  { name: "Personel Yönetimi", path: "/dashboard/personnel", icon: "👥", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
  { name: "Prim Kuralları", path: "/dashboard/bonus-rules", icon: "⚙️", roles: ["ADMIN"] }, 
  { name: "Hedef Yönetimi", path: "/dashboard/targets", icon: "🎯", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
  { name: "Ciro Yönetimi", path: "/dashboard/sales", icon: "💰", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
  { name: "Mağaza Yönetimi", path: "/dashboard/stores", icon: "🏪", roles: ["ADMIN", "REGION_MANAGER"] },
  { name: "Raporlar", path: "/dashboard/analysis", icon: "📈", roles: ["ADMIN", "REGION_MANAGER"] },
  { name: "YZ Tahminleri", path: "/dashboard/analysis/motor2", icon: "🤖", roles: ["ADMIN"] },
  { name: "Şifre Değiştir", path: "/dashboard/profile", icon: "🔑", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER", "USER"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const [isMobileOpen, setIsMobileOpen] = useState(false); 
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false); 
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setIsMobileOpen(false); }, [pathname]);

  if (!mounted) return null;

  const safeUserRole = (session?.user?.role || "").toUpperCase();
  const filteredMenu = MENU_ITEMS.filter(item => 
    item.roles.some(r => r.toUpperCase() === safeUserRole)
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 📱 MOBİL ÜST BAR (OWA TREND) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-40 flex justify-between items-center px-6 shadow-sm">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg">G</div>
           <span className="font-black text-slate-800 tracking-tight italic">Genlyo</span>
        </div>
        <button onClick={() => setIsMobileOpen(true)} className="p-2 text-slate-600 bg-slate-100 rounded-xl transition-all active:scale-90">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>

      {/* 🌑 MOBİL OVERLAY */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* 🚀 SOL MENÜ (SIDEBAR) */}
      <aside 
        className={`
          fixed md:relative inset-y-0 left-0 z-50 h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isDesktopCollapsed ? 'md:w-24' : 'md:w-72'} w-72 flex-shrink-0
        `}
      >
        {/* LOGO BÖLÜMÜ */}
        <div className={`h-20 flex items-center transition-all ${isDesktopCollapsed ? 'justify-center' : 'justify-between px-8 border-b border-slate-50'}`}>
           {!isDesktopCollapsed ? (
               <Link href="/dashboard" className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-indigo-200 shadow-xl">G</div>
                  <span className="font-black text-2xl text-slate-800 tracking-tighter italic">Genlyo</span>
               </Link>
           ) : (
               <button onClick={() => setIsDesktopCollapsed(false)} className="w-12 h-12 bg-indigo-50 rounded-2xl text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors">
                  <span className="font-black italic text-xl">G</span>
               </button>
           )}

           {!isDesktopCollapsed && (
               <button onClick={() => setIsDesktopCollapsed(true)} className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
               </button>
           )}
        </div>

        {/* KULLANICI KARTI */}
        {!isDesktopCollapsed && (
            <div className="px-6 py-8">
                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shadow-inner">
                        {session?.user?.name?.charAt(0) || "U"}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-black text-slate-800 truncate">{session?.user?.name}</p>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest truncate">{session?.user?.role?.replace('_', ' ')}</p>
                    </div>
                </div>
            </div>
        )}

        {/* NAVİGASYON */}
        <nav className={`flex-1 overflow-y-auto px-4 space-y-1.5 scrollbar-none py-4`}>
          {filteredMenu.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`
                  flex items-center rounded-xl font-bold transition-all duration-200 group
                  ${isDesktopCollapsed ? 'justify-center p-3.5' : 'gap-4 px-4 py-3'}
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-1' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                `}
                title={isDesktopCollapsed ? item.name : ""}
              >
                <span className={`text-xl transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                   {item.icon}
                </span>
                {!isDesktopCollapsed && <span className="text-[14px] tracking-tight">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* ALT ÇIKIŞ ALANI */}
        <div className="p-4 border-t border-slate-50">
            <button 
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={`flex items-center rounded-xl font-bold text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all w-full group ${isDesktopCollapsed ? 'justify-center p-3.5' : 'gap-4 px-4 py-3'}`}
            >
              <span className="text-xl group-hover:rotate-12 transition-transform">🚪</span>
              {!isDesktopCollapsed && <span className="text-[14px]">Sistemden Çık</span>}
            </button>
        </div>
      </aside>

      {/* 🌌 ANA İÇERİK ALANI */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col bg-slate-50">
        <div className="flex-1 overflow-y-auto scroll-smooth pt-16 md:pt-0">
            <div className="max-w-[1600px] mx-auto min-h-full">
                {children}
            </div>
        </div>
      </main>
    </div>
  );
}
