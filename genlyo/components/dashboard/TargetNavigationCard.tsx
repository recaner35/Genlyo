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
    const T = motorData.summary?.currentMonthTarget || motorData.summary?.targetAmount || 0;
    const S_mtd = motorData.daily.reduce((acc: number, curr: any) => acc + (curr.actualRevenue || 0), 0);
    const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const passedDays = motorData.daily.filter((d: any) => d.actualRevenue > 0).length;
    const remainingDays = Math.max(1, totalDaysInMonth - passedDays);

    return PRIM_THRESHOLDS.map(threshold => {
        const thresholdTarget = T * threshold;
        const remainingToThreshold = thresholdTarget - S_mtd;
        return {
            label: `%${Math.round(threshold * 100)}`,
            dailyNeeded: remainingToThreshold > 0 ? remainingToThreshold / remainingDays : 0,
            isReached: remainingToThreshold <= 0 && T > 0
        };
    });
  }, [motorData, currentYear, currentMonth]);

  // 🚀 SADECE 3 GÜNLÜK FOKUS (Bugün, Yarın, Sonraki)
  const focalDays = useMemo(() => {
    if (!motorData || !motorData.daily) return [];
    return motorData.daily
      .filter((row: any) => row.day >= today)
      .slice(0, 3);
  }, [motorData, today]);

  const formatMoney = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(val || 0));
  const getDayLabel = (day: number) => {
      if (day === today) return "BUGÜN";
      if (day === today + 1) return "YARIN";
      return "SONRAKİ GÜN";
  };

  if (loading) return null; // Ana sayfa yüklenirken zıplama yapmasın diye loading'i sessiz geçebiliriz
  if (!motorData || !motorData.daily || motorData.daily.length === 0) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-stretch">
      
      {/* 🚀 SOL TARAF: EŞİK ROZETLERİ (DİKEY ŞERİT) */}
      <div className="lg:w-1/3 grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-1 gap-2">
        {dailyRemainingStats.map((stat, i) => (
          <div key={i} className={`px-4 py-3 rounded-2xl border flex items-center justify-between transition-all ${stat.isReached ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm' : 'bg-white border-slate-100 shadow-sm'}`}>
            <span className={`text-[10px] font-black ${stat.isReached ? 'text-white' : 'text-slate-400'}`}>{stat.label}</span>
            <div className="text-right">
              {stat.isReached ? (
                 <span className="text-[10px] font-black">HEDEF AŞILDI ✓</span>
              ) : (
                 <span className={`text-xs font-black ${stat.isReached ? 'text-white' : 'text-slate-700'}`}>{formatMoney(stat.dailyNeeded)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 🚀 SAĞ TARAF: 3 GÜNLÜK OPERASYON ROTASI */}
      <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col justify-between">
        <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
               🎯 Operasyon <span className="text-indigo-600 italic">Rotası (3 Gün)</span>
            </h3>
            <Link href="/dashboard/targets" className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg transition-all">
               Tüm Ayı Gör →
            </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {focalDays.map((row: any, idx: number) => (
            <div key={idx} className={`p-4 rounded-2xl border transition-all ${row.day === today ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-100 shadow-lg' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[9px] font-black uppercase tracking-tighter ${row.day === today ? 'text-indigo-200' : 'text-slate-400'}`}>
                   {getDayLabel(row.day)}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black italic ${row.day === today ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>AI</span>
              </div>
              
              <div className="space-y-0.5">
                <p className={`text-[10px] font-bold ${row.day === today ? 'text-indigo-100' : 'text-slate-500'}`}>Sistem Hedefi</p>
                <h4 className="text-lg font-black tracking-tight">{formatMoney(row.dailyTargetMl)}</h4>
              </div>
              
              {(row.contexts && row.contexts.length > 0) && (
                <div className={`mt-2 text-[8px] font-black uppercase px-2 py-0.5 rounded-md inline-block ${row.day === today ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                  {row.contexts.map((c:any, i:number) => (
                    <span key={i} className="mr-1">{c.name}{c.marker && c.marker !== '0' ? ` (${c.marker})` : ''}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {focalDays.length === 0 && (
             <div className="col-span-3 py-10 text-center text-[10px] font-bold text-slate-400 uppercase">Veri bulunamadı.</div>
          )}
        </div>
      </div>

    </div>
  );
}