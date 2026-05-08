"use client";

import { useSession } from "next-auth/react";

export default function Header({ stores, filterId, setFilterId, level, setLevel }: any) {
  const { data: session } = useSession();

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Genlyo <span className="text-indigo-600">Pro</span></h2>
        <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter hidden lg:block">
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Mağaza / Bölge Seçici */}
        <select 
          value={filterId} 
          onChange={(e) => setFilterId(e.target.value)}
          className="bg-slate-100 border-none rounded-xl px-4 py-2 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
        >
          <option value="ALL">Tüm Mağazalar</option>
          {stores?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {session?.user?.role === "ADMIN" && (
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["STORE", "REGION"].map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${level === l ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
