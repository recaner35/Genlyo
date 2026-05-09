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
    
    // API'den gelen asıl hedefi buluyoruz (Eğer yoksa 0)
    const T = motorData.summary?.currentMonthTarget || motorData.summary?.targetAmount || 0;
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
            isReached: remainingToThreshold <= 0 && T > 0
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
          <div className="bg-white rounded-[1.5rem] p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[250px]">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Operasyon Rotası Hesaplanıyor...</p>
          </div>
      );
  }

  if (!motorData || !motorData.daily || motorData.daily.length === 0) return null;

  return (
    <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
      
      {/* 🚀 ÜST BAŞLIK */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 gap-4">
         <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
               🎯 Günlük Operasyon <span className="text-indigo-600 italic">Rotası</span>
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Prim Eşikleri ve Gelecek Günler</p>
         </div>
         <Link href="/dashboard/targets" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-md transition-all">
            Detaylı Analiz →
         </Link>
      </div>

      {/* 🚀 5'Lİ PRİM EŞİKLERİ (KOMPAKT GRID) */}
      <div className="p-4 md:p-5 border-b border-slate-100 bg-white">
         <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {dailyRemainingStats.map((stat, i) => (
               <div key={i} className={`p-4 rounded-2xl border transition-all flex flex-col justify-center h-full ${stat.isReached ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-white'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${stat.isReached ? 'text-emerald-100' : 'text-slate-500'}`}>
                     {stat.label} HEDEFİ
                  </p>
                  {stat.isReached ? (
                     <div className="text-sm font-black flex items-center gap-1.5 mt-1">
                        <span className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-emerald-600 text-[10px]">✓</span>
                        AŞILDI
                     </div>
                  ) : (
                     <>
                        <h4 className="text-lg lg:text-xl font-black text-slate-900 leading-none">{formatMoney(stat.dailyNeeded)}</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Kalan Günlük Ort.</p>
                     </>
                  )}
               </div>
            ))}
         </div>
      </div>

      {/* 🚀 TABLO KISMI (DARALTILMIŞ VE İÇTEN KAYDIRMALI) */}
      <div className="overflow-x-auto max-h-[280px] scrollbar-thin scrollbar-thumb-slate-200 bg-slate-50/30">
         <table className="w-full text-left whitespace-nowrap">
            <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-md z-10 shadow-sm">
               <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="py-3 px-6">Tarih ve Bağlam</th>
                  <th className="py-3 px-6 text-right">Tahmin (AI)</th>
                  <th className="py-3 px-6 text-right border-l border-slate-200/50">Sistem Hedefi</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {upcomingDays.map((row: any, idx: number) => {
                  const isToday = row.day === today;
                  
                  return (
                     <tr key={idx} className={`group ${isToday ? 'bg-indigo-50/80' : 'hover:bg-white'} transition-colors`}>
                        <td className="py-3 px-6">
                           <div className="flex items-center gap-2.5">
                              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>}
                              <div className={`font-black text-xs ${isToday ? 'text-indigo-900' : 'text-slate-700'}`}>
                                 {row.day} {getDayName(row.dayOfWeek)}
                              </div>
                              {row.context !== "Standart" && (
                                 <div className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${row.isSpecial ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {row.isSpecial && "✦ "} {row.context}
                                 </div>
                              )}
                           </div>
                        </td>
                        <td className="py-3 px-6 text-right font-mono">
                           <div className="flex items-center justify-end gap-1.5">
                              <span className={`text-[8px] px-1 py-0.5 rounded font-black italic ${isToday ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>AI</span>
                              <span className={`text-sm font-bold italic ${isToday ? 'text-indigo-700' : 'text-slate-500'}`}>
                                 {formatMoney(row.mlPrediction)}
                              </span>
                           </div>
                        </td>
                        <td className="py-3 px-6 text-right font-mono border-l border-slate-100/50">
                           <span className={`text-sm font-black ${isToday ? 'text-indigo-900 text-base' : 'text-slate-800'}`}>
                              {formatMoney(row.dailyTargetMl)}
                           </span>
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </table>
         {upcomingDays.length === 0 && (
             <div className="py-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                 Bu ay için gösterilecek gün kalmadı.
             </div>
         )}
      </div>
    </div>
  );
}