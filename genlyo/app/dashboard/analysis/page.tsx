"use client";

import { useEffect, useState, useMemo } from "react";

const MONTHS = [
  { id: 1, name: "Ocak" }, { id: 2, name: "Şubat" }, { id: 3, name: "Mart" },
  { id: 4, name: "Nisan" }, { id: 5, name: "Mayıs" }, { id: 6, name: "Haziran" },
  { id: 7, name: "Temmuz" }, { id: 8, name: "Ağustos" }, { id: 9, name: "Eylül" },
  { id: 10, name: "Ekim" }, { id: 11, name: "Kasım" }, { id: 12, name: "Aralık" }
];

export default function AnalysisMotor1Page() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [year, setYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [endMonth, setEndMonth] = useState(currentMonth);
  
  const [level, setLevel] = useState("STORE"); 
  const [filterId, setFilterId] = useState("ALL");
  
  const [data, setData] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isForceRunning, setIsForceRunning] = useState(false);

  // 🚀 DİNAMİK PRİM BARAJ ORANLARI
  // İleride yönetim paneli yapıldığında burası bir API ile veritabanından çekilecek:
  // Örn: useEffect(() => fetch('/api/settings/premium-thresholds').then(setPremiumThresholds), [])
  const [premiumThresholds, setPremiumThresholds] = useState<number[]>([85, 95, 100, 110, 120]);

  useEffect(() => {
      if (startMonth > endMonth) setEndMonth(startMonth);
  }, [startMonth]);

  const isCurrentPeriod = useMemo(() => {
      if (data.length > 0) return data[0].isCurrentMonth;
      return false;
  }, [data]);

  useEffect(() => {
    fetch('/api/stores').then(res => res.json()).then(resData => {
        const storeList = Array.isArray(resData) ? resData : (resData.store ? [resData.store] : []);
        setStores(storeList);
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    fetchAnalysis();
  }, [year, startMonth, endMonth, level, filterId]);

  const fetchAnalysis = async (isManual = false) => {
    if (isManual) setIsForceRunning(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/analysis/motor1?year=${year}&startMonth=${startMonth}&endMonth=${endMonth}&level=${level}&filterId=${filterId}`);
      if (res.ok) {
        const result = await res.json();
        const sorted = result.sort((a: any, b: any) => b.gerceklesmeOrani - a.gerceklesmeOrani);
        setData(sorted);
      }
    } catch (err) {} finally {
      setLoading(false);
      setIsForceRunning(false);
    }
  };

  const regions = useMemo(() => {
    const uniqueRegions = new Map();
    stores.forEach(s => { if (s.region) uniqueRegions.set(s.region.id, s.region); });
    return Array.from(uniqueRegions.values());
  }, [stores]);

  const summary = useMemo(() => {
    if (data.length === 0) return { actual: 0, target: 0, eomForecast: 0, futureTarget: 0, yoy: null, mom: null, realization: 0, forecastRealization: 0 };
    
    const actual = data.reduce((sum, item) => sum + item.gerceklesen, 0);
    const target = data.reduce((sum, item) => sum + item.hedef, 0);
    const prevYrActual = data.reduce((sum, item) => sum + item.gecenYilGerceklesen, 0);
    const prevMoActual = data.reduce((sum, item) => sum + (item.gecenAyGerceklesen || 0), 0);
    const eomForecast = data.reduce((sum, item) => sum + item.aySonuTahmini, 0);
    const futureTarget = data.reduce((sum, item) => sum + item.gelecekHedefOnerisi, 0);
    
    const yoy = prevYrActual > 0 ? ((actual - prevYrActual) / prevYrActual) * 100 : null;
    const mom = prevMoActual > 0 ? ((actual - prevMoActual) / prevMoActual) * 100 : null;
    const realization = target > 0 ? (actual / target) * 100 : 0;
    
    // 🚀 TOPLAM KAPANIŞ TAHMİNİ YÜZDESİ
    const forecastRealization = target > 0 ? (eomForecast / target) * 100 : 0;

    return { actual, target, eomForecast, futureTarget, yoy, mom, realization, forecastRealization };
  }, [data]);

  const formatMoney = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(val));
  const formatPercent = (val: number | null) => val === null ? '-' : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(val) + "%";

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight italic uppercase text-slate-900">
            Stratejik <span className="text-indigo-600">Kahin Motoru</span>
          </h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            İstatistiksel Kapanış ve Prim Barajı Öngörüsü
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
            <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))} className="px-3 py-2 outline-none text-slate-700 bg-transparent cursor-pointer">
                {MONTHS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <span className="text-slate-400 px-1">-</span>
            <select value={endMonth} onChange={e => setEndMonth(Number(e.target.value))} className="px-3 py-2 outline-none text-slate-700 bg-transparent cursor-pointer">
                {MONTHS.map(m => <option key={m.id} value={m.id} disabled={m.id < startMonth}>{m.name}</option>)}
            </select>
          </div>

          <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner">
            {["STORE", "REGION", "TOTAL"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => { setLevel(lvl); setFilterId("ALL"); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${level === lvl ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {lvl === "STORE" ? "Mağaza" : lvl === "REGION" ? "Bölge" : "Genel"}
              </button>
            ))}
          </div>

          <button 
            onClick={() => fetchAnalysis(true)} 
            disabled={isForceRunning}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all uppercase flex items-center gap-2"
          >
            {isForceRunning ? <><span className="animate-spin text-sm">↻</span> İşleniyor</> : <><span className="text-sm">⚡</span> Analiz Et</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Seçili Dönem Cirosu</p>
          <h2 className="text-2xl font-black text-slate-800">{formatMoney(summary.actual)}</h2>
          <div className="mt-3 flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-[10px] font-bold ${summary.yoy === null ? 'bg-slate-100 text-slate-500' : summary.yoy >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {summary.yoy !== null && (summary.yoy >= 0 ? '▲ ' : '▼ ')}{formatPercent(summary.yoy !== null ? Math.abs(summary.yoy) : null)}
            </span>
            <span className="text-[9px] font-bold text-slate-400">Önceki Yıl Aynı Döneme Göre</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Önceki Aya Göre İvme</p>
          <h2 className="text-2xl font-black text-slate-800">
            {summary.mom !== null && summary.mom > 0 ? '+' : ''}{formatPercent(summary.mom)}
          </h2>
          <div className="mt-3 text-[10px] font-bold text-slate-400">
            Önceki Aya Göre Büyüme Hızı
          </div>
        </div>

        {isCurrentPeriod ? (
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ay Sonu Kapanış Tahmini</p>
                  <h2 className="text-2xl font-black text-emerald-400">{formatMoney(summary.eomForecast)}</h2>
                </div>
                {/* 🚀 BAŞARI TAHMİNİ (ÖZET KART) */}
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hedef Başarı Tahmini</p>
                  <h3 className={`text-xl font-black ${summary.forecastRealization >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {formatPercent(summary.forecastRealization)}
                  </h3>
                </div>
              </div>
              <div className="mt-3 w-full bg-slate-700 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${summary.realization >= 100 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${Math.min(summary.realization, 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Güncel Hedef: {formatMoney(summary.target)}</p>
            </div>
        ) : (
            <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200 shadow-inner flex items-center justify-center text-center">
                <p className="text-xs font-bold text-slate-400">Tahmin motoru sadece içinde bulunulan ay için aktiftir.</p>
            </div>
        )}

        <div className="bg-indigo-600 rounded-2xl p-5 border border-indigo-500 shadow-lg text-white">
          <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Gelecek Ay Hedef Önerisi</p>
          <h2 className="text-2xl font-black text-white">{formatMoney(summary.futureTarget)}</h2>
          <p className="text-[9px] text-indigo-200 mt-3 font-medium leading-tight">
            Şirketin geçmiş hedef büyüme trendleri kullanılarak hesaplanmıştır.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center font-black text-indigo-600 animate-pulse tracking-widest uppercase">Veri Ambarı Çözümleniyor...</div>
        ) : data.length === 0 ? (
          <div className="p-20 text-center font-black text-slate-400 tracking-widest uppercase">Seçili dönem için veri bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Birim Adı</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ciro</th>
                  
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Önceki Aya Göre</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Önceki Yıl <br/> Aynı Dönem</th>
                  
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right border-l">Güncel Hedef</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Şu Anki <br/>Gerçekleşme</th>
                  
                  {isCurrentPeriod && (
                    <>
                      <th className="p-4 text-[10px] font-black text-emerald-700 uppercase tracking-widest text-right bg-emerald-50/50 border-l border-emerald-100">Ay Sonu Tahmin</th>
                      <th className="p-4 text-[10px] font-black text-emerald-700 uppercase tracking-widest text-center bg-emerald-50/50 border-r border-emerald-100">Başarı Tahmini</th>
                      
                      {/* 🚀 DİNAMİK PRİM BARAJ BAŞLIKLARI */}
                      {premiumThresholds.map(t => (
                        <th key={t} className="p-4 text-[10px] font-black text-amber-700 uppercase tracking-widest text-right bg-amber-50/30">
                          %{t}'e Kalan
                        </th>
                      ))}
                    </>
                  )}
                  
                  <th className="p-4 text-[10px] font-black text-indigo-600 bg-indigo-50/50 uppercase tracking-widest text-right border-l border-indigo-100">Gelecek Ay <br/> Hedef Önerisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row, idx) => {
                  
                  // Kapanış yüzdesi tahmini hesaplama
                  const forecastRealization = row.hedef > 0 ? (row.aySonuTahmini / row.hedef) * 100 : 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 font-black text-xs text-slate-800">{row.ad}</td>
                      <td className="p-4 font-bold text-xs text-slate-700 text-right">{formatMoney(row.gerceklesen)}</td>
                      
                      <td className="p-4 text-center">
                        <span className={`text-[11px] font-black ${row.mom === null ? 'text-slate-400' : row.mom >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {row.mom !== null && (row.mom >= 0 ? '▲ ' : '▼ ')}{formatPercent(row.mom !== null ? Math.abs(row.mom) : null)}
                        </span>
                      </td>
                      
                      <td className="p-4 text-center">
                        <span className={`text-[11px] font-black ${row.yoy === null ? 'text-slate-400' : row.yoy >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {row.yoy !== null && (row.yoy >= 0 ? '▲ ' : '▼ ')}{formatPercent(row.yoy !== null ? Math.abs(row.yoy) : null)}
                        </span>
                      </td>

                      <td className="p-4 font-bold text-xs text-slate-500 text-right border-l">
                        {row.hedef > 0 ? formatMoney(row.hedef) : '-'}
                      </td>
                      
                      <td className="p-4">
                        {row.hedef > 0 ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className={`text-[11px] font-black w-10 text-right ${row.gerceklesmeOrani >= 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {formatPercent(row.gerceklesmeOrani)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-center text-[10px] font-bold text-slate-300">-</div>
                        )}
                      </td>

                      {isCurrentPeriod && (
                        <>
                          <td className="p-4 font-bold text-xs text-emerald-700 bg-emerald-50/30 text-right border-l border-emerald-100/50">
                            {formatMoney(row.aySonuTahmini)}
                          </td>
                          <td className="p-4 font-black text-xs text-center bg-emerald-50/30 border-r border-emerald-100/50">
                            <span className={forecastRealization >= 100 ? 'text-emerald-600' : 'text-amber-600'}>
                              {row.hedef > 0 ? formatPercent(forecastRealization) : '-'}
                            </span>
                          </td>

                          {/* 🚀 DİNAMİK PRİM BARAJ HESAPLAMALARI */}
                          {premiumThresholds.map(t => {
                            if (row.hedef <= 0) return <td key={t} className="p-4 text-center text-[10px] text-slate-300 bg-amber-50/10">-</td>;
                            
                            const thresholdValue = row.hedef * (t / 100);
                            const remaining = thresholdValue - row.gerceklesen;

                            return (
                              <td key={t} className="p-4 text-right bg-amber-50/10">
                                {remaining <= 0 ? (
                                  <span className="text-[10px] font-black text-emerald-500 flex items-center justify-end gap-1">
                                    ✅ Ulaşıldı
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-amber-700">
                                    {formatMoney(remaining)}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </>
                      )}

                      <td className="p-4 font-black text-xs text-indigo-700 bg-indigo-50/20 text-right border-l border-indigo-100">
                        {formatMoney(row.gelecekHedefOnerisi)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}