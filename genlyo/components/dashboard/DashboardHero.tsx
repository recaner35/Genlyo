"use client";

export default function DashboardHero({ data, formatMoney, closingPercentage }: any) {
  return (
    <section className="relative overflow-hidden bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col lg:flex-row justify-between items-center gap-6">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none" />
      
      <div className="relative z-10 flex-1">
        <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-[0.1em]">
              {data.currMonthName} Tahminleme Raporu
            </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-4">
          Ay Sonu Kapanış <span className="text-indigo-400">Projeksiyonu</span>
        </h2>
        <div className="flex gap-4">
           <div className="p-3 rounded-2xl bg-white/5 border border-white/10 min-w-[120px]">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Motor 1</p>
              <p className="text-sm font-black">{formatMoney(data.m1CurrSales)}</p>
           </div>
           <div className="p-3 rounded-2xl bg-white/5 border border-white/10 min-w-[120px]">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Motor 2</p>
              <p className="text-sm font-black">{formatMoney(data.m2CurrSales)}</p>
           </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-start lg:items-end w-full">
         <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Hibrit Zeka Öngörüsü</p>
         <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">{formatMoney(data.hybridCurrSales)}</h1>
         
         <div className="w-full lg:max-w-xs">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2">
                <span>Hedef: {formatMoney(data.currTarget)}</span>
                <span className={closingPercentage >= 100 ? 'text-emerald-400' : 'text-amber-400'}>%{closingPercentage.toFixed(1)} Başarı</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
               <div className={`h-full transition-all duration-1000 ${closingPercentage >= 100 ? 'bg-emerald-400' : 'bg-indigo-500'}`} style={{ width: `${Math.min(closingPercentage, 100)}%` }} />
            </div>
         </div>
      </div>
    </section>
  );
}
