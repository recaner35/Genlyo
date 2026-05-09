"use client";

export default function DashboardHero({ data, formatMoney, closingPercentage }: any) {
  return (
    <section className="relative overflow-hidden bg-slate-900 rounded-[1.5rem] p-5 md:p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none" />
      
      {/* SOL: Başlık ve Motor Özetleri (Yan Yana Tıkız) */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 flex-1">
        <div>
            <div className="inline-block px-3 py-1 mb-2 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-widest">
              {data.currMonthName} Kapanış Projeksiyonu
            </div>
            <h2 className="text-2xl font-black tracking-tight leading-none">
              Hibrit Zeka <span className="text-indigo-400">Öngörüsü</span>
            </h2>
        </div>
        
        <div className="flex gap-3 mt-2 md:mt-0 md:ml-4 border-l border-white/10 md:pl-6">
           <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Motor 1</p>
              <p className="text-base font-black leading-none">{formatMoney(data.m1CurrSales)}</p>
           </div>
           <div className="w-px bg-white/10 mx-1"></div>
           <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Motor 2</p>
              <p className="text-base font-black leading-none">{formatMoney(data.m2CurrSales)}</p>
           </div>
        </div>
      </div>

      {/* SAĞ: Dev Rakam ve İlerleme Çubuğu */}
      <div className="relative z-10 flex flex-col items-start md:items-end w-full md:w-auto">
         <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 mb-2">
            {formatMoney(data.hybridCurrSales)}
         </h1>
         
         <div className="w-full md:w-64">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                <span>Hedef: {formatMoney(data.currTarget)}</span>
                <span className={closingPercentage >= 100 ? 'text-emerald-400' : 'text-amber-400'}>%{closingPercentage.toFixed(1)}</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
               <div className={`h-full transition-all duration-1000 ${closingPercentage >= 100 ? 'bg-emerald-400' : 'bg-indigo-500'}`} style={{ width: `${Math.min(closingPercentage, 100)}%` }} />
            </div>
         </div>
      </div>
    </section>
  );
}