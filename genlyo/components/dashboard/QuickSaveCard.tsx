"use client";

export default function QuickSaveCard({ formattedDateString, quickRevenue, setQuickRevenue, handleQuickSave, isSavingQuick, disabled }: any) {
  return (
    <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-lg shadow-indigo-100 flex flex-col justify-between relative overflow-hidden group">
      <div className="relative z-10">
        <h3 className="text-lg font-black leading-tight mb-1">Ciro Bildirimi</h3>
        <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-6">{formattedDateString}</p>
        
        {disabled ? (
          <div className="bg-white/10 border border-white/20 p-6 rounded-2xl text-center h-full flex items-center justify-center">
             <p className="text-indigo-200 font-bold text-sm">Giriş yapmak için <strong>Mağaza</strong> seçiniz.</p>
          </div>
        ) : (
          <>
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-indigo-300">₺</span>
              <input 
                type="text" 
                value={quickRevenue} 
                onChange={e => setQuickRevenue(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-10 pr-4 text-xl font-black outline-none focus:bg-white/20 transition-all placeholder:text-indigo-300"
                placeholder="0.00"
              />
            </div>
            <button 
              onClick={handleQuickSave} 
              disabled={isSavingQuick}
              className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
              {isSavingQuick ? "KAYDEDİLİYOR..." : "SİSTEME İŞLE"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
