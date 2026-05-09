"use client";

export default function DashboardHero({ data, formatMoney, closingPercentage }: any) {
  return (
    <section className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none" />
      
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
            {data.currMonthName} Tahminleme Raporu
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-8 leading-tight">
            Ay Sonu Kapanış <br /> <span className="text-indigo-400">Projeksiyonu</span>
          </h2>
          <div className="grid grid-cols-2 gap-6 max-w-sm">
             <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Motor 1</p>
                <p className="text-lg font-black">{formatMoney(data.m1CurrSales)}</p>
             </div>
             <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Motor 2</p>
                <p className="text-lg font-black">{formatMoney(data.m2CurrSales)}</p>
             </div>
          </div>
        </div>

        <div className="flex flex-col items-end text-right">
           <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">Hibrit Zeka Öngörüsü</p>
           <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8">{formatMoney(data.hybridCurrSales)}</h1>
           
           <div className="w-full max-w-md">
              <div className="flex justify-between text-xs font-bold text-slate-400 mb-3">
                  <span>Hedef: {formatMoney(data.currTarget)}</span>
                  <span className={closingPercentage >= 100 ? 'text-emerald-400' : 'text-amber-400'}>%{closingPercentage.toFixed(1)} Başarı</span>
              </div>
              <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                 <div className={`h-full transition-all duration-1000 ${closingPercentage >= 100 ? 'bg-emerald-400' : 'bg-indigo-500'}`} style={{ width: `${Math.min(closingPercentage, 100)}%` }} />
              </div>
           </div>
        </div>
      </div>
    </section>
  );
}
