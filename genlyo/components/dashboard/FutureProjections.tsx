"use client";

export default function FutureProjections({ data, formatMoney }: any) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
       {/* Ciro Projeksiyonu */}
       <div className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-800 mb-8">Projeksiyon <span className="text-sm font-bold text-slate-400 ml-2">({data.nextMonthName})</span></h3>
            <div className="space-y-6">
               <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                  <span className="text-sm font-bold text-slate-500">Motor 1 Tahmini</span>
                  <span className="font-mono font-black">{formatMoney(data.m1Sales)}</span>
               </div>
               <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                  <span className="text-sm font-bold text-slate-500">Motor 2 Tahmini</span>
                  <span className="font-mono font-black">{formatMoney(data.m2Sales)}</span>
               </div>
               <div className="flex justify-between items-center pt-4 text-indigo-600">
                  <span className="text-lg font-black uppercase tracking-tighter">Hibrit Öngörü</span>
                  <span className="text-2xl font-black">{formatMoney(data.hybridSales)}</span>
               </div>
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 mt-8 leading-relaxed italic">
            * Motor 1'in tarihsel büyüme ivmesi ile Motor 2'nin makine öğrenmesi simülasyonlarının ortalamasıdır.
          </p>
       </div>

       {/* Hedef Önerisi */}
       <div className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-800 mb-8">Stratejik Hedef <span className="text-sm font-bold text-slate-400 ml-2">({data.nextMonthName})</span></h3>
            <div className="space-y-6">
               <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                  <span className="text-sm font-bold text-slate-500">Motor 1 Önerisi</span>
                  <span className="font-mono font-black">{formatMoney(data.m1Target)}</span>
               </div>
               <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                  <span className="text-sm font-bold text-slate-500">Motor 2 Önerisi</span>
                  <span className="font-mono font-black">{formatMoney(data.m2Target)}</span>
               </div>
               <div className="flex justify-between items-center pt-4 text-emerald-600">
                  <span className="text-lg font-black uppercase tracking-tighter">Genlyo Tavsiyesi</span>
                  <span className="text-2xl font-black">{formatMoney(data.hybridTarget)}</span>
               </div>
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 mt-8 leading-relaxed italic">
            * Yönetim stratejisi ve yapay zeka öngörüleri harmanlanarak en optimum baraj olarak tavsiye edilmektedir.
          </p>
       </div>
    </section>
  );
}
