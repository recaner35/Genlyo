"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const SHIFT_OPTIONS = ["AÇILIŞ", "KAPANIŞ", "ARA", "FULL", "İZİN", "RAPOR"];

interface ShiftCell { value: string; isFixed: boolean; }
interface RosterRow { personnelId: number; firstName: string; lastName: string; title: string; shifts: ShiftCell[]; }

export default function RosterPage() {
  const { data: session } = useSession();
  const [staff, setStaff] = useState<any[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [storeName, setStoreName] = useState("MUĞLA FETHİYE ERASTA");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [weekStart, setWeekStart] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });

  const [shiftTimes, setShiftTimes] = useState({
    ACILIS: "10-18",
    KAPANIS: "14-22",
    ARA: "12-20",
    FULL: "10-22"
  });

  // VERİTABANINDAN VE PERSONELDEN VERİLERİ YÜKLE
  const loadRoster = useCallback(async () => {
    const personnelRes = await fetch('/api/personnel');
    const personnelData = await personnelRes.json();
    setStaff(personnelData);

    const savedRes = await fetch(`/api/roster?date=${weekStart}`);
    const savedData = await savedRes.json();

    if (savedData.data) {
      setRoster(savedData.data);
      if (savedData.config) setShiftTimes(savedData.config);
    } else {
      const initialRoster = personnelData.map((p: any) => ({
        personnelId: p.id,
        firstName: p.firstName.toUpperCase(),
        lastName: p.lastName.toUpperCase(),
        title: p.title?.name || "",
        shifts: Array(7).fill({ value: "", isFixed: false })
      }));
      setRoster(initialRoster);
    }
  }, [weekStart]);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  useEffect(() => {
    fetch('/api/stores').then(res => res.json()).then(resData => {
       const stores = Array.isArray(resData) ? resData : (resData.store ? [resData.store] : []);
       if (stores.length > 0 && stores[0].name) {
          setStoreName(stores[0].name.toUpperCase());
       }
    });
  }, []);

  const calculateHours = (val: string) => {
    if (!val || val === "İZİN" || val === "RAPOR") return 0;
    if (val === "FULL") return 10;
    
    let timeStr = val;
    if (val === "AÇILIŞ") timeStr = shiftTimes.ACILIS;
    else if (val === "KAPANIŞ") timeStr = shiftTimes.KAPANIS;
    else if (val === "ARA") timeStr = shiftTimes.ARA;

    const parts = timeStr.split("-");
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        let span = end - start;
        if (span < 0) span += 24; 
        return span >= 7 ? span - 1 : span;
      }
    }
    return 0;
  };

  const updateShift = (personIdx: number, dayIdx: number, val: string, toggleFixed: boolean = false) => {
    const newRoster = [...roster];
    const current = newRoster[personIdx].shifts[dayIdx];
    newRoster[personIdx].shifts[dayIdx] = {
      value: toggleFixed ? current.value : val.toUpperCase(),
      isFixed: toggleFixed ? !current.isFixed : current.isFixed
    };
    setRoster(newRoster);
  };

  // AKILLI OTO-DOLDURMA ALGORİTMASI
  const handleSmartFill = () => {
    let newRoster = JSON.parse(JSON.stringify(roster));

    newRoster.forEach((row: RosterRow) => {
       row.shifts.forEach(s => { if (!s.isFixed) s.value = ""; });
    });

    let izinCounts = [0, 0, 0, 0, 0, 0, 0];
    newRoster.forEach((r: RosterRow) => r.shifts.forEach((s, d) => { if(s.value === "İZİN") izinCounts[d]++; }));

    newRoster.forEach((r: RosterRow) => {
      let hasIzin = r.shifts.some(s => s.value === "İZİN");
      if (!hasIzin) {
         let allowedDays = [0, 1, 2, 3].filter(d => !r.shifts[d].isFixed && !r.shifts[d].value);
         if (allowedDays.length > 0) {
            allowedDays.sort((a, b) => izinCounts[a] - izinCounts[b]);
            let picked = allowedDays[0];
            r.shifts[picked].value = "İZİN";
            izinCounts[picked]++;
         }
      }
    });

    newRoster.forEach((r: RosterRow) => {
      let hasFull = r.shifts.some(s => s.value === "FULL");
      if (!hasFull) {
         let allowedDays = [0, 1, 2, 3, 4, 5, 6].filter(d => !r.shifts[d].isFixed && r.shifts[d].value !== "İZİN");
         if (allowedDays.length > 0) {
            allowedDays.sort((a, b) => {
               let weightA = (izinCounts[a] * 10) + (a >= 4 ? 5 : 0);
               let weightB = (izinCounts[b] * 10) + (b >= 4 ? 5 : 0);
               return weightB - weightA;
            });
            r.shifts[allowedDays[0]].value = "FULL";
         }
      }
    });

    newRoster.forEach((row: RosterRow) => {
      const isManager = row.title.toLowerCase().includes("müdür");
      for (let d = 0; d < 7; d++) {
        if (row.shifts[d].value === "İZİN") {
          if (d > 0 && !row.shifts[d-1].isFixed && !row.shifts[d-1].value) row.shifts[d-1].value = "AÇILIŞ";
          if (d < 6 && !row.shifts[d+1].isFixed && !row.shifts[d+1].value) row.shifts[d+1].value = "KAPANIŞ";
          if (d === 0 && !row.shifts[6].isFixed && !row.shifts[6].value) row.shifts[6].value = "AÇILIŞ";
        }
        if (isManager && !row.shifts[d].isFixed && !row.shifts[d].value) {
           if (d === 4 || d === 5) row.shifts[d].value = "KAPANIŞ";
           if (d === 6) row.shifts[d].value = Math.random() > 0.5 ? "KAPANIŞ" : "ARA";
        }
      }
    });

    for (let d = 0; d < 7; d++) {
       let acilisCount = 0; let kapanisCount = 0;
       newRoster.forEach((r: RosterRow) => {
          if (r.shifts[d].value === "AÇILIŞ" || r.shifts[d].value === "FULL") acilisCount++;
          if (r.shifts[d].value === "KAPANIŞ" || r.shifts[d].value === "FULL") kapanisCount++;
       });

       let unassigned = newRoster.filter((r: RosterRow) => !r.shifts[d].value);
       unassigned.sort(() => Math.random() - 0.5);

       unassigned.forEach((row: RosterRow) => {
          let prev = d > 0 ? row.shifts[d-1].value : "";
          let pref = prev === "AÇILIŞ" ? "KAPANIŞ" : (prev === "KAPANIŞ" ? "AÇILIŞ" : ["AÇILIŞ", "KAPANIŞ"][Math.floor(Math.random()*2)]);

          if (acilisCount < 2 && pref === "AÇILIŞ") { row.shifts[d].value = "AÇILIŞ"; acilisCount++; }
          else if (kapanisCount < 2 && pref === "KAPANIŞ") { row.shifts[d].value = "KAPANIŞ"; kapanisCount++; }
          else if (acilisCount < 2) { row.shifts[d].value = "AÇILIŞ"; acilisCount++; }
          else if (kapanisCount < 2) { row.shifts[d].value = "KAPANIŞ"; kapanisCount++; }
          else {
             let choice = Math.random() > 0.6 ? "ARA" : pref;
             row.shifts[d].value = choice;
             if (choice === "AÇILIŞ") acilisCount++;
             if (choice === "KAPANIŞ") kapanisCount++;
          }
       });
    }

    setRoster(newRoster);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, data: roster, config: shiftTimes })
      });
      if (res.ok) alert("✅ Çizelge başarıyla veritabanına kaydedildi!");
      else alert("❌ Kayıt sırasında bir hata oluştu.");
    } catch (err) {
       alert("❌ Sunucu hatası.");
    } finally {
       setIsSaving(false);
    }
  };

  // 🚀 BIREBIR TEMPLATE UYUMLU EXCEL / ODS EXPORT MOTORU
  const handleExport = (format: "xlsx" | "ods") => {
    const wsData: any[][] = [];
    
    // Satır 1: Ana Başlıklar
    wsData.push(["MAĞAZA", "Adı", "Soyadı", ...DAYS]);
    
    // Satır 2: Tarih Bilgileri (Hizalamayı bozmamak için ilk 3 sütun boş)
    const dateRow = ["", "", ""];
    DAYS.forEach((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      dateRow.push(d.toLocaleDateString("tr-TR"));
    });
    wsData.push(dateRow);

    // Satır 3 ve Sonrası: Personel Verileri
    roster.forEach((row, idx) => {
       const shiftValues = row.shifts.map(s => s.value || "");
       // Mağaza adı sadece en üstteki satırda yazar, altındakiler şablondaki gibi boş kalır
       const storeDisplay = idx === 0 ? storeName.toUpperCase() : "";
       wsData.push([storeDisplay, row.firstName.toUpperCase(), row.lastName.toUpperCase(), ...shiftValues]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Çalışma Sayfası1");
    
    // Dosya indirme tetiği
    XLSX.writeFile(wb, `Haftalik_Cizelge_${weekStart}.${format}`);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-in fade-in duration-500">
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic uppercase leading-none">Çizelge <span className="text-indigo-600">Motoru</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Kurumsal Shift & Roster Yönetimi</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm cursor-pointer" />
          
          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">
            ⚙️ ŞABLONLAR
          </button>

          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          <button onClick={handleSmartFill} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-md active:scale-95 flex items-center gap-2">
            <span>✨</span> AKILLI DOLDUR
          </button>

          <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
            {isSaving ? "KAYDEDİLİYOR..." : "💾 SİSTEME KAYDET"}
          </button>

          {/* GÜNCELLENEN VE GERİ GELEN İNDİRME BUTONLARI */}
          <button onClick={() => handleExport("xlsx")} className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-emerald-700 transition-all">
            .XLSX İNDİR
          </button>
          
          <button onClick={() => handleExport("ods")} className="bg-amber-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-amber-600 transition-all">
            .ODS İNDİR
          </button>
        </div>
      </div>

      {isSettingsOpen && (
        <div className="mb-6 bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Açılış Mesaisi</label><input type="text" value={shiftTimes.ACILIS} onChange={e => setShiftTimes({...shiftTimes, ACILIS: e.target.value})} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none focus:border-indigo-400"/></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Kapanış Mesaisi</label><input type="text" value={shiftTimes.KAPANIS} onChange={e => setShiftTimes({...shiftTimes, KAPANIS: e.target.value})} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none focus:border-indigo-400"/></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Ara Mesai</label><input type="text" value={shiftTimes.ARA} onChange={e => setShiftTimes({...shiftTimes, ARA: e.target.value})} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none focus:border-indigo-400"/></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Full Mesai</label><input type="text" value={shiftTimes.FULL} onChange={e => setShiftTimes({...shiftTimes, FULL: e.target.value})} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none focus:border-indigo-400"/></div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead className="bg-slate-900 text-white border-b-4 border-indigo-600">
            <tr className="text-[10px] font-black uppercase tracking-widest">
              <th className="p-4 w-[16%]">Personel</th>
              {DAYS.map((day, i) => {
                 const d = new Date(weekStart); d.setDate(d.getDate() + i);
                 return (
                   <th key={day} className="p-4 text-center border-l border-white/10 w-[9.5%]">
                     <span className="block text-xs">{day}</span>
                     <span className="text-[9px] text-indigo-300 font-bold">{d.toLocaleDateString("tr-TR").slice(0,5)}</span>
                   </th>
                 );
              })}
              <th className="p-4 text-center border-l border-white/10 w-[8%] text-emerald-400">Toplam</th>
              <th className="p-4 text-center border-l border-white/10 w-[8%] text-rose-400">Fazla</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roster.map((row, pIdx) => {
              const totalHours = row.shifts.reduce((sum, shift) => sum + calculateHours(shift.value), 0);
              const overtime = totalHours > 45 ? totalHours - 45 : 0;
              const isManager = row.title.toLowerCase().includes("müdür");

              return (
                <tr key={row.personnelId} className="hover:bg-slate-50 transition-colors group/row">
                  <td className="p-4">
                    <div className="font-black text-slate-800 text-xs uppercase">{row.firstName} {row.lastName}</div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest ${isManager ? 'text-indigo-600' : 'text-slate-400'}`}>{row.title}</div>
                  </td>
                  
                  {row.shifts.map((shift, dIdx) => {
                    const isStandard = shift.value === "" || SHIFT_OPTIONS.includes(shift.value);
                    return (
                      <td key={dIdx} className="p-2 text-center border-l border-slate-100 relative group">
                        <div className="flex items-center justify-center gap-1">
                          {isStandard ? (
                            <select
                              value={shift.value}
                              onChange={(e) => {
                                 if (e.target.value === "ÖZEL") updateShift(pIdx, dIdx, "11-19");
                                 else updateShift(pIdx, dIdx, e.target.value);
                              }}
                              className={`w-20 p-2 text-center text-xs font-black uppercase outline-none rounded-lg transition-all border cursor-pointer appearance-none
                                ${shift.isFixed ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-400 focus:bg-white bg-slate-50 text-slate-700'}
                                ${shift.value === 'İZİN' ? 'bg-rose-50 border-rose-200 text-rose-600' : ''}
                                ${shift.value === 'FULL' ? 'bg-amber-50 border-amber-200 text-amber-600' : ''}
                              `}
                            >
                              <option value=""></option>
                              {SHIFT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                              <option value="ÖZEL">Özel Saat...</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={shift.value} autoFocus
                              onChange={(e) => updateShift(pIdx, dIdx, e.target.value)}
                              onBlur={(e) => { if(!e.target.value) updateShift(pIdx, dIdx, ""); }}
                              className="w-20 p-2 text-center text-xs font-black uppercase outline-none rounded-lg border border-purple-400 bg-purple-50 text-purple-700 shadow-inner"
                            />
                          )}
                          <button onClick={() => updateShift(pIdx, dIdx, shift.value, true)} title={shift.isFixed ? "Kilidi Aç" : "Bu günü sabitle"} className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs transition-all ${shift.isFixed ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200'}`}>
                            {shift.isFixed ? '🔒' : '📌'}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                  
                  <td className="p-3 text-center border-l border-slate-100">
                    <div className={`font-black text-sm py-1.5 rounded-lg ${totalHours === 45 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{totalHours}s</div>
                  </td>
                  <td className="p-3 text-center border-l border-slate-100">
                    {overtime > 0 ? <div className="font-black text-white text-xs bg-rose-500 py-1.5 rounded-lg shadow-sm">+{overtime}s</div> : <div className="font-black text-slate-300 text-xs py-1.5">-</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
