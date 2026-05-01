"use client";

import { useEffect, useState, useMemo } from "react";

const MONTHS = [
  { id: 1, name: "Ocak" }, { id: 2, name: "Şubat" }, { id: 3, name: "Mart" },
  { id: 4, name: "Nisan" }, { id: 5, name: "Mayıs" }, { id: 6, name: "Haziran" },
  { id: 7, name: "Temmuz" }, { id: 8, name: "Ağustos" }, { id: 9, name: "Eylül" },
  { id: 10, name: "Ekim" }, { id: 11, name: "Kasım" }, { id: 12, name: "Aralık" }
];

export default function AnalysisMotor2Page() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [level, setLevel] = useState("STORE"); 
  const [filterId, setFilterId] = useState("ALL");
  
  const [data, setData] = useState<any>({ daily: [], summary: {}, tableTotals: {} });
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stores')
      .then(res => res.json())
      .then(resData => {
        const storeList = Array.isArray(resData) ? resData : (resData.store ? [resData.store] : []);
        setStores(storeList);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    fetchAnalysis();
  }, [year, month, level, filterId]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analysis/motor2?year=${year}&month=${month}&level=${level}&filterId=${filterId}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const regions = useMemo(() => {
    const uniqueRegions = new Map();
    stores.forEach(s => { if (s.region) uniqueRegions.set(s.region.id, s.region); });
    return Array.from(uniqueRegions.values());
  }, [stores]);

  const formatMoney = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(val || 0));
  const formatPercent = (val: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(val || 0) + "%";
  const getDayName = (dayIdx: number) => ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"][dayIdx];

  const { daily, summary, tableTotals } = data;

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      
      {/* 🚀 KONTROL PANELİ */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight italic uppercase text-slate-900">
            Bağlamsal <span className="text-violet-600">Makine Öğrenmesi</span>
          </h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Motor 2: Takvim Zekası ve Gelecek Projeksiyonu
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {stores.length > 1 && level === "STORE" && (
            <select value={filterId} onChange={e => setFilterId(e.target.value)} className="px-3 py-2 text-xs font-bold bg-white border rounded-xl outline-none shadow-sm">
              <option value="ALL">Tüm Mağazalar</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}

          {stores.length > 1 && level === "REGION" && (
            <select value={filterId} onChange={e => setFilterId(e.target.value)} className="px-3 py-2 text-xs font-bold bg-white border rounded-xl outline-none shadow-sm">
              <option value="ALL">Tüm Bölgeler</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}

          <div className="flex items-center bg-white p-1 rounded-xl border shadow-sm text-xs font-bold">
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 outline-none text-slate-700 bg-transparent cursor-pointer">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-slate-300 border-l ml-1 pl-2" />
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-3 py-2 outline-none text-slate-700 bg-transparent cursor-pointer">
                {MONTHS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner">
            {["STORE", "REGION", "TOTAL"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => { setLevel(lvl); setFilterId("ALL"); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${level === lvl ? 'bg-white text-violet-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {lvl === "STORE" ? "Mağaza" : lvl === "REGION" ? "Bölge" : "Genel"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🚀 STRATEJİK GELECEK VE ÖZET KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        
        {/* KART 1: Kapanış ve Hedef Başarısı */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg relative overflow-hidden text-white flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mevcut Ay Kapanış Tahmini</p>
            <h2 className="text-2xl font-black text-emerald-400">{formatMoney(summary.currentMonthEomForecast)}</h2>
          </div>
          
          {summary.currentMonthTargetRealization !== undefined && (
            <div className="mt-3 bg-slate-800/50 rounded-lg p-2 border border-slate-600/50">
               <div className="flex justify-between items-end mb-1">
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                   Hedef: {formatMoney(summary.currentMonthTarget)}
                 </span>
                 <span className={`text-xs font-black ${summary.currentMonthTargetRealization >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                   %{summary.currentMonthTargetRealization}
                 </span>
               </div>
               <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                 <div 
                   className={`h-full rounded-full transition-all duration-1000 ${summary.currentMonthTargetRealization >= 100 ? 'bg-emerald-400' : 'bg-amber-400'}`} 
                   style={{ width: `${Math.min(100, summary.currentMonthTargetRealization)}%` }}
                 ></div>
               </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-5xl">🛒</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gelecek Ay Satış Tahmini</p>
            <h2 className="text-2xl font-black text-slate-800">{formatMoney(summary.nextMonthSales)}</h2>
          </div>
          <div className="mt-3 text-[10px] font-bold text-slate-400 leading-tight">
            Gelecek ayın hafta sonu yoğunluğu ve özel gün bağlamları simüle edilmiştir.
          </div>
        </div>

        <div className="bg-violet-600 rounded-2xl p-5 border border-violet-500 shadow-lg text-white flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl">🎯</div>
          <div>
            <p className="text-[10px] font-black text-violet-200 uppercase tracking-widest mb-1">Gelecek Ay Hedef Önerisi</p>
            <h2 className="text-2xl font-black text-white">{formatMoney(summary.nextMonthTarget)}</h2>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2 py-1 rounded text-[10px] font-bold bg-violet-800 text-violet-200">
              Makro-Ekonomik Güvenlik Ağı Aktif
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Algoritma Tutarlılık Skoru</p>
            <h2 className="text-2xl font-black text-violet-600">{formatPercent(summary.accuracy)}</h2>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${summary.accuracy >= 90 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${summary.accuracy || 0}%` }}></div>
          </div>
          <div className="mt-2 text-[9px] text-slate-400 font-bold">Son 30 günlük zeka test edilmiştir.</div>
        </div>

      </div>

      {/* 🚀 GÜNLÜK ML DETAY TABLOSU (KOMPAKT VERSİYON) */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center font-black text-violet-600 animate-pulse tracking-widest uppercase">Motor 2 Veri Küplerini Tarıyor...</div>
        ) : daily?.length === 0 ? (
          <div className="p-20 text-center font-black text-slate-400 tracking-widest uppercase">Veri bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tarih / Bağlam</th>
                  <th className="p-4 text-[10px] font-black text-slate-700 uppercase tracking-widest text-right border-l border-slate-200">Ciro (Gerçekleşen / Tahmin)</th>
                  <th className="p-4 text-[10px] font-black text-purple-600 uppercase tracking-widest text-right bg-purple-50/30 border-l border-slate-200">Günlük Hedef</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-l border-slate-200">Hedef Başarısı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daily?.map((row: any, idx: number) => {
                  
                  // Hedef Başarı Oranı (Gerçekleşen varsa)
                  const targetAchievement = (row.actualRevenue > 0 && row.dailyTargetMl > 0) 
                      ? (row.actualRevenue / row.dailyTargetMl) * 100 
                      : 0;
                  
                  return (
                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${row.isSpecial ? 'bg-amber-50/10' : row.isWeekend ? 'bg-slate-50/50' : ''}`}>
                      
                      {/* TARİH VE BAĞLAM */}
                      <td className="p-4">
                        <div className="font-black text-xs text-slate-800">
                            {row.day} {MONTHS[month-1].name} <span className="font-bold text-slate-400 ml-1">{getDayName(row.dayOfWeek)}</span>
                        </div>
                        {row.isSpecial ? (
                            <div className="text-[10px] font-black text-amber-600 mt-1 flex items-center gap-1">
                                <span>✦</span> {row.context}
                            </div>
                        ) : row.isWeekend ? (
                            <div className="text-[10px] font-bold text-indigo-400 mt-1">{row.context}</div>
                        ) : null}
                      </td>
                      
                      {/* 🚀 KOMPAKT CİRO SÜTUNU */}
                      <td className="p-4 text-right border-l border-slate-100">
                        {row.actualRevenue > 0 ? (
                           <div className="font-black text-xs text-slate-800">
                             {formatMoney(row.actualRevenue)}
                           </div>
                        ) : (
                           <div className="font-bold text-xs text-violet-500 italic flex items-center justify-end gap-1.5">
                             <span className="text-[9px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded not-italic">AI</span>
                             {formatMoney(row.mlPrediction)}
                           </div>
                        )}
                      </td>

                      {/* GÜNLÜK HEDEF */}
                      <td className="p-4 font-bold text-xs text-purple-700 bg-purple-50/10 text-right border-l border-slate-100">
                        {formatMoney(row.dailyTargetMl)}
                      </td>

                      {/* HEDEF BAŞARISI (%) */}
                      <td className="p-4 text-center border-l border-slate-100">
                        {row.actualRevenue > 0 ? (
                           <span className={`text-[10px] font-black px-2 py-1 rounded ${targetAchievement >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                             %{targetAchievement.toFixed(1)}
                           </span>
                        ) : (
                           <span className="text-[10px] font-bold text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              
              {/* 🚀 KOMPAKT TABLO ALTI TOPLAMLARI */}
              {summary && (
                <tfoot className="bg-slate-800 text-white">
                  <tr>
                    <td className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-300 text-right">
                      Aylık Kapanış Tahmini:
                    </td>
                    <td className="p-4 font-black text-xs text-emerald-400 text-right bg-slate-900/50">
                      {formatMoney(summary.currentMonthEomForecast)}
                    </td>
                    <td className="p-4 font-black text-xs text-purple-300 text-right bg-purple-900/50 border-l border-slate-700">
                      {tableTotals?.dailyTargetMl ? formatMoney(tableTotals.dailyTargetMl) : formatMoney(summary.currentMonthTarget)}
                    </td>
                    <td className="p-4 text-center border-l border-slate-700">
                      {summary.currentMonthTargetRealization !== undefined && (
                        <span className={`text-[10px] font-black px-2 py-1 rounded ${summary.currentMonthTargetRealization >= 100 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                          %{summary.currentMonthTargetRealization}
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
              
            </table>
          </div>
        )}
      </div>
    </div>
  );
}