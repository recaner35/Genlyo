"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

const PRIM_THRESHOLDS = [0.85, 0.95, 1.0, 1.1, 1.2];

export default function TargetNavigationCard({ dailyTarget = 0, target85 = 0, target95 = 0 }: any) {
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

  const formatMoney = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(Math.round(val || 0));
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
    <div className="bg-white rounded-[1.5rem] p-4 md:p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-stretch">
        
        {/* ANA GÜNLÜK ROTA (Sol Taraf - Daha Geniş) */}
        <div className="flex-1 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-5 border border-indigo-100/50 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-10 -top-10 text-indigo-100/50">
               <svg className="w-40 h-40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z"/></svg>
            </div>
            <div className="relative z-10">
                <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">Operasyon Rotası</span>
                <h3 className="text-sm font-bold text-indigo-900 mt-4 mb-1">Günlük Hedef (Sistem Önerisi)</h3>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-indigo-950">
                    {formatMoney(dailyTarget)}
                </h2>
            </div>
        </div>

        {/* MİNİ HEDEF KUTULARI (Sağ Taraf - Alt Alta Sıkıştırılmış) */}
        <div className="flex flex-col gap-3 w-full md:w-64 flex-shrink-0">
            {/* %85 Hedefi */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100/50 flex items-center justify-between h-full">
                <div>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">%85 Barajı</p>
                    <p className="text-xs font-bold text-amber-800/70 mt-0.5">Kalan Günlük</p>
                </div>
                <h4 className="text-lg font-black text-amber-900">{formatMoney(target85)}</h4>
            </div>
            
            {/* %95 Hedefi */}
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100/50 flex items-center justify-between h-full">
                <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">%95 Barajı</p>
                    <p className="text-xs font-bold text-emerald-800/70 mt-0.5">Kalan Günlük</p>
                </div>
                <h4 className="text-lg font-black text-emerald-900">{formatMoney(target95)}</h4>
            </div>
        </div>
        
    </div>
  );
}