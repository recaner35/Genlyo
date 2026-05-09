"use client";

export default function OwaMailCard({ reportEmail, setReportEmail, owaLink, handleSaveEmail, disabled }: any) {
  return (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
       <div>
          <h3 className="text-lg font-black text-slate-800 leading-tight mb-1">Mail Raporu</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">OWA Entegrasyonu</p>
          
          {disabled ? (
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl text-center h-full flex items-center justify-center">
                 <p className="text-slate-500 font-bold text-sm">Şablon için <strong>Mağaza</strong> seçiniz.</p>
              </div>
          ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <input 
                    type="email" 
                    value={reportEmail} 
                    onChange={e => setReportEmail(e.target.value)}
                    placeholder="Alıcı adresi..."
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-300"
                  />
                  <button onClick={handleSaveEmail} className="bg-slate-800 text-white px-4 py-4 rounded-xl font-black shadow-md hover:bg-slate-700 transition-all text-xs uppercase tracking-wider">
                    KAYDET
                  </button>
                </div>
                <a 
                  href={reportEmail ? owaLink : '#'}
                  target="_blank" rel="noopener noreferrer"
                  onClick={(e) => { if(!reportEmail) { e.preventDefault(); alert('Lütfen önce bir mail adresi kaydedin.'); } }}
                  className={`w-full text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center flex items-center justify-center transition-colors ${reportEmail ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}
                >
                  ✉️ GÖNDERİME HAZIRLA
                </a>
              </>
          )}
       </div>
    </div>
  );
}
