"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

// DIŞARIDAN GELEN KART MODÜLLERİ
import QuickSaveCard from "@/components/dashboard/QuickSaveCard";
import OwaMailCard from "@/components/dashboard/OwaMailCard";
import PersonnelPerformanceCard from "@/components/dashboard/PersonnelPerformanceCard";

interface Expense { id: number; amount: number; date: string; desc: string; }

const DENOMINATIONS = [
  { label: "200 ₺", value: 200, type: "TL" }, { label: "100 ₺", value: 100, type: "TL" },
  { label: "50 ₺", value: 50, type: "TL" }, { label: "20 ₺", value: 20, type: "TL" },
  { label: "10 ₺", value: 10, type: "TL" }, { label: "5 ₺", value: 5, type: "TL" },
  { label: "1 ₺", value: 1, type: "TL" }, { label: "0.50 ₺", value: 0.5, type: "TL" },
  { label: "0.25 ₺", value: 0.25, type: "TL" }, { label: "0.10 ₺", value: 0.1, type: "TL" },
  { label: "Dolar ($)", value: 1, type: "USD" }, { label: "Euro (€)", value: 1, type: "EUR" },
];

export default function DailyTasksPage() {
  const { data: session } = useSession();
  
  // KASA STATE'LERİ
  const [cashCounts, setCashCounts] = useState<Record<string, string>>({});
  const [expenses, setExpenses] = useState<Expense[]>([{ id: Date.now(), amount: 0, date: new Date().toISOString().split('T')[0], desc: "" }]);
  const [erpTotal, setErpTotal] = useState<number>(0);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [shiftType, setShiftType] = useState("KAPANIŞ");
  const [personnels, setPersonnels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // KART STATE'LERİ (QuickSave, OwaMail, Personnel)
  const [myStoreId, setMyStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("Mağaza");
  const [quickRevenue, setQuickRevenue] = useState("");
  const [isSavingQuick, setIsSavingQuick] = useState(false);
  const [reportEmail, setReportEmail] = useState("");
  const [personnelSales, setPersonnelSales] = useState<any[]>([]);
  const [hybridRealizedSales, setHybridRealizedSales] = useState(0);
  const [currentMonthTarget, setCurrentMonthTarget] = useState(0);

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const formattedDateString = `${String(currentDay).padStart(2, '0')}.${String(currentMonth).padStart(2, '0')}.${currentYear}`;

  useEffect(() => {
    const initPage = async () => {
      try {
        const [resP, resT, resS, resHybrid] = await Promise.all([
          fetch('/api/personnel'),
          fetch('/api/daily-tasks', { cache: 'no-store' }),
          fetch(`/api/sales?year=${currentYear}&month=${currentMonth}&_t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/dashboard/hybrid?level=STORE&filterId=ALL`) // Hedef için
        ]);

        if (resP.ok) setPersonnels(await resP.json());
        
        if (resT.ok) {
          const tData = await resT.json();
          if (tData && tData.id) {
            setCashCounts(tData.cashCounts || {});
            setExpenses(tData.expenses && tData.expenses.length > 0 ? tData.expenses : [{ id: Date.now(), amount: 0, date: new Date().toISOString().split('T')[0], desc: "" }]);
            setErpTotal(tData.erpTotal || 0);
            setSelectedStaff(tData.selectedStaff || "");
            setShiftType(tData.shiftType || "KAPANIŞ");
          }
        }

        if (resS.ok) {
           const sData = await resS.json();
           const salesArray = Array.isArray(sData?.sales) ? sData.sales : [];
           if (sData.allowedStoreId) {
               setMyStoreId(sData.allowedStoreId);
               setReportEmail(localStorage.getItem(`genlyo_mail_${sData.allowedStoreId}`) || "");
               
               const totalRev = salesArray.reduce((acc: number, curr: any) => acc + Number(curr.revenue), 0);
               setHybridRealizedSales(totalRev);

               const todaySale = salesArray.find((s: any) => new Date(s.date).getUTCDate() === currentDay && s.storeId === sData.allowedStoreId);
               setQuickRevenue(todaySale ? todaySale.revenue.toString() : "");

               fetchPersonnelSales(sData.allowedStoreId);
           }
        }

        if (resHybrid.ok) {
           const hData = await resHybrid.json();
           setCurrentMonthTarget(hData.currTarget || 0);
        }

        // Mağaza adını çekmek için
        fetch('/api/stores').then(res => res.json()).then(resData => {
           const stores = Array.isArray(resData) ? resData : (resData.store ? [resData.store] : []);
           if (stores.length > 0) setStoreName(stores[0].name);
        });

      } catch (err) {} finally { setLoading(false); }
    };
    initPage();
  }, [currentYear, currentMonth, currentDay]);

  const fetchPersonnelSales = async (targetId: string) => {
      try {
          const res = await fetch(`/api/store-performance?storeId=${targetId}&month=${currentMonth}&year=${currentYear}`);
          if (res.ok) {
              const result = await res.json();
              const combinedData = result.personnels.map((p: any) => {
                  const mData = result.monthlyData.find((md: any) => md.personnelId === p.id);
                  return { ...p, personnel: p, ownRevenue: mData?.ownRevenue || 0 };
              }).filter((p: any) => !p.title?.name?.toLowerCase().includes("müdür")).sort((a: any, b: any) => b.ownRevenue - a.ownRevenue);
              setPersonnelSales(combinedData);
          }
      } catch (err) {}
  };

  const handleQuickSave = async () => {
    if (!quickRevenue || !myStoreId) return;
    setIsSavingQuick(true);
    try {
      const cleanRevenue = parseFloat(quickRevenue.replace(/\./g, '').replace(',', '.'));
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ storeId: myStoreId, year: currentYear, month: currentMonth, day: currentDay, revenue: cleanRevenue }])
      });
      if (res.ok) { 
          alert("✅ Ciro Kaydedildi!"); 
          // Hızlıca reel ciroyu güncelle
          setHybridRealizedSales(prev => prev + cleanRevenue);
          fetchPersonnelSales(myStoreId);
      }
    } catch (err) {} finally { setIsSavingQuick(false); }
  };

  const handleSaveEmail = () => {
    if (!myStoreId) return;
    localStorage.setItem(`genlyo_mail_${myStoreId}`, reportEmail);
    alert("✅ E-posta adresi kaydedildi!");
  };

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

  const handleSaveKasa = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/daily-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ erpTotal, cashCounts, expenses, selectedStaff, shiftType, toBank: totals.toBank, difference: totals.diff })
      });
      if (res.ok) alert("✅ Kasa verileri arşivlendi.");
    } catch (err) {} finally { setIsSaving(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) { nextInput.focus(); nextInput.select(); }
    }
  };

  const removeExpenseRow = (id: number) => {
    if (expenses.length > 1) setExpenses(expenses.filter(e => e.id !== id));
    else setExpenses([{ id: Date.now(), amount: 0, date: new Date().toISOString().split('T')[0], desc: "" }]);
  };

  const smsText = `${new Date().toLocaleDateString('tr-TR')} - ${shiftType}\nSistem: ${erpTotal.toLocaleString('tr-TR')} ₺\nReel: ${totals.tlPhysical.toLocaleString('tr-TR')} ₺\nOnay Bekleyen Masraf: ${totals.totalExpenses.toLocaleString('tr-TR')} ₺\n${totals.diff >= 0 ? 'Fazla' : 'Eksik'} Tutar: ${Math.abs(totals.diff).toFixed(2)} ₺\nKontrol Eden: ${selectedStaff}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(smsText)}`;

  const handleCopyText = async () => {
      try { await navigator.clipboard.writeText(smsText); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); } catch (err) {}
  };

  const realizedPercentage = currentMonthTarget > 0 ? (hybridRealizedSales / currentMonthTarget) * 100 : 0;
  
  const mailSubject = encodeURIComponent(`[${formattedDateString}] Tarihli Günleme Hk.`);
  const formattedRevenue = Number(quickRevenue || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
  const mailBody = encodeURIComponent(`Merhaba;\n${formattedDateString} tarihli ciromuz ${formattedRevenue} TL'dir.\nİyi çalışmalar.`);
  const owaLink = `https://mail.saatvesaat.com/owa/#path=/mail/action/compose&to=${encodeURIComponent(reportEmail)}&subject=${mailSubject}&body=${mailBody}`;

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  return (
    <>
        <div className="p-4 md:p-6 bg-slate-50 min-h-screen animate-in fade-in duration-500 space-y-6">
          
          {/* ÜST BAŞLIK VE KONTROLLER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 italic uppercase tracking-tight">Kapanış <span className="text-indigo-600">Kokpiti</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ciro, Kasa Sayımı ve Raporlar Tek Ekranda</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95">📱 KASA SMS PAYLAŞ</button>
                <button onClick={handleSaveKasa} disabled={isSaving} className="flex-1 md:flex-none bg-indigo-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {isSaving ? "KAYDEDİLİYOR..." : "💾 KASAYI KAYDET"}
                </button>
            </div>
          </div>

          {/* 🚀 ÜST KARTLAR (BENTO GRID) - Ciro, Mail, Personel */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
             <QuickSaveCard formattedDateString={formattedDateString} quickRevenue={quickRevenue} setQuickRevenue={setQuickRevenue} handleQuickSave={handleQuickSave} isSavingQuick={isSavingQuick} disabled={!myStoreId} />
             <OwaMailCard reportEmail={reportEmail} setReportEmail={setReportEmail} owaLink={owaLink} handleSaveEmail={handleSaveEmail} disabled={!myStoreId} />
             <PersonnelPerformanceCard personnelSales={personnelSales} hybridRealizedSales={hybridRealizedSales} realizedPercentage={realizedPercentage} selectedStoreName={storeName} />
          </section>

          {/* 🚀 ALT KISIM: KASA İŞLEMLERİ */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            
            {/* SOL: NAKİT MATRİSİ (Tek Kolonlu Jilet Tasarım) - 3 Birim Genişlik */}
            <div className="xl:col-span-3 bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                   <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">💰 Banknot</h2>
                   <span className="text-[9px] font-bold text-slate-400 uppercase">Adet</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {DENOMINATIONS.map((d, index) => (
                    <div key={d.label} className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                      <span className="font-bold text-slate-500 text-[10px] w-12">{d.label}</span>
                      <input 
                        ref={el => { inputRefs.current[index] = el; }}
                        type="number" value={cashCounts[d.label] || ""} placeholder="0"
                        className="w-full max-w-[80px] p-1.5 bg-slate-50 border border-slate-100 rounded-md text-right font-black text-indigo-700 text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all" 
                        onChange={e => setCashCounts({...cashCounts, [d.label]: e.target.value})}
                        onKeyDown={e => handleKeyDown(e, index)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fiziki</span>
                 <span className="text-lg font-black text-indigo-900">{totals.tlPhysical.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>

            {/* SAĞ: ÖZET VE MASRAFLAR - 9 Birim Genişlik */}
            <div className="xl:col-span-9 flex flex-col gap-4">
              
              {/* ÖZET KARTI VE BANKA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                 <div className="sm:col-span-2 bg-slate-900 rounded-[1.5rem] p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
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
                          <span className={`text-xl font-black ${totals.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{totals.diff > 0 ? '+' : ''}{totals.diff.toFixed(2)} ₺</span>
                        </div>
                    </div>
                 </div>

                 <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-5 rounded-[1.5rem] shadow-md flex flex-col justify-center">
                     <h3 className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mb-1">🏦 Bankaya (Tahmini)</h3>
                     <p className="text-3xl font-black">{totals.toBank.toLocaleString('tr-TR')} ₺</p>
                 </div>
              </div>

              {/* MASRAFLAR VE PERSONEL SEÇİMİ */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                  
                  {/* PERSONEL VARDİYA (Sol) */}
                  <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col gap-3">
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none focus:border-indigo-300" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                       <option value="">Personel Seçiniz</option>
                       {personnels.map(p => <option key={p.id} value={`${p.firstName} ${p.lastName}`}>{p.firstName} {p.lastName}</option>)}
                    </select>
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none focus:border-indigo-300" value={shiftType} onChange={e => setShiftType(e.target.value)}>
                       <option value="KAPANIŞ">KAPANIŞ VARDİYASI</option>
                       <option value="AÇILIŞ">AÇILIŞ VARDİYASI</option>
                    </select>
                  </div>

                  {/* MASRAFLAR LİSTESİ (Sağ - 2 Kolon) */}
                  <div className="lg:col-span-2 bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">📑 Masraf Fişleri</h2>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Toplam: {totals.totalExpenses.toLocaleString('tr-TR')} ₺</span>
                    </div>
                    <div className="space-y-2 mb-3 max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-2">
                        {expenses.map((exp) => (
                          <div key={exp.id} className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 items-center">
                            <input type="date" value={exp.date} onChange={e => setExpenses(expenses.map(ex => ex.id === exp.id ? {...ex, date: e.target.value} : ex))} className="p-1.5 bg-white rounded-lg text-[10px] font-black text-slate-600 outline-none border border-slate-200 w-full sm:w-28" />
                            <input type="text" value={exp.desc} placeholder="Açıklama" onChange={e => setExpenses(expenses.map(ex => ex.id === exp.id ? {...ex, desc: e.target.value} : ex))} className="p-1.5 bg-white rounded-lg text-xs font-bold flex-1 outline-none border border-slate-200 w-full" />
                            <div className="flex items-center gap-1 w-full sm:w-auto">
                               <div className="relative flex-1 sm:w-24">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-400">₺</span>
                                  <input type="number" value={exp.amount || ""} placeholder="0" onChange={e => setExpenses(expenses.map(ex => ex.id === exp.id ? {...ex, amount: Number(e.target.value)} : ex))} className="p-1.5 pl-5 bg-white rounded-lg text-sm font-black text-indigo-700 w-full outline-none border border-slate-200 focus:border-indigo-400" />
                               </div>
                               <button onClick={() => removeExpenseRow(exp.id)} className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white w-7 h-7 rounded-lg font-black transition-colors">✕</button>
                            </div>
                          </div>
                        ))}
                    </div>
                    <button onClick={() => setExpenses([...expenses, { id: Date.now(), amount: 0, date: new Date().toISOString().split('T')[0], desc: "" }])} className="w-full py-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-[10px] font-black text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all uppercase tracking-widest">+ MASRAF EKLE</button>
                  </div>
              </div>

            </div>
          </div>
        </div>

        {/* 📱 KASA SMS MODAL */}
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
                    <button onClick={handleCopyText} className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${isCopied ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'}`}>
                        {isCopied ? <><span>✅</span> KOPYALANDI!</> : <><span>📝</span> METNİ KOPYALA</>}
                    </button>
                </div>
            </div>
        )}
    </>
  );
}
