"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

const PRIM_THRESHOLDS = [0.85, 0.95, 1.0, 1.1, 1.2];

export default function TargetNavigationCard() {
  const [motorData, setMotorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const today = new Date().getDate();

  useEffect(() => {
    fetchMotor2Data();
  }, []);

  const fetchMotor2Data = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analysis/motor2?year=${currentYear}&month=${currentMonth}&level=STORE&filterId=ALL`, { cache: 'no-store' });
      if (res.ok) {
        const result = await res.json();
        setMotorData(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const dailyRemainingStats = useMemo(() => {
    if (!motorData || !motorData.daily) return [];
    
    const T = motorData.summary?.currentMonthTarget || 0;
    const S_mtd = motorData.daily.reduce((acc: number, curr: any) => acc + (curr.actualRevenue || 0), 0);
    
    const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
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
            isReached: remainingToThreshold <= 0
        };
    });
  }, [motorData, currentYear, currentMonth]);

  const upcomingDays = useMemo(() => {
    if (!motorData || !motorData.daily) return [];
    return motorData.daily.filter((row: any) => row.day >= today);
  }, [motorData, today]);

  const formatMoney = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(val || 0));
  const getDayName = (dayIdx: number) => ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"][dayIdx];

  if (loading) {
      return (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Hedef Rotası Hesaplanıyor...</p>
          </div>
      );
  }

  if (!motorData || !motorData.daily || motorData.daily.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
      
      {/* BAŞLIK */}
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 gap-4">
         <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
               🎯 Günlük Operasyon <span className="text-indigo-600 italic">Rotası</span>
            </h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Prim Eşikleri ve Kalan Günler Tablosu</p>
         </div>
         <Link href="/dashboard/targets" className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-md transition-all">
            Detaylı Analize Git →
         </Link>
      </div>

      {/* 🚀 KAYDIRMASIZ (GRID) PRİM EŞİKLERİ */}
      <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/30">
         <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {dailyRemainingStats.map((stat, i) => (
               <div key={i} className={`p-5 rounded-2xl border transition-all ${stat.isReached ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-200'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${stat.isReached ? 'text-emerald-100' : 'text-slate-400'}`}>
                     {stat.label} HEDEFİ
                  </p>
                  {stat.isReached ? (
                     <div className="text-base font-black flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                        TAMAMLANDI
                     </div>
                  ) : (
                     <>
                        <h4 className="text-xl font-black text-slate-900 leading-none">{formatMoney(stat.dailyNeeded)}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Kalan Günlük</p>
                     </>
                  )}
               </div>
            ))}
         </div>
      </div>

      {/* 🚀 GENİŞ VE FERAH TABLO */}
      <div className="overflow-x-auto max-h-[350px] scrollbar-thin scrollbar-thumb-slate-200">
         <table className="w-full text-left whitespace-nowrap">
            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-slate-100">
               <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-5 pl-8">Tarih ve Bağlam</th>
                  <th className="p-5 text-right">Tahmin (AI)</th>
                  <th className="p-5 pr-8 text-right border-l border-slate-50">Günlük Hedef</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {upcomingDays.map((row: any, idx: number) => {
                  const isToday = row.day === today;
                  
                  return (
                     <tr key={idx} className={`group ${isToday ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'} transition-colors`}>
                        <td className="p-5 pl-8">
                           <div className="flex items-center gap-3">
                              {isToday && <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>}
                              <div className={`font-black text-sm ${isToday ? 'text-indigo-900' : 'text-slate-700'}`}>
                                 {row.day} {getDayName(row.dayOfWeek)}
                              </div>
                              {row.context !== "Standart" && (
                                 <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${row.isSpecial ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {row.isSpecial && "✦ "} {row.context}
                                 </div>
                              )}
                           </div>
                        </td>
                        <td className="p-5 text-right font-mono">
                           <div className="flex items-center justify-end gap-2">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black italic ${isToday ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>AI</span>
                              <span className={`text-base font-bold italic ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                                 {formatMoney(row.mlPrediction)}
                              </span>
                           </div>
                        </td>
                        <td className="p-5 pr-8 text-right font-mono border-l border-slate-50">
                           <span className={`text-base font-black ${isToday ? 'text-indigo-900' : 'text-purple-600'}`}>
                              {formatMoney(row.dailyTargetMl)}
                           </span>
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </table>
         {upcomingDays.length === 0 && (
             <div className="py-12 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">
                 Bu ay için gösterilecek gelecek gün kalmadı.
             </div>
         )}
      </div>
    </div>
  );
}