"use client";

export default function QuickSaveCard({ formattedDateString, quickRevenue, setQuickRevenue, handleQuickSave, isSavingQuick, disabled }: any) {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-6 border border-indigo-100 shadow-sm flex flex-col justify-between h-full group">
      <div>
        <h3 className="text-base font-black text-indigo-900 leading-tight mb-1">Ciro Bildirimi</h3>
        <p className="text-[9px] font-bold text-indigo-600/70 uppercase tracking-widest mb-4">{formattedDateString}</p>
        
        {disabled ? (
          <div className="bg-indigo-100/50 p-4 rounded-xl text-center flex-1 flex items-center justify-center">
             <p className="text-indigo-800 font-bold text-[10px] uppercase">Giriş için mağaza seçiniz.</p>
          </div>
        ) : (
          <div className="mt-auto">
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-indigo-400 text-sm">₺</span>
              <input 
                type="text" value={quickRevenue} onChange={e => setQuickRevenue(e.target.value)}
                className="w-full bg-white border border-indigo-100 rounded-xl py-3 pl-8 pr-3 text-sm font-black text-indigo-900 outline-none focus:border-indigo-300 transition-all placeholder:text-indigo-300 shadow-inner"
                placeholder="0"
              />
            </div>
            <button 
              onClick={handleQuickSave} disabled={isSavingQuick}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md"
            >
              {isSavingQuick ? "İŞLENİYOR..." : "SİSTEME İŞLE"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}