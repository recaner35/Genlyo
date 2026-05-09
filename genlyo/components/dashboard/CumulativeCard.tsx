"use client";

export default function CumulativeCard({ hybridRealizedSales, realizedPercentage, formatMoney }: any) {
  return (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <h3 className="text-lg font-black text-slate-800 leading-tight mb-1">Kümülatif Satış</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Netleşen Ciro</p>
        <h4 className="text-4xl font-black text-slate-900 mb-6 tracking-tighter">{formatMoney(hybridRealizedSales)}</h4>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
           <span>İlerleme</span>
           <span>%{realizedPercentage.toFixed(1)}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
           <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: `${Math.min(realizedPercentage, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
