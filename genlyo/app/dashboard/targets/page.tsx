"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";

const MONTHS = [
  { id: 1, name: "Ocak" }, { id: 2, name: "Şubat" }, { id: 3, name: "Mart" },
  { id: 4, name: "Nisan" }, { id: 5, name: "Mayıs" }, { id: 6, name: "Haziran" },
  { id: 7, name: "Temmuz" }, { id: 8, name: "Ağustos" }, { id: 9, name: "Eylül" },
  { id: 10, name: "Ekim" }, { id: 11, name: "Kasım" }, { id: 12, name: "Aralık" }
];

const PRIM_THRESHOLDS = [0.85, 0.95, 1.0, 1.1, 1.2];

export default function TargetsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "STORE_MANAGER";
  
  const canEditTargets = userRole === "ADMIN" || userRole === "STORE_MANAGER" || userRole === "REGION_MANAGER";
  
  const currentYear = new Date().getFullYear();
  const currentMonthValue = new Date().getMonth() + 1; // 🚀 GÜNCEL AY

  const [viewMode, setViewMode] = useState<"VIEW" | "ENTRY">("VIEW");
  const [targets, setTargets] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedYear, setSelectedYear] = useState(currentYear); 
  // 🚀 DÜZELTME 1: Sayfa artık varsayılan olarak "ALL" değil, "Mevcut Ay" ile açılıyor.
  const [selectedMonth, setSelectedMonth] = useState<number | "ALL">(currentMonthValue);
  const [storeSearch, setStoreSearch] = useState("");
  
  const [entryData, setEntryData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  const [motorData, setMotorData] = useState<any>(null);
  const [loadingMotor, setLoadingMotor] = useState(false);

  useEffect(() => { fetchData(); }, [selectedYear]);

  useEffect(() => {
    if (selectedMonth !== "ALL") fetchMotor2Data();
    else setMotorData(null);
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resT, resS] = await Promise.all([
        fetch(`/api/targets?year=${selectedYear}&_t=${Date.now()}`, { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        }),
        fetch(`/api/stores?_t=${Date.now()}`, { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        })
      ]);
      const tData = await resT.json();
      const sData = await resS.json();

      const targetsArray = Array.isArray(tData) ? tData : [];
      setTargets(targetsArray);
      
      const storesList = Array.isArray(sData) ? sData : (sData.store ? [sData.store] : []);
      setStores(storesList);

      const initialEntryData: any = {};
      targetsArray.forEach((t: any) => {
         if (t.store && t.store.id) {
             initialEntryData[`${t.store.id}-${t.month}`] = t.amount;
         }
      });
      setEntryData(initialEntryData);

    } catch (err) { setTargets([]); } finally { setLoading(false); }
  };

  const fetchMotor2Data = async () => {
    setLoadingMotor(true);
    try {
      const res = await fetch(`/api/analysis/motor2?year=${selectedYear}&month=${selectedMonth}&level=STORE&filterId=ALL&_t=${Date.now()}`, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (res.ok) {
        const result = await res.json();
        setMotorData(result);
      }
    } catch (err) { console.error(err); } finally { setLoadingMotor(false); }
  };

  const handleSaveTargets = async () => {
    setIsSaving(true);
    
    const payload = Object.entries(entryData)
      .filter(([_, amount]) => amount !== "" && amount !== null && amount !== undefined)
      .map(([key, amount]) => {
        const parts = key.split('-');
        const month = parts.pop(); 
        const storeId = parts.join('-'); 
        
        return { storeId, month, year: selectedYear, amount };
      });
    
    if (payload.length === 0) {
        alert("⚠️ Kaydedilecek yeni bir veri bulunamadı.");
        setIsSaving(false);
        return;
    }

    try {
        const res = await fetch('/api/targets', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        
        if (res.ok) { 
            setViewMode("VIEW"); 
            setSelectedMonth(currentMonthValue); // Kayıttan sonra mevcut aya dönsün
            fetchData(); 
            alert("✅ Hedefler başarıyla kaydedildi!");
        } else {
            const errorData = await res.json();
            alert(`❌ Kaydedilirken Hata Oluştu:\n${errorData.error}`);
        }
    } catch(err) {
        alert("❌ Sunucuya bağlanırken bir hata oluştu!");
    }
    setIsSaving(false);
  };

  const filteredData = useMemo(() => {
    let result = [...targets];
    if (selectedMonth !== "ALL") result = result.filter(t => t.month === Number(selectedMonth));
    if (storeSearch) {
      const s = storeSearch.toLocaleLowerCase('tr-TR');
      result = result.filter(t => t.store?.name?.toLocaleLowerCase('tr-TR').includes(s));
    }
    return result;
  }, [targets, selectedMonth, storeSearch]);

  const dailyRemainingStats = useMemo(() => {
    if (!motorData || !motorData.daily) return [];
    
    const T = motorData.summary?.currentMonthTarget || 0;
    const S_mtd = motorData.daily.reduce((acc: number, curr: any) => acc + (curr.actualRevenue || 0), 0);
    
    const totalDaysInMonth = new Date(selectedYear, Number(selectedMonth), 0).getDate();
    const passedDays = motorData.daily.filter((d: any) => d.actualRevenue > 0).length;
    const remainingDays = Math.max(1, totalDaysInMonth - passedDays);

    return PRIM_THRESHOLDS.map(threshold => {
        const thresholdTarget = T * threshold;
        const remainingToThreshold = thresholdTarget - S_mtd;
        const dailyNeeded = remainingToThreshold > 0 ? remainingToThreshold / remainingDays : 0;
        return {
            label: `%${Math.round(threshold * 100)}`,
            totalToReach: thresholdTarget,
            dailyNeeded: dailyNeeded,
            isReached: remainingToThreshold <= 0 && T > 0
        };
    });
  }, [motorData, selectedYear, selectedMonth]);

  const formatMoney = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(val || 0));
  const getDayName = (dayIdx: number) => ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"][dayIdx];

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  // 🚀 GRAFİK İÇİN MAKSİMUM DEĞER HESAPLAMA
  const maxChartValue = motorData?.daily ? Math.max(...motorData.daily.map((d:any) => Math.max(d.dailyTargetMl, d.actualRevenue, d.mlPrediction, 1000))) : 1;

  return (
    <div className="p-4 md:p-8 bg-slate-50/50 min-h-screen font-sans text-slate-900 animate-in fade-in duration-500">
      
      {/* 🚀 ÜST BAŞLIK VE KONTROLLER (Daha Kompakt) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight italic text-slate-900 uppercase">
             Hedef <span className="text-indigo-600">Navigasyonu</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Satış & Yapay Zeka Prim Eşikleri
          </p>
        </div>
        {canEditTargets && (
            <button onClick={() => setViewMode(viewMode === "VIEW" ? "ENTRY" : "VIEW")} className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md ${viewMode === "ENTRY" ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white border border-slate-200 text-indigo-600 hover:border-indigo-300'}`}>
              {viewMode === "VIEW" ? "⚙️ Bütçe Planlama" : "📊 Analize Dön"}
            </button>
        )}
      </div>

      {/* 🚀 FİLTRE ÇUBUĞU */}
      <div className="bg-white p-2 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-2 mb-6">
        <input type="text" placeholder="Mağaza ara..." className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-transparent focus:border-indigo-100 text-sm font-bold outline-none transition-all" onChange={e => setStoreSearch(e.target.value)} />
        <select className="px-4 py-2.5 rounded-xl bg-slate-50 border border-transparent text-sm font-bold text-slate-700 outline-none hover:bg-slate-100 transition-all cursor-pointer" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y} Mali Yılı</option>)}
        </select>
        <select className="px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-sm font-black text-indigo-700 outline-none hover:bg-indigo-100 transition-all cursor-pointer" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}>
          <option value="ALL">Yıllık Genel Bakış</option>
          {MONTHS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {viewMode === "VIEW" ? (
        <div className="space-y-6">
          
          {selectedMonth !== "ALL" && motorData && (
            <>
              {/* 🚀 PRİM EŞİKLERİ (Kompakt Ribbon) */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                 {dailyRemainingStats.map((stat, i) => (
                    <div key={i} className={`p-4 rounded-2xl border transition-all ${stat.isReached ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500 text-white shadow-md' : 'bg-white border-slate-100 shadow-sm'}`}>
                       <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${stat.isReached ? 'text-emerald-100' : 'text-slate-400'}`}>{stat.label} HEDEFİ</p>
                       {stat.isReached ? (
                          <div className="flex items-center gap-1.5 mt-1">
                             <span className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-emerald-600 text-[10px] font-black">✓</span>
                             <span className="text-sm font-black">AŞILDI</span>
                          </div>
                       ) : (
                          <>
                             <h4 className="text-lg font-black leading-none mt-1">{formatMoney(stat.dailyNeeded)}</h4>
                             <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Kalan Günlük Ort.</p>
                          </>
                       )}
                    </div>
                 ))}
              </div>

              {/* 🚀 ALT BÖLÜM: TABLO VE GRAFİK YAN YANA */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                  
                  {/* SOL (Tablo - %66 Genişlik) */}
                  <div className="xl:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                     <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-sm font-black italic uppercase text-slate-800">Günlük <span className="text-indigo-600">Performans Akışı</span></h3>
                     </div>
                     <div className="overflow-x-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-200">
                        <table className="w-full text-left whitespace-nowrap">
                           <thead className="sticky top-0 z-20 bg-slate-100/90 backdrop-blur-md border-b border-slate-200/50">
                              <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                 <th className="py-3 px-5">Tarih / Bağlam</th>
                                 <th className="py-3 px-5 text-right">Ciro Durumu</th>
                                 <th className="py-3 px-5 text-right border-l border-slate-200/50">Sistem Hedefi</th>
                                 <th className="py-3 px-5 text-center border-l border-slate-200/50">Skor</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {motorData.daily?.map((row: any, idx: number) => {
                                 const isActual = row.actualRevenue > 0;
                                 const achievement = (isActual && row.dailyTargetMl > 0) ? (row.actualRevenue / row.dailyTargetMl) * 100 : 0;
                                 
                                 return (
                                    <tr key={idx} className={`group transition-colors ${row.isSpecial ? 'bg-amber-50/30 hover:bg-amber-50/60' : row.isWeekend ? 'bg-slate-50/50 hover:bg-slate-100/50' : 'hover:bg-slate-50'}`}>
                                       <td className="py-3 px-5">
                                          <div className="font-black text-xs text-slate-800 flex flex-col">
                                             <span>{row.day} {MONTHS.find(m => m.id === Number(selectedMonth))?.name} <span className="text-slate-400 ml-1 font-bold">{getDayName(row.dayOfWeek)}</span></span>
                                             
                                             {/* 🚀 BAĞLAMSAL ŞIK ROZETLER (Anneler Günü, Black Friday vs.) */}
                                             {(row.contexts && row.contexts.length > 0) ? (
                                                <div className="mt-1 flex flex-wrap gap-2">
                                                  {row.contexts.map((c:any, i:number) => (
                                                    <span key={i} className={`w-max text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${row.isSpecial ? 'bg-amber-100 text-amber-700 border border-amber-200/50' : 'bg-slate-200 text-slate-500'}`}>
                                                       {row.isSpecial && i === 0 ? '✦ ' : ''}{c.name}{c.marker && c.marker !== '0' ? ` (${c.marker})` : ''}
                                                    </span>
                                                  ))}
                                                </div>
                                             ) : null}
                                          </div>
                                       </td>
                                       <td className="py-3 px-5 text-right font-mono">
                                          {isActual ? (
                                             <div className="text-sm font-black text-slate-900">{formatMoney(row.actualRevenue)}</div>
                                          ) : (
                                             <div className="flex items-center justify-end gap-1.5">
                                                <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded font-black italic">AI</span>
                                                <span className="text-sm font-bold text-indigo-400 italic">{formatMoney(row.mlPrediction)}</span>
                                             </div>
                                          )}
                                       </td>
                                       <td className="py-3 px-5 text-right border-l border-slate-100/50 font-bold text-slate-600 text-sm">
                                          {formatMoney(row.dailyTargetMl)}
                                       </td>
                                       <td className="py-3 px-5 text-center border-l border-slate-100/50">
                                          {isActual ? (
                                             <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${achievement >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                %{achievement.toFixed(1)}
                                             </span>
                                          ) : (
                                             <span className="text-slate-300 font-bold">—</span>
                                          )}
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  {/* SAĞ (Mini Animasyonlu Grafik - %33 Genişlik) */}
                  <div className="xl:col-span-1 bg-gradient-to-b from-slate-900 to-indigo-950 rounded-[2rem] shadow-xl border border-indigo-900 overflow-hidden flex flex-col">
                      <div className="px-6 py-5 border-b border-white/10">
                         <h3 className="text-sm font-black text-white tracking-widest uppercase">Trend <span className="text-indigo-400">Analizi</span></h3>
                         <p className="text-[9px] text-indigo-200/70 font-bold mt-1">Gerçekleşen Ciro vs Hedef Yoğunluğu</p>
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col justify-end min-h-[400px]">
                         {/* CSS Tabanlı Şık Bar Grafiği */}
                         <div className="flex items-end justify-between h-64 gap-0.5 w-full">
                            {motorData.daily?.map((d: any, i: number) => {
                               const isActual = d.actualRevenue > 0;
                               const targetHeight = `${Math.max(2, (d.dailyTargetMl / maxChartValue) * 100)}%`;
                               const actualHeight = `${Math.max(2, ((isActual ? d.actualRevenue : d.mlPrediction) / maxChartValue) * 100)}%`;
                               
                               return (
                                 <div key={i} className="relative flex-1 h-full flex items-end group">
                                    {/* Arka Plan Hedef Barı (Şeffaf Beyaz) */}
                                    <div className="absolute bottom-0 w-full bg-white/10 rounded-t-sm transition-all" style={{ height: targetHeight }}></div>
                                    
                                    {/* Ön Plan Gerçekleşen Barı (Canlı Renk) */}
                                    <div 
                                      className={`absolute bottom-0 w-full rounded-t-sm transition-all duration-700 ease-out group-hover:opacity-80 ${isActual ? (d.actualRevenue >= d.dailyTargetMl ? 'bg-emerald-400' : 'bg-rose-400') : 'bg-indigo-500/50'}`} 
                                      style={{ height: actualHeight }}
                                    ></div>
                                    
                                    {/* Hover Tooltip */}
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-[8px] font-black p-1.5 rounded shadow-xl pointer-events-none z-50 whitespace-nowrap transition-opacity">
                                       {d.day} {MONTHS.find(m => m.id === Number(selectedMonth))?.name} <br/>
                                       <span className={isActual ? 'text-indigo-600' : 'text-slate-400'}>{formatMoney(isActual ? d.actualRevenue : d.mlPrediction)}</span>
                                    </div>
                                 </div>
                               )
                            })}
                         </div>
                         
                         {/* Grafik Lejantı */}
                         <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-300"><span className="w-2 h-2 rounded bg-white/20"></span> Sistem Hedefi</div>
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-300"><span className="w-2 h-2 rounded bg-emerald-400"></span> Gerçekleşen</div>
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-300"><span className="w-2 h-2 rounded bg-indigo-500/50"></span> AI Tahmini</div>
                         </div>
                      </div>
                  </div>

              </div>
            </>
          )}

          {/* YILLIK GENEL LİSTE (ALL Seçildiğinde Çalışır) */}
          {selectedMonth === "ALL" && (
             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                   <h3 className="text-sm font-black italic uppercase text-slate-800">Yıllık <span className="text-indigo-600">Özet Panosu</span></h3>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                         <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="py-4 px-6">Dönem</th>
                            <th className="py-4 px-6">Mağaza</th>
                            <th className="py-4 px-6 text-right">Hedef</th>
                            <th className="py-4 px-6 text-right">Gerçekleşen</th>
                            <th className="py-4 px-6 text-center">Skor</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {filteredData.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                               <td className="py-4 px-6 font-bold text-sm text-slate-700">{MONTHS.find(m => m.id === t.month)?.name} {t.year}</td>
                               <td className="py-4 px-6 font-black text-sm text-slate-900">{t.store?.name}</td>
                               <td className="py-4 px-6 text-right font-mono text-slate-500">{formatMoney(t.amount)}</td>
                               <td className="py-4 px-6 text-right font-mono font-bold text-slate-800">{formatMoney(t.actual)}</td>
                               <td className="py-4 px-6 text-center">
                                  <span className={`px-2 py-1 rounded text-[10px] font-black ${t.realization >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                                     %{t.realization.toFixed(1)}
                                  </span>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          )}
        </div>
      ) : (
        /* ADMİN & MAĞAZA HEDEF GİRİŞİ (ENTRY MODU) */
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b flex flex-col md:flex-row justify-between items-center bg-slate-50/80 gap-4">
                <div>
                   <h2 className="text-xl font-black italic uppercase">Bütçe <span className="text-indigo-600">Planlama</span></h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Yıllık hedefleri mağaza bazlı girin</p>
                </div>
                <button onClick={handleSaveTargets} disabled={isSaving} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {isSaving ? "KAYDEDİLİYOR..." : "SİSTEME KAYDET"}
                </button>
            </div>
            <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white z-20 shadow-sm border-b border-slate-200">
                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="py-4 px-6 border-r border-slate-100 min-w-[200px] bg-white sticky left-0 z-30">Mağaza</th>
                            {MONTHS.map(m => <th key={m.id} className="py-4 px-4 text-center min-w-[120px]">{m.name}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stores.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-6 sticky left-0 bg-white border-r border-slate-100 font-black text-xs text-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-10">{s.name}</td>
                                {MONTHS.map(m => {
                                    const entryKey = `${s.id}-${m.id}`;
                                    return (
                                        <td key={m.id} className="p-2">
                                            <input type="number" value={entryData[entryKey] || ""} placeholder="0" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-black text-center outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300" onChange={(e) => setEntryData({ ...entryData, [entryKey]: e.target.value })} />
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
}