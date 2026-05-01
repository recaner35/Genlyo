"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import TargetNavigationCard from "@/components/dashboard/TargetNavigationCard";

export default function DashboardHomePage() {
  const { data: session } = useSession();
  
  const [level, setLevel] = useState("STORE"); 
  const [filterId, setFilterId] = useState("ALL");
  const [stores, setStores] = useState<any[]>([]);
  
  const [data, setData] = useState({ 
      currMonthName: "...", nextMonthName: "...",
      m1CurrSales: 0, m2CurrSales: 0, hybridCurrSales: 0, currTarget: 0,
      m1Sales: 0, m2Sales: 0, hybridSales: 0, 
      m1Target: 0, m2Target: 0, hybridTarget: 0 
  });
  const [loading, setLoading] = useState(true);

  const userRole = session?.user?.role;
  const isStoreManager = userRole === "STORE_MANAGER";
  const isRegionManager = userRole === "REGION_MANAGER";
  const isAdmin = userRole === "ADMIN";

  useEffect(() => {
    fetch('/api/stores').then(res => res.json()).then(resData => {
        const storeList = Array.isArray(resData) ? resData : (resData.store ? [resData.store] : []);
        setStores(storeList);
        if (isStoreManager) {
            setLevel("STORE");
            if (storeList.length > 0) setFilterId(storeList[0].id);
        } else if (isRegionManager) {
            setLevel("REGION");
        }
    }).catch(err => console.error(err));
  }, [userRole, isStoreManager, isRegionManager]);

  useEffect(() => {
    if (session) fetchHybridData();
  }, [level, filterId, session]);

  const fetchHybridData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/hybrid?level=${level}&filterId=${filterId}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {} finally {
      setLoading(false);
    }
  };

  const regions = useMemo(() => {
    const uniqueRegions = new Map();
    stores.forEach(s => { if (s.region) uniqueRegions.set(s.region.id, s.region); });
    return Array.from(uniqueRegions.values());
  }, [stores]);

  const formatMoney = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(val || 0));

  const closingPercentage = data.currTarget > 0 ? (data.hybridCurrSales / data.currTarget) * 100 : 0;

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      
      {/* 🚀 ÜST BAŞLIK VE KONTROLLER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Hoş Geldiniz, <span className="text-indigo-600">{session?.user?.name || "Yönetici"}</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Hibrit Yapay Zeka Karar Merkezi Aktif
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {(isAdmin || (isRegionManager && level === "STORE")) && (
            <select value={filterId} onChange={e => setFilterId(e.target.value)} className="px-4 py-2.5 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-indigo-100">
              <option value="ALL">{level === "STORE" ? "Tüm Mağazalar" : "Tüm Bölgeler"}</option>
              {level === "STORE" 
                ? stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                : regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)
              }
            </select>
          )}

          {isAdmin && (
            <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner">
              {["STORE", "REGION", "TOTAL"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => { setLevel(lvl); setFilterId("ALL"); }}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${level === lvl ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {lvl === "STORE" ? "Mağaza" : lvl === "REGION" ? "Bölge" : "Genel"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🚀 ANA İÇERİK MANTIKSAL YIĞINI (STACK) */}
      <div className="space-y-8">
        
        {/* 1. ŞU AN NEREDEYİZ? (MEVCUT AY KAPANIŞ KARTI) */}
        <div className="bg-indigo-900 rounded-3xl p-8 md:p-10 border border-indigo-800 shadow-2xl relative overflow-hidden text-white flex flex-col md:flex-row gap-8 justify-between">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-700 rounded-full opacity-40 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex-1">
            <h3 className="text-2xl font-black text-white mb-6">Ay Sonu Kapanış Tahmini <span className="text-sm text-indigo-300 ml-2 font-bold">({data.currMonthName} Ayı)</span></h3>
            
            {loading ? (
                <div className="space-y-4 animate-pulse mt-4 max-w-sm">
                  <div className="h-6 w-full bg-indigo-800 rounded"></div>
                  <div className="h-6 w-full bg-indigo-800 rounded"></div>
                </div>
            ) : (
                <div className="space-y-4 font-mono text-base font-bold text-indigo-200 max-w-sm">
                    <div className="flex justify-between items-center pb-3 border-b border-indigo-800/50">
                        <span>Motor 1 Kapanış Tahmini</span>
                        <span className="text-white">{formatMoney(data.m1CurrSales)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-indigo-800/50">
                        <span>Motor 2 Kapanış Tahmini</span>
                        <span className="text-white">{formatMoney(data.m2CurrSales)}</span>
                    </div>
                </div>
            )}
            <p className="text-xs font-bold text-indigo-300/80 mt-6 leading-relaxed italic max-w-md">
                * İçinde bulunduğumuz ayın kalan günleri için, her iki motorun kendi algoritmalarıyla hesapladığı ciro projeksiyonlarının ortalamasıdır.
            </p>
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-center items-end text-right border-t md:border-t-0 md:border-l border-indigo-800/50 pt-6 md:pt-0 md:pl-10">
             <p className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-2">Hibrit Kapanış Projeksiyonu</p>
             {loading ? (
                 <div className="h-16 w-48 bg-indigo-800 rounded animate-pulse mt-2"></div>
             ) : (
                 <h2 className="text-6xl lg:text-7xl font-black text-white tracking-tight">{formatMoney(data.hybridCurrSales)}</h2>
             )}

             {(!loading && data.currTarget > 0) && (
                 <div className="w-full mt-10">
                    <div className="flex justify-between text-sm font-bold text-indigo-200 mb-3">
                        <span>Güncel Hedef: {formatMoney(data.currTarget)}</span>
                        <span className={closingPercentage >= 100 ? 'text-emerald-400' : 'text-amber-400'}>
                            %{closingPercentage.toFixed(1)} Başarı Tahmini
                        </span>
                    </div>
                    <div className="w-full h-3 bg-indigo-950 rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full transition-all duration-1000 ${closingPercentage >= 100 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${Math.min(closingPercentage, 100)}%` }}></div>
                    </div>
                 </div>
             )}
          </div>
        </div>

        {/* 2. BUGÜN NE YAPMALIYIZ? (HEDEF NAVİGASYON KARTIMIZ - TAM GENİŞLİK) */}
        <div className="w-full">
           <TargetNavigationCard />
        </div>

        {/* 3. GELECEK AY BİZİ NE BEKLİYOR? (2 KOLON) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             
             {/* GELECEK AY CİRO KARTI */}
             <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800 mb-6">Ciro Projeksiyonu <span className="text-sm font-bold text-slate-400 ml-2">({data.nextMonthName} Ayı)</span></h3>
                  
                  {loading ? (
                      <div className="space-y-4 animate-pulse mt-4">
                        <div className="h-6 w-full bg-slate-100 rounded"></div>
                        <div className="h-6 w-full bg-slate-100 rounded"></div>
                        <div className="h-12 w-full bg-slate-100 rounded mt-4"></div>
                      </div>
                  ) : (
                      <div className="space-y-4 font-mono text-base font-bold text-slate-700">
                          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                              <span>Motor 1 Ciro Tahmini</span>
                              <span>{formatMoney(data.m1Sales)}</span>
                          </div>
                          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                              <span>Motor 2 Ciro Tahmini</span>
                              <span>{formatMoney(data.m2Sales)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-3 text-xl text-indigo-700">
                              <span className="font-black">Hibrit Ciro Tahmini</span>
                              <span className="font-black">{formatMoney(data.hybridSales)}</span>
                          </div>
                      </div>
                  )}
                </div>
                <div className="mt-8">
                    <p className="text-xs font-bold text-slate-400 leading-relaxed italic">
                        * Bu rakam; Motor 1'in tarihsel büyüme ivmesi ile Motor 2'nin gelecek ayki (Makine Öğrenmesi) simülasyonlarının ortalamasıdır.
                    </p>
                </div>
             </div>

             {/* GELECEK AY HEDEF KARTI */}
             <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800 mb-6">Stratejik Hedef Önerisi <span className="text-sm font-bold text-slate-400 ml-2">({data.nextMonthName} Ayı)</span></h3>
                  
                  {loading ? (
                      <div className="space-y-4 animate-pulse mt-4">
                        <div className="h-6 w-full bg-slate-100 rounded"></div>
                        <div className="h-6 w-full bg-slate-100 rounded"></div>
                        <div className="h-12 w-full bg-slate-100 rounded mt-4"></div>
                      </div>
                  ) : (
                      <div className="space-y-4 font-mono text-base font-bold text-slate-700">
                          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                              <span>Motor 1 Hedef Tahmini</span>
                              <span>{formatMoney(data.m1Target)}</span>
                          </div>
                          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                              <span>Motor 2 Hedef Tahmini</span>
                              <span>{formatMoney(data.m2Target)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-3 text-xl text-emerald-600">
                              <span className="font-black">Hibrit Hedef Önerisi</span>
                              <span className="font-black">{formatMoney(data.hybridTarget)}</span>
                          </div>
                      </div>
                  )}
                </div>
                <div className="mt-8">
                    <p className="text-xs font-bold text-slate-400 leading-relaxed italic">
                        * Yönetimin stratejik agresifliği ve makine öğrenmesi satış öngörüleri harmanlanarak en optimum başarı barajı olarak tavsiye edilmektedir.
                    </p>
                </div>
             </div>
        </div>

      </div>
    </div>
  );
}