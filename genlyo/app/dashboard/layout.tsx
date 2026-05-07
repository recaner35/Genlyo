"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

// 🚀 YENİ: "Günlük Kasa Raporu" (daily-tasks) eklendi
const MENU_ITEMS = [
  { name: "Ana Sayfa", path: "/dashboard", icon: "📊", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
  { name: "Kanal Yönetimi", path: "/dashboard/channels", icon: "🏢", roles: ["ADMIN"] },
  { name: "Bölge Yönetimi", path: "/dashboard/regions", icon: "🗺️", roles: ["ADMIN"] },
  { name: "Mağaza Yönetimi", path: "/dashboard/stores", icon: "🏪", roles: ["ADMIN", "REGION_MANAGER"] },
  { name: "Günlük Kasa Raporu", path: "/dashboard/daily-tasks", icon: "💵", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
  { name: "Personel Yönetimi", path: "/dashboard/personnel", icon: "👥", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
  { name: "Prim Kuralları", path: "/dashboard/bonus-rules", icon: "⚙️", roles: ["ADMIN"] }, 
  { name: "Hedef Yönetimi", path: "/dashboard/targets", icon: "🎯", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
  { name: "Ciro Yönetimi", path: "/dashboard/sales", icon: "💰", roles: ["ADMIN", "REGION_MANAGER", "STORE_MANAGER"] },
  { name: "Performans Paneli", path: "/dashboard/store-performance", icon: "🏆", roles: ["ADMIN", "STORE_MANAGER"] }, 
  { name: "Raporlar", path: "/dashboard/analysis", icon: "📈", roles: ["ADMIN", "REGION_MANAGER"] },
  { name: "YZ Tahminleri", path: "/dashboard/analysis/motor2", icon: "🤖", roles: ["ADMIN"] },
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
      
      {/* 📱 MOBİL: ÜST BİLGİ VE HAMBURGER MENÜ */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 z-40 flex justify-between items-center px-4 shadow-sm">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-200">G</div>
           <span className="font-black text-slate-800 tracking-tight italic">Genlyo</span>
        </div>
        <button onClick={() => setIsMobileOpen(true)} className="p-2 -mr-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>

      {/* 🌑 MOBİL: ARKA PLAN KARARTMASI (OVERLAY) */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* 🚀 SOL MENÜ (SIDEBAR) */}
      <aside 
        className={`
          fixed md:relative inset-y-0 left-0 z-50 h-screen bg-white border-r border-slate-200 flex flex-col shadow-2xl md:shadow-none transition-all duration-300 ease-in-out overflow-x-hidden
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isDesktopCollapsed ? 'md:w-20' : 'md:w-72'} w-72 flex-shrink-0
        `}
      >
        {/* LOGO & DARALTMA BUTONU */}
        <div className={`h-20 flex items-center border-b border-slate-100 transition-all ${isDesktopCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
           
           {!isDesktopCollapsed ? (
               <Link href="/dashboard" className="flex items-center gap-3">
                  <div className="w-9 h-9 min-w-[2.25rem] bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-200 text-lg">G</div>
                  <span className="font-black text-2xl text-slate-800 tracking-tight italic">Genlyo</span>
               </Link>
           ) : (
               <button onClick={() => setIsDesktopCollapsed(false)} className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Menüyü Genişlet">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
               </button>
           )}

           {!isDesktopCollapsed && (
               <button onClick={() => setIsDesktopCollapsed(true)} className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
               </button>
           )}

           <button onClick={() => setIsMobileOpen(false)} className="md:hidden p-2 -mr-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        {/* KULLANICI PROFİL MİNYATÜRÜ */}
        <div className={`py-6 border-b border-slate-100 flex items-center ${isDesktopCollapsed ? 'justify-center px-0' : 'px-6 gap-3'}`}>
           <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white font-black shadow-md border-2 border-white">
              {session?.user?.name?.charAt(0) || "U"}
           </div>
           {!isDesktopCollapsed && (
               <div className="overflow-hidden whitespace-nowrap">
                  <p className="text-sm font-black text-slate-800 truncate">{session?.user?.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{session?.user?.role?.replace('_', ' ')}</p>
               </div>
           )}
        </div>

        {/* MENÜ LİNKLERİ */}
        <nav className={`flex-1 overflow-y-auto scrollbar-none space-y-2 ${isDesktopCollapsed ? 'p-3' : 'p-4'}`}>
          {filteredMenu.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`
                  flex items-center rounded-xl font-bold transition-all group relative
                  ${isDesktopCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-3.5'}
                  ${isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100 border border-indigo-100/50' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'}
                `}
                title={isDesktopCollapsed ? item.name : ""}
              >
                <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                   {item.icon}
                </span>
                {!isDesktopCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 rounded-r-full"></div>}
              </Link>
            );
          })}
        </nav>

        {/* ÇIKIŞ YAP BUTONU */}
        <div className={`border-t border-slate-100 bg-slate-50/50 mt-auto ${isDesktopCollapsed ? 'p-3' : 'p-4'}`}>
           <button 
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={`flex items-center rounded-xl font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all w-full group relative ${isDesktopCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-3.5'}`}
              title={isDesktopCollapsed ? "Çıkış Yap" : ""}
           >
              <span className="text-xl group-hover:rotate-12 transition-transform">🚪</span>
              {!isDesktopCollapsed && <span className="whitespace-nowrap">Sistemden Çık</span>}
           </button>
        </div>
      </aside>

      {/* 🌌 ANA İÇERİK ALANI */}
      <main className="flex-1 h-screen overflow-y-auto pt-16 md:pt-0 bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200">
        {children}
      </main>
    </div>
  );
}