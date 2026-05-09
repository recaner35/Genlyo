"use client";

export default function OwaMailCard({ reportEmail, setReportEmail, owaLink, handleSaveEmail, disabled }: any) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-100 shadow-sm flex flex-col justify-between h-full">
       <div>
          <h3 className="text-base font-black text-amber-900 leading-tight mb-1">Mail Raporu</h3>
          <p className="text-[9px] font-bold text-amber-600/70 uppercase tracking-widest mb-4">OWA Entegrasyonu</p>
          
          {disabled ? (
              <div className="bg-amber-100/50 p-4 rounded-xl text-center flex-1 flex items-center justify-center">
                 <p className="text-amber-800 font-bold text-[10px] uppercase">Şablon için mağaza seçiniz.</p>
              </div>
          ) : (
              <div className="mt-auto">
                <div className="flex items-center gap-2 mb-3">
                  <input 
                    type="email" value={reportEmail} onChange={e => setReportEmail(e.target.value)}
                    placeholder="Alıcı adresi..."
                    className="flex-1 bg-white border border-amber-100 rounded-xl px-3 py-3 text-xs font-bold text-amber-900 outline-none focus:border-amber-300 shadow-inner"
                  />
                  <button onClick={handleSaveEmail} className="bg-amber-800 text-white px-3 py-3 rounded-xl font-black shadow-md hover:bg-amber-700 transition-all text-[10px] uppercase">
                    KAYDET
                  </button>
                </div>
                <a 
                  href={reportEmail ? owaLink : '#'} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => { if(!reportEmail) { e.preventDefault(); alert('Mail adresi kaydedin.'); } }}
                  className={`w-full text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-center flex items-center justify-center transition-colors shadow-md ${reportEmail ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-300 cursor-not-allowed'}`}
                >
                  ✉️ GÖNDERİME HAZIRLA
                </a>
              </div>
          )}
       </div>
    </div>
  );
}