"use client";

export default function CumulativeCard({ hybridRealizedSales, realizedPercentage, formatMoney }: any) {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-6 border border-emerald-100 shadow-sm flex flex-col justify-between h-full">
      <div>
        <h3 className="text-base font-black text-emerald-900 leading-tight mb-1">Kümülatif Satış</h3>
        <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-widest mb-4">Netleşen Ciro</p>
        <h4 className="text-2xl lg:text-3xl font-black text-emerald-950 mb-4 tracking-tighter">{formatMoney(hybridRealizedSales)}</h4>
      </div>
      <div className="space-y-1.5 mt-auto">
        <div className="flex justify-between text-[9px] font-black uppercase text-emerald-700">
           <span>İlerleme</span>
           <span>%{realizedPercentage.toFixed(1)}</span>
        </div>
        <div className="h-1.5 w-full bg-emerald-200/50 rounded-full overflow-hidden">
           <div className="h-full bg-emerald-600 transition-all duration-1000" style={{ width: `${Math.min(realizedPercentage, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}