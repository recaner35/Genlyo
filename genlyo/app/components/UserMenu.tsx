"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function UserMenu({ user }: { user: { name: string; role: string; email: string } }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    // NextAuth'un güvenli çıkış fonksiyonu
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  return (
    <div className="relative">
      {/* PROFİL BUTONU */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
      >
        <div className="bg-blue-600 text-white font-bold w-10 h-10 rounded-lg flex items-center justify-center text-lg">
          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>
        <div className="text-left hidden md:block pr-2">
          <p className="text-sm font-bold text-slate-800">{user.name}</p>
          <p className="text-xs text-slate-500 font-medium">
            {user.role === "ADMIN" ? "Sistem Yöneticisi" : user.role === "REGION_MANAGER" ? "Bölge Müdürü" : "Mağaza Müdürü"}
          </p>
        </div>
        {/* Aşağı Ok İkonu */}
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      {/* AÇILIR MENÜ (DROPDOWN) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-50 bg-slate-50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Hesap</p>
            <p className="text-sm font-bold text-slate-700 truncate">{user.email}</p>
          </div>
          <div className="p-2 space-y-1">
            <button 
              onClick={() => { setIsOpen(false); router.push('/dashboard/change-password'); }}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>🔒</span> Şifre Değiştir
            </button>
            <div className="border-t border-slate-100 my-1"></div>
            <button 
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>🚪</span> Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}