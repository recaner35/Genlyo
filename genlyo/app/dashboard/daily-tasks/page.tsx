"use client";

import { useState, useMemo, useEffect, useRef } from "react";

// DOKÜMANTASYON: Masraf objesi için TypeScript arayüzü
interface Expense {
  id: number;
  amount: number;
  date: string;
  desc: string;
}

const DENOMINATIONS = [
  { label: "200 ₺", value: 200, type: "TL" }, { label: "100 ₺", value: 100, type: "TL" },
  { label: "50 ₺", value: 50, type: "TL" }, { label: "20 ₺", value: 20, type: "TL" },
  { label: "10 ₺", value: 10, type: "TL" }, { label: "5 ₺", value: 5, type: "TL" },
  { label: "1 ₺", value: 1, type: "TL" }, { label: "0.50 ₺", value: 0.5, type: "TL" },
  { label: "0.25 ₺", value: 0.25, type: "TL" }, { label: "0.10 ₺", value: 0.1, type: "TL" },
  { label: "Dolar ($)", value: 1, type: "USD" }, { label: "Euro (€)", value: 1, type: "EUR" },
];

export default function DailyTasksPage() {
  const [cashCounts, setCashCounts] = useState<Record<string, string>>({});
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: Date.now(), amount: 0, date: new Date().toISOString().split('T')[0], desc: "" }
  ]);
  const [erpTotal, setErpTotal] = useState<number>(0);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [shiftType, setShiftType] = useState("KAPANIŞ");
  const [personnels, setPersonnels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // ŞOV KISMI İÇİN MODAL STATE'LERİ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ADIM 1: Veritabanından verileri çekme ve sayfayı doldurma
  useEffect(() => {
    const initPage = async () => {
      try {
        const [resP, resT] = await Promise.all([
          fetch('/api/personnel'),
          fetch('/api/daily-tasks', { cache: 'no-store' })
        ]);

        if (resP.ok) setPersonnels(await resP.json());
        
        if (resT.ok) {
          const tData = await resT.json();
          if (tData && tData.id) {
            setCashCounts(tData.cashCounts || {});
            setExpenses(tData.expenses && tData.expenses.length > 0 
              ? tData.expenses 
              : [{ id: Date.now(), amount: 0, date: new Date().toISOString().split('T')[0], desc: "" }]
            );
            setErpTotal(tData.erpTotal || 0);
            setSelectedStaff(tData.selectedStaff || "");
            setShiftType(tData.shiftType || "KAPANIŞ");
          }
        }
      } catch (err) {
        console.error("Veri yükleme hatası:", err);
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, []);

  const totals = useMemo(() => {
    let tlPhysical = 0;
    DENOMINATIONS.forEach(d => {
      const count = parseFloat(cashCounts[d.label] || "0");
      if (d.type === "TL") tlPhysical += count * d.value;
    });
    const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const realTotal = tlPhysical + totalExpenses;
    const diff = realTotal - erpTotal;
    let toBank = tlPhysical > 1000 ? Math.floor((tlPhysical - 1000) / 10) * 10 : 0;
    return { tlPhysical, totalExpenses, realTotal, diff, toBank };
  }, [cashCounts, expenses, erpTotal]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  // ADIM 2: Masraf silme fonksiyonu
  const removeExpenseRow = (id: number) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter(e => e.id !== id));
    } else {
      setExpenses([{ id: Date.now(), amount: 0, date: new Date().toISOString().split('T')[0], desc: "" }]);
    }
  };

  const handleSaveToDB = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/daily-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          erpTotal, cashCounts, expenses, selectedStaff, shiftType,
          toBank: totals.toBank, difference: totals.diff
        })
      });
      if (res.ok) alert("✅ Veriler veritabanına başarıyla arşivlendi.");
      else alert("❌ Kayıt başarısız.");
    } catch (err) {
      alert("❌ Sistem hatası!");
    } finally {
      setIsSaving(false);
    }
  };

  const smsText = `${new Date().toLocaleDateString('tr-TR')} - ${shiftType}
Sistem: ${erpTotal.toLocaleString('tr-TR')} ₺
Reel: ${totals.tlPhysical.toLocaleString('tr-TR')} ₺
Onay Bekleyen Masraf: ${totals.totalExpenses.toLocaleString('tr-TR')} ₺
${totals.diff >= 0 ? 'Fazla' : 'Eksik'} Tutar: ${Math.abs(totals.diff).toFixed(2)} ₺
Kontrol Eden: ${selectedStaff}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(smsText)}`;

  const handleCopyText = async () => {
      try {
          await navigator.clipboard.writeText(smsText);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
          console.error("Kopyalama başarısız", err);
      }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  return (
    <>
        <div className="p-4 md:p-6 bg-slate-50 min-h-screen animate-in fade-in duration-500">
          
          {/* ÜST BAŞLIK VE KONTROLLER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 italic uppercase tracking-tight">Günlük <span className="text-indigo-600">İşler</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Kasa Sayımı & Masraf Bildirimi</p>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95">
                  📱 SMS PAYLAŞ
                </button>
                <button onClick={handleSaveToDB} disabled={isSaving} className="flex-1 md:flex-none bg-indigo-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {isSaving ? "KAYDEDİLİYOR..." : "💾 SİSTEME KAYDET"}
                </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            
            {/* 🚀 SOL PANEL: NAKİT MATRİSİ (Kompakt 2 Kolonlu) - 5 Birim Genişlik */}
            <div className="xl:col-span-5 bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">💰 Nakit Sayım</h2>
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Adet Giriniz</span>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {DENOMINATIONS.map((d, index) => (
                  <div key={d.label} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                    <span className="font-bold text-slate-500 text-[10px] w-14">{d.label}</span>
                    <input 
                      ref={el => { inputRefs.current[index] = el; }}
                      type="number" 
                      value={cashCounts[d.label] || ""} 
                      placeholder="0"
                      className="w-16 p-1.5 bg-slate-50 border border-slate-100 rounded-md text-center font-black text-indigo-700 text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all" 
                      onChange={e => setCashCounts({...cashCounts, [d.label]: e.target.value})}
                      onKeyDown={e => handleKeyDown(e, index)}
                    />
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fiziki Kasa Toplamı</span>
                 <span className="text-xl font-black text-indigo-900">{totals.tlPhysical.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>

            {/* 🚀 SAĞ PANEL: ÖZET VE MASRAFLAR - 7 Birim Genişlik */}
            <div className="xl:col-span-7 flex flex-col gap-4">
              
              {/* ÜST: ÖZET KARTI (Ribbon Tasarım) */}
              <div className="bg-slate-900 rounded-[1.5rem] p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="bg-white/10 p-2 rounded-xl">
                       <label className="text-[9px] font-black uppercase text-indigo-300 block mb-1">ERP Sistem Tutarı</label>
                       <div className="flex items-center gap-1">
                          <span className="text-indigo-400 font-black">₺</span>
                          <input type="number" value={erpTotal || ""} placeholder="0" className="w-28 bg-transparent font-black text-xl text-white outline-none placeholder:text-white/20" onChange={e => setErpTotal(Number(e.target.value))} />
                       </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6">
                    <div>
                      <span className="block text-[9px] font-black uppercase text-slate-400 mb-1">Fiziki + Masraf</span>
                      <span className="text-xl font-black text-emerald-400">{totals.realTotal.toLocaleString('tr-TR')} ₺</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] font-black uppercase text-slate-400 mb-1">Kasa Farkı</span>
                      <span className={`text-xl font-black ${totals.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                         {totals.diff > 0 ? '+' : ''}{totals.diff.toFixed(2)} ₺
                      </span>
                    </div>
                </div>
              </div>

              {/* ORTA: PERSONEL SEÇİMİ VE BANKA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                  <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-5 rounded-[1.5rem] shadow-md flex flex-col justify-center">
                     <h3 className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mb-1">🏦 Bankaya Yatırılacak (Tahmini)</h3>
                     <p className="text-3xl font-black">{totals.toBank.toLocaleString('tr-TR')} ₺</p>
                  </div>
                  
                  <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col gap-3 justify-center">
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none focus:border-indigo-300" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                       <option value="">Personel Seçiniz</option>
                       {personnels.map(p => <option key={p.id} value={`${p.firstName} ${p.lastName}`}>{p.firstName} {p.lastName}</option>)}
                    </select>
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none focus:border-indigo-300" value={shiftType} onChange={e => setShiftType(e.target.value)}>
                       <option value="KAPANIŞ">KAPANIŞ VARDİYASI</option>
                       <option value="AÇILIŞ">AÇILIŞ VARDİYASI</option>
                    </select>
                  </div>
              </div>

              {/* ALT: MASRAFLAR (Kompakt Liste) */}
              <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex-1">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">📑 Masraf Fişleri</h2>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Toplam: {totals.totalExpenses.toLocaleString('tr-TR')} ₺</span>
                </div>
                
                <div className="space-y-2 mb-3 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-2">
                    {expenses.map((exp) => (
                      <div key={exp.id} className="flex flex-col sm:flex-row gap-2 bg-slate-50/80 p-2 rounded-xl border border-slate-100 items-center transition-all hover:bg-slate-100">
                        <input type="date" value={exp.date} onChange={e => setExpenses(expenses.map(ex => ex.id === exp.id ? {...ex, date: e.target.value} : ex))} className="p-2 bg-white rounded-lg text-[10px] font-black text-slate-600 outline-none border border-slate-200 w-full sm:w-auto" />
                        <input type="text" value={exp.desc} placeholder="Açıklama giriniz..." onChange={e => setExpenses(expenses.map(ex => ex.id === exp.id ? {...ex, desc: e.target.value} : ex))} className="p-2 bg-white rounded-lg text-xs font-bold flex-1 outline-none border border-slate-200 w-full" />
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                           <div className="relative flex-1 sm:w-28">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-400">₺</span>
                              <input type="number" value={exp.amount || ""} placeholder="0" onChange={e => setExpenses(expenses.map(ex => ex.id === exp.id ? {...ex, amount: Number(e.target.value)} : ex))} className="p-2 pl-6 bg-white rounded-lg text-sm font-black text-indigo-700 w-full outline-none border border-slate-200 focus:border-indigo-400" />
                           </div>
                           <button onClick={() => removeExpenseRow(exp.id)} className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white w-8 h-8 rounded-lg font-black transition-colors flex items-center justify-center">✕</button>
                        </div>
                      </div>
                    ))}
                </div>
                
                <button onClick={() => setExpenses([...expenses, { id: Date.now(), amount: 0, date: new Date().toISOString().split('T')[0], desc: "" }])} className="w-full py-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-[10px] font-black text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all uppercase tracking-widest">
                  + YENİ MASRAF EKLE
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* 📱 ŞOV KISMI: ETKİLEŞİMLİ MODAL (POP-UP) */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
                    
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-1.5">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="text-center mb-6">
                        <h3 className="text-lg font-black text-slate-800">Kasa Raporu</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Whatsapp Grubuna Gönder</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-center mb-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 object-contain rounded-xl shadow-sm" />
                    </div>

                    <button 
                        onClick={handleCopyText}
                        className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${isCopied ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'}`}
                    >
                        {isCopied ? (
                            <><span>✅</span> KOPYALANDI!</>
                        ) : (
                            <><span>📝</span> METNİ KOPYALA</>
                        )}
                    </button>
                </div>
            </div>
        )}
    </>
  );
}
