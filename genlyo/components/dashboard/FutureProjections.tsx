"use client";

export default function FutureProjections({ data, formatMoney }: any) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
       <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-6 border border-violet-100 shadow-sm flex flex-col justify-between">
            <h3 className="text-base font-black text-violet-900 mb-4">Gelecek Ay Projeksiyonu <span className="text-[10px] font-bold text-violet-600/70 ml-2">({data.nextMonthName})</span></h3>
            <div className="space-y-3">
               <div className="flex justify-between items-center pb-2 border-b border-violet-200/50">
                  <span className="text-xs font-bold text-violet-700">Motor 1 Tahmini</span>
                  <span className="font-mono font-black text-violet-950">{formatMoney(data.m1Sales)}</span>
               </div>
               <div className="flex justify-between items-center pb-2 border-b border-violet-200/50">
                  <span className="text-xs font-bold text-violet-700">Motor 2 Tahmini</span>
                  <span className="font-mono font-black text-violet-950">{formatMoney(data.m2Sales)}</span>
               </div>
               <div className="flex justify-between items-center pt-2 text-violet-600">
                  <span className="text-sm font-black uppercase tracking-tighter">Hibrit Öngörü</span>
                  <span className="text-xl font-black">{formatMoney(data.hybridSales)}</span>
               </div>
            </div>
       </div>

       <div className="bg-gradient-to-br from-fuchsia-50 to-pink-50 rounded-3xl p-6 border border-fuchsia-100 shadow-sm flex flex-col justify-between">
            <h3 className="text-base font-black text-fuchsia-900 mb-4">Stratejik Hedef Önerisi <span className="text-[10px] font-bold text-fuchsia-600/70 ml-2">({data.nextMonthName})</span></h3>
            <div className="space-y-3">
               <div className="flex justify-between items-center pb-2 border-b border-fuchsia-200/50">
                  <span className="text-xs font-bold text-fuchsia-700">Analitik Analiz Önerisi</span>
                  <span className="font-mono font-black text-fuchsia-950">{formatMoney(data.m1Target)}</span>
               </div>
               <div className="flex justify-between items-center pb-2 border-b border-fuchsia-200/50">
                  <span className="text-xs font-bold text-fuchsia-700">YZ Önerisi</span>
                  <span className="font-mono font-black text-fuchsia-950">{formatMoney(data.m2Target)}</span>
               </div>
               <div className="flex justify-between items-center pt-2 text-pink-600">
                  <span className="text-sm font-black uppercase tracking-tighter">Genlyo Tavsiyesi</span>
                  <span className="text-xl font-black">{formatMoney(data.hybridTarget)}</span>
               </div>
            </div>
       </div>
    </section>
  );
}