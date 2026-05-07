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
  const isAdmin = userRole === "ADMIN";

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [viewMode, setViewMode] = useState<"VIEW" | "ENTRY">("VIEW");
  const [targets, setTargets] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedYear, setSelectedYear] = useState(currentYear); 
  const [selectedMonth, setSelectedMonth] = useState<number | "ALL">(currentMonth);
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
      // 🚀 DÜZELTME: URL'nin sonuna Date.now() ekleyerek ve Cache-Control atayarak tarayıcının hafızadan eski veriyi getirmesini kilitledik.
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
      if (isAdmin) {
          setStores(storesList);
      } else if (userRole === "STORE_MANAGER") {
          const myStoreId = (session?.user as any)?.storeId;
          const myStore = storesList.find((s: any) => s.id === myStoreId);
          setStores(myStore ? [myStore] : []);
      } else if (userRole === "REGION_MANAGER") {
          const myRegionId = (session?.user as any)?.regionId;
          const myStores = storesList.filter((s: any) => s.regionId === myRegionId);
          setStores(myStores);
      }

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
      // 🚀 DÜZELTME: Aynı önbellek kırma taktiğini motor analizi için de yapıyoruz.
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
        const [storeId, month] = key.split('-');
        return { storeId, month, year: selectedYear, amount };
      });
    
    try {
        const res = await fetch('/api/targets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) { 
            setViewMode("VIEW"); 
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
            label: `%${threshold * 100}`,
            totalToReach: thresholdTarget,
            dailyNeeded: dailyNeeded,
            isReached: remainingToThreshold <= 0
        };
    });
  }, [motorData, selectedYear, selectedMonth]);

  const formatMoney = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(val || 0));
  const formatPercent = (val: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(val || 0) + "%";
  const getDayName = (dayIdx: number) => ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"][dayIdx];

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="p-6 md:p-10 bg-slate-50/50 min-h-screen font-sans text-slate-900">
      
      {/* BAŞLIK VE KONTROLLER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight italic text-slate-900 uppercase">
             Hedef <span className="text-indigo-600">Navigasyonu</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
            Günlük Satış, Motor 2 Tahminleri ve Prim Eşikleri
          </p>
        </div>
        {canEditTargets && (
            <button onClick={() => setViewMode(viewMode === "VIEW" ? "ENTRY" : "VIEW")} className={`px-8 py-3.5 rounded-2xl font-black transition-all shadow-lg ${viewMode === "ENTRY" ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-500'}`}>
              {viewMode === "VIEW" ? "⚙️ Hedef Tanımla" : "📊 Analize Dön"}
            </button>
        )}
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-2 mb-8">
        <input type="text" placeholder="Mağaza ara..." className="flex-1 pl-6 pr-4 py-3.5 rounded-xl bg-transparent text-sm font-bold outline-none" onChange={e => setStoreSearch(e.target.value)} />
        <select className="px-6 py-3.5 rounded-xl bg-transparent text-sm font-bold text-slate-700 outline-none hover:bg-slate-50" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y} Mali Yılı</option>)}
        </select>
        <select className="px-6 py-3.5 rounded-xl bg-transparent text-sm font-bold text-slate-700 outline-none hover:bg-slate-50" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}>
          <option value="ALL">Yıllık Genel Bakış</option>
          {MONTHS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {viewMode === "VIEW" ? (
        <div className="space-y-8 animate-in fade-in duration-700">
          
          {selectedMonth !== "ALL" && motorData && (
            <>
              {/* ÜST PANEL: PRIM EŞİKLERİ VE KALAN GÜNLÜK İHTİYAÇ */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                 {dailyRemainingStats.map((stat, i) => (
                    <div key={i} className={`p-5 rounded-3xl border transition-all ${stat.isReached ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-100 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
                       <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${stat.isReached ? 'textemerald-100' : 'text-slate-400'}`}>{stat.label} HEDEFİ</p>
                       {stat.isReached ? (
                          <div className="flex items-center gap-2">
                             <span className="text-xl font-black">✓ TAMAM</span>
                          </div>
                       ) : (
                          <>
                             <h4 className="text-lg font-black text-slate-900 leading-tight">{formatMoney(stat.dailyNeeded)}</h4>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">Kalan Günlük</p>
                          </>
                       )}
                    </div>
                 ))}
              </div>

              {/* GÜNLÜK OPERASYON TABLOSU */}
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
                 <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-xl font-black italic uppercase">Günlük <span className="text-indigo-600">Performans Akışı</span></h3>
                    <div className="flex gap-4">
                       <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <span className="w-3 h-3 rounded-full bg-indigo-500"></span> Tahmin (AI)
                       </div>
                       <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <span className="w-3 h-3 rounded-full bg-slate-800"></span> Gerçekleşen
                       </div>
                    </div>
                 </div>
                 <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200">
                    <table className="w-full text-left whitespace-nowrap">
                       <thead className="sticky top-0 z-20 bg-white border-b border-slate-200">
                          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                             <th className="p-6">Tarih / Bağlam</th>
                             <th className="p-6 text-right">Ciro Durumu</th>
                             <th className="p-6 text-right border-l">Günlük Hedef</th>
                             <th className="p-6 text-center border-l">Başarı Skoru</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {motorData.daily?.map((row: any, idx: number) => {
                             const isActual = row.actualRevenue > 0;
                             const achievement = (isActual && row.dailyTargetMl > 0) ? (row.actualRevenue / row.dailyTargetMl) * 100 : 0;
                             
                             return (
                                <tr key={idx} className={`group transition-all ${row.isSpecial ? 'bg-amber-50/20' : row.isWeekend ? 'bg-slate-50/50' : ''}`}>
                                   <td className="p-6">
                                      <div className="font-black text-sm text-slate-800">
                                         {row.day} {MONTHS.find(m => m.id === Number(selectedMonth))?.name} 
                                         <span className="text-slate-400 ml-2 font-bold">{getDayName(row.dayOfWeek)}</span>
                                      </div>
                                      {row.context !== "Standart" && (
                                         <div className={`text-[10px] font-black mt-1 uppercase tracking-tighter ${row.isSpecial ? 'text-amber-600' : 'text-indigo-400'}`}>
                                            {row.isSpecial && "✦ "} {row.context}
                                         </div>
                                      )}
                                   </td>
                                   <td className="p-6 text-right font-mono">
                                      {isActual ? (
                                         <div className="text-base font-black text-slate-900">{formatMoney(row.actualRevenue)}</div>
                                      ) : (
                                         <div className="flex items-center justify-end gap-2">
                                            <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black italic">AI</span>
                                            <span className="text-base font-bold text-indigo-500 italic">{formatMoney(row.mlPrediction)}</span>
                                         </div>
                                      )}
                                   </td>
                                   <td className="p-6 text-right border-l font-bold text-slate-500 bg-slate-50/30">
                                      {formatMoney(row.dailyTargetMl)}
                                   </td>
                                   <td className="p-6 text-center border-l">
                                      {isActual ? (
                                         <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${achievement >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                            %{achievement.toFixed(1)}
                                         </span>
                                      ) : (
                                         <span className="text-slate-300">—</span>
                                      )}
                                   </td>
                                </tr>
                             );
                          })}
                       </tbody>
                       <tfoot className="sticky bottom-0 bg-slate-900 text-white z-20">
                          <tr className="font-black text-sm">
                             <td className="p-6 text-right uppercase text-[10px] text-slate-400 tracking-widest">Aylık Toplam / Projeksiyon:</td>
                             <td className="p-6 text-right text-emerald-400 font-mono">{formatMoney(motorData.summary.currentMonthEomForecast)}</td>
                             <td className="p-6 text-right border-l border-slate-700 text-indigo-300 font-mono">{formatMoney(motorData.summary.currentMonthTarget)}</td>
                             <td className="p-6 text-center border-l border-slate-700">
                                <span className={`px-3 py-1 rounded-lg text-xs ${motorData.summary.currentMonthTargetRealization >= 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                   %{motorData.summary.currentMonthTargetRealization}
                                </span>
                             </td>
                          </tr>
                       </tfoot>
                    </table>
                 </div>
              </div>
            </>
          )}

          {/* YILLIK GENEL LİSTE */}
          {selectedMonth === "ALL" && (
             <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-slate-50/80 border-b">
                      <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                         <th className="p-6">Dönem</th>
                         <th className="p-6">Mağaza</th>
                         <th className="p-6 text-right">Hedef</th>
                         <th className="p-6 text-right">Gerçekleşen</th>
                         <th className="p-6 text-center">Skor</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {filteredData.map(t => (
                         <tr key={t.id} className="hover:bg-slate-50 transition-all font-bold">
                            <td className="p-6">{MONTHS.find(m => m.id === t.month)?.name} {t.year}</td>
                            <td className="p-6">{t.store?.name}</td>
                            <td className="p-6 text-right text-slate-600">{formatMoney(t.amount)}</td>
                            <td className="p-6 text-right text-emerald-600">{formatMoney(t.actual)}</td>
                            <td className="p-6 text-center">%{t.realization.toFixed(1)}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          )}
        </div>
      ) : (
        /* ADMİN & MAĞAZA HEDEF GİRİŞİ */
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-10 border-b flex justify-between items-center bg-slate-50/50">
                <h2 className="text-2xl font-black italic">Bütçe <span className="text-indigo-600">Planlama</span></h2>
                <button onClick={handleSaveTargets} disabled={isSaving} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 disabled:opacity-50">
                  {isSaving ? "KAYDEDİLİYOR..." : "SİSTEME KAYDET"}
                </button>
            </div>
            <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white z-20 shadow-sm">
                        <tr className="text-[10px] font-black text-slate-400 uppercase">
                            <th className="p-6 border-r w-72">Mağaza</th>
                            {MONTHS.map(m => <th key={m.id} className="p-6 text-center">{m.name}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stores.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/30">
                                <td className="p-6 sticky left-0 bg-white border-r font-black text-sm">{s.name}</td>
                                {MONTHS.map(m => {
                                    const entryKey = `${s.id}-${m.id}`;
                                    return (
                                        <td key={m.id} className="p-4">
                                            <input type="number" value={entryData[entryKey] || ""} className="w-full p-3 rounded-xl border border-slate-200 text-sm font-black text-center outline-none focus:border-indigo-500" onChange={(e) => setEntryData({ ...entryData, [entryKey]: e.target.value })} />
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
