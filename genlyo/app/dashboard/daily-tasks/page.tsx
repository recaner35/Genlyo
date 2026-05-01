"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

// 🚀 DOKÜMANTASYON: Masraf objesi için TypeScript arayüzü
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

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 🚀 ADIM 1: Veritabanından verileri çekme ve sayfayı doldurma
  useEffect(() => {
    const initPage = async () => {
      try {
        const [resP, resT] = await Promise.all([
          fetch('/api/personnel'),
          fetch('/api/daily-tasks', { cache: 'no-store' }) // Önbelleği devre dışı bırakıyoruz
        ]);

        if (resP.ok) setPersonnels(await resP.json());
        
        if (resT.ok) {
          const tData = await resT.json();
          // Eğer veritabanında bir kayıt bulunduysa state'leri güncelle
          if (tData && tData.id) {
            setCashCounts(tData.cashCounts || {});
            // Masraflar veritabanında dizi olarak saklandığı için doğrudan atayabiliriz
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

  // 🚀 ADIM 2: Masraf silme fonksiyonu
  const removeExpenseRow = (id: number) => {
    // Eğer sadece bir satır varsa silmek yerine temizle, birden fazlaysa satırı uçur
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

  if (loading) return <div className="p-20 text-center font-black animate-pulse">VERİLER EŞİTLENİYOR...</div>;

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-slate-900 italic uppercase">Günlük <span className="text-indigo-600">İşler</span></h1>
        <button onClick={handleSaveToDB} disabled={isSaving} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">
          {isSaving ? "İŞLENİYOR..." : "💾 VERİTABANINA KAYDET"}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* NAKİT MATRİSİ */}
        <div className="xl:col-span-1 bg-white p-6 rounded-[2.5rem] border border-slate-200">
          <h2 className="text-lg font-black mb-4 italic uppercase">💰 Nakit Sayım</h2>
          <div className="space-y-3">
            {DENOMINATIONS.map((d, index) => (
              <div key={d.label} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-600 text-xs w-20">{d.label}</span>
                <input 
                  ref={el => { inputRefs.current[index] = el; }}
                  type="number" 
                  value={cashCounts[d.label] || ""} 
                  className="w-20 p-2 bg-slate-100 rounded-lg text-center font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500" 
                  onChange={e => setCashCounts({...cashCounts, [d.label]: e.target.value})}
                  onKeyDown={e => handleKeyDown(e, index)}
                />
                <span className="font-black text-slate-400 text-[10px] w-20 text-right">{((Number(cashCounts[d.label]) || 0) * d.value).toLocaleString('tr-TR')} ₺</span>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-8">
          {/* ÖZET PANELİ */}
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">ERP Sistem Tutarı</label>
              <input type="number" value={erpTotal || ""} className="w-full bg-slate-800 rounded-xl p-4 mt-2 font-black text-2xl text-indigo-400 outline-none" onChange={e => setErpTotal(Number(e.target.value))} />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase text-slate-400">Fiziki + Masraf</span>
              <span className="text-2xl font-black text-emerald-400">{totals.realTotal.toLocaleString('tr-TR')} ₺</span>
            </div>
            <div className="flex flex-col justify-center border-l border-slate-700 pl-6">
              <span className="text-[10px] font-black uppercase text-slate-400">Fark</span>
              <span className={`text-2xl font-black ${totals.diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totals.diff.toFixed(2)} ₺</span>
            </div>
          </div>

          {/* MASRAFLAR */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200">
            <h2 className="text-lg font-black mb-6 italic uppercase">📑 Günlük Masraflar</h2>
            {expenses.map((exp) => (
              <div key={exp.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-slate-50 p-4 rounded-2xl relative">
                <input type="date" value={exp.date} onChange={e => setExpenses(expenses.map(ex => ex.id === exp.id ? {...ex, date: e.target.value} : ex))} className="p-2 rounded-lg text-xs font-bold outline-none" />
                <input type="text" value={exp.desc} placeholder="Açıklama" onChange={e => setExpenses(expenses.map(ex => ex.id === exp.id ? {...ex, desc: e.target.value} : ex))} className="p-2 rounded-lg text-xs font-bold md:col-span-2 outline-none" />
                <div className="flex items-center gap-2">
                   <input type="number" value={exp.amount || ""} placeholder="Tutar" onChange={e => setExpenses(expenses.map(ex => ex.id === exp.id ? {...ex, amount: Number(e.target.value)} : ex))} className="p-2 rounded-lg text-xs font-black text-indigo-600 w-full outline-none" />
                   {/* 🚀 Silme Butonu */}
                   <button onClick={() => removeExpenseRow(exp.id)} className="text-red-400 hover:text-red-600 font-black p-2 transition-colors">✕</button>
                </div>
              </div>
            ))}
            <button onClick={() => setExpenses([...expenses, { id: Date.now(), amount: 0, date: new Date().toISOString().split('T')[0], desc: "" }])} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-black text-slate-400 hover:bg-slate-50 transition-all uppercase">+ YENİ MASRAF EKLE</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] flex flex-col justify-center shadow-lg shadow-indigo-100">
               <h3 className="text-xs font-black uppercase opacity-80 tracking-widest">🏦 Bankaya Yatırılacak</h3>
               <p className="text-4xl font-black mt-2">{totals.toBank.toLocaleString('tr-TR')} ₺</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex flex-col items-center shadow-sm">
              <div className="w-full space-y-3 mb-6">
                <select className="w-full p-3 bg-slate-50 rounded-xl text-xs font-black outline-none border border-slate-100" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                   <option value="">Personel Seçiniz</option>
                   {personnels.map(p => <option key={p.id} value={`${p.firstName} ${p.lastName}`}>{p.firstName} {p.lastName}</option>)}
                </select>
                <select className="w-full p-3 bg-slate-50 rounded-xl text-xs font-black outline-none border border-slate-100" value={shiftType} onChange={e => setShiftType(e.target.value)}>
                   <option value="KAPANIŞ">KAPANIŞ</option>
                   <option value="AÇILIŞ">AÇILIŞ</option>
                </select>
              </div>
              <QRCodeSVG value={smsText} size={110} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}