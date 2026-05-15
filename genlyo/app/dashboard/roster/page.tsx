"use client";

import { useState, useEffect } from "react";
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
  const [storeName, setStoreName] = useState("YÜKLENİYOR...");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [weekStart, setWeekStart] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });

  // 🚀 MESAİ SAAT TANIMLARI
  const [shiftTimes, setShiftTimes] = useState({
    ACILIS: "10-18",
    KAPANIS: "14-22",
    ARA: "12-20",
    FULL: "10-22"
  });

  useEffect(() => {
    fetch('/api/personnel').then(res => res.json()).then(data => {
      setStaff(data);
      const initialRoster = data.map((p: any) => ({
        personnelId: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        title: p.title?.name || "",
        shifts: Array(7).fill({ value: "", isFixed: false })
      }));
      setRoster(initialRoster);
    });

    fetch('/api/stores').then(res => res.json()).then(resData => {
       const stores = Array.isArray(resData) ? resData : (resData.store ? [resData.store] : []);
       if (stores.length > 0) setStoreName(stores[0].name.toUpperCase());
    });
  }, []);

  // SAAT HESAPLAMA MOTORU (Metni alıp saat karşılığını bulur)
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
        return span >= 7 ? span - 1 : span; // 7 saatten fazlaysa 1 saat mola
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

  // 🚀 GELİŞMİŞ YAPAY ZEKA: KURALLI VE KARIŞTIRMALI DOLDURMA
  const handleSmartFill = () => {
    let newRoster = JSON.parse(JSON.stringify(roster));

    // 1. ADIM: Sabitlenmemiş (isFixed: false) tüm hücreleri temizle (Her seferinde yeni ihtimaller için)
    newRoster.forEach((row: RosterRow) => {
       row.shifts.forEach(s => { if (!s.isFixed && s.value !== "İZİN") s.value = ""; });
    });

    newRoster.forEach((row: RosterRow) => {
      const isManager = row.title.toLowerCase().includes("müdür");

      // KESİN KURALLAR DÖNGÜSÜ
      for (let d = 0; d < 7; d++) {
        // İZİN Kuralları
        if (row.shifts[d].value === "İZİN") {
          // İzin öncesi Açılış
          if (d > 0 && !row.shifts[d-1].isFixed) row.shifts[d-1].value = "AÇILIŞ";
          // İzin sonrası Kapanış
          if (d < 6 && !row.shifts[d+1].isFixed) row.shifts[d+1].value = "KAPANIŞ";
          // Pazartesi (0) izinliyse Pazar (6) Açılış!
          if (d === 0 && !row.shifts[6].isFixed) row.shifts[6].value = "AÇILIŞ";
        }

        // Müdür Hafta Sonu Zırhı
        if (isManager && !row.shifts[d].isFixed) {
           if (d === 4 || d === 5) row.shifts[d].value = "KAPANIŞ"; // Cuma, Cts kesin Kapanış
           if (d === 6 && !row.shifts[d].value) row.shifts[d].value = Math.random() > 0.5 ? "KAPANIŞ" : "ARA"; // Pazar Kapanış veya Ara
        }
      }

      // Herkese Rastgele 1 FULL atama (Eğer hiç yoksa)
      let fullCount = row.shifts.filter(s => s.value === "FULL").length;
      if (fullCount === 0) {
         let emptyDays = [];
         for(let i=0; i<7; i++) {
            if (!row.shifts[i].value && !(isManager && (i===4||i===5||i===6))) emptyDays.push(i);
         }
         if (emptyDays.length > 0) {
            let randomDay = emptyDays[Math.floor(Math.random() * emptyDays.length)];
            row.shifts[randomDay].value = "FULL";
         }
      }
    });

    // 2. ADIM: GÜN GÜN DAĞILIM VE KAPSAMA (2 Sabah 2 Akşam Hedefi)
    for (let d = 0; d < 7; d++) {
       let acilisCount = 0; let kapanisCount = 0;
       
       // Önce o gün mevcut olanları say
       newRoster.forEach((r: RosterRow) => {
          if (r.shifts[d].value === "AÇILIŞ" || r.shifts[d].value === "FULL") acilisCount++;
          if (r.shifts[d].value === "KAPANIŞ" || r.shifts[d].value === "FULL") kapanisCount++;
       });

       // O gün boş olan personelleri bul ve KARIŞTIR (Shuffle)
       let unassigned = newRoster.filter((r: RosterRow) => !r.shifts[d].value);
       unassigned.sort(() => Math.random() - 0.5);

       unassigned.forEach((row: RosterRow) => {
          let prevShift = d > 0 ? row.shifts[d-1].value : "";
          let pref = prevShift === "AÇILIŞ" ? "KAPANIŞ" : (prevShift === "KAPANIŞ" ? "AÇILIŞ" : ["AÇILIŞ", "KAPANIŞ"][Math.floor(Math.random()*2)]);

          if (acilisCount < 2 && pref === "AÇILIŞ") { row.shifts[d].value = "AÇILIŞ"; acilisCount++; }
          else if (kapanisCount < 2 && pref === "KAPANIŞ") { row.shifts[d].value = "KAPANIŞ"; kapanisCount++; }
          else if (acilisCount < 2) { row.shifts[d].value = "AÇILIŞ"; acilisCount++; }
          else if (kapanisCount < 2) { row.shifts[d].value = "KAPANIŞ"; kapanisCount++; }
          else {
             // Kapsama yeterliyse ARA veya tercih edileni ver
             let choice = Math.random() > 0.6 ? "ARA" : pref;
             row.shifts[d].value = choice;
             if (choice === "AÇILIŞ") acilisCount++;
             if (choice === "KAPANIŞ") kapanisCount++;
          }
       });
    }

    setRoster(newRoster);
  };

  const exportToExcel = (format: "xlsx" | "ods") => {
    const wsData: any[][] = [];
    wsData.push(["MAĞAZA", "Adı", "Soyadı", ...DAYS]);
    
    const dates = DAYS.map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d.toLocaleDateString("tr-TR");
    });
    wsData.push(["", "", "", ...dates]);

    roster.forEach((row, idx) => {
       const shiftValues = row.shifts.map(s => s.value);
       const storeDisplay = idx === 0 ? storeName : "";
       wsData.push([storeDisplay, row.firstName, row.lastName, ...shiftValues]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Çizelge");
    XLSX.writeFile(wb, `Haftalik_Cizelge_${weekStart}.${format}`);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-in fade-in duration-500">
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic uppercase leading-none">Çizelge <span className="text-indigo-600">Motoru</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Akıllı Roster Yönetimi</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm" />
          
          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">
            ⚙️ ŞABLONLAR
          </button>

          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          <button onClick={handleSmartFill} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-md active:scale-95 flex items-center gap-2">
            <span>✨</span> AKILLI DOLDUR
          </button>
          <button onClick={() => exportToExcel("xlsx")} className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-emerald-700 transition-all">
            .XLSX İNDİR
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
                 const d = new Date(weekStart);
                 d.setDate(d.getDate() + i);
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
                          
                          {/* GELİŞMİŞ HÜCRE (Select veya Input) */}
                          {isStandard ? (
                            <select
                              value={shift.value}
                              onChange={(e) => {
                                 if (e.target.value === "ÖZEL") updateShift(pIdx, dIdx, "11-19"); // Özel inputa geçiş
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
                              value={shift.value}
                              autoFocus
                              onChange={(e) => updateShift(pIdx, dIdx, e.target.value)}
                              onBlur={(e) => { if(!e.target.value) updateShift(pIdx, dIdx, ""); }} // Silinirse Select'e geri dön
                              className="w-20 p-2 text-center text-xs font-black uppercase outline-none rounded-lg border border-purple-400 bg-purple-50 text-purple-700 shadow-inner"
                            />
                          )}

                          <button 
                            onClick={() => updateShift(pIdx, dIdx, shift.value, true)}
                            title={shift.isFixed ? "Kilidi Aç" : "Bu günü sabitle"}
                            className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs transition-all ${shift.isFixed ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200'}`}
                          >
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
                    {overtime > 0 ? (
                       <div className="font-black text-white text-xs bg-rose-500 py-1.5 rounded-lg shadow-sm">+{overtime}s</div>
                    ) : (
                       <div className="font-black text-slate-300 text-xs py-1.5">-</div>
                    )}
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
