"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

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

  // 🚀 MESAİ ŞABLONLARI (Ayarlanabilir)
  const [shiftSettings, setShiftSettings] = useState({
    acilis: "10-18",
    kapanis: "14-22",
    ara: "12-20",
    full: "FULL"
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

  // SAAT HESAPLAMA MOTORU (7 saatten fazlaysa 1 saat mola düşer)
  const calculateHours = (shift: string) => {
    if (!shift || shift.toUpperCase() === "İZİN" || shift.toUpperCase() === "IZIN" || shift.toUpperCase() === "RAPOR") return 0;
    if (shift.toUpperCase() === shiftSettings.full.toUpperCase() || shift.toUpperCase() === "FULL") return 10; // Full mesai net 10 saattir
    
    const parts = shift.split("-");
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        let span = end - start;
        if (span < 0) span += 24; 
        return span >= 7 ? span - 1 : span; // Mola düşümü
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

  // 🚀 YAPAY ZEKA: KURALLI DOLDURMA
  const handleSmartFill = () => {
    let newRoster = JSON.parse(JSON.stringify(roster));

    newRoster.forEach((row: RosterRow) => {
      const isManager = row.title.toLowerCase().includes("müdür");

      // 1. KURAL: İzin Öncesi Açılış, İzin Sonrası Kapanış
      for (let d = 0; d < 7; d++) {
        if (row.shifts[d].value === "İZİN") {
          if (d > 0 && !row.shifts[d-1].isFixed && !row.shifts[d-1].value) {
             row.shifts[d-1].value = shiftSettings.acilis;
             row.shifts[d-1].isFixed = true; // Sistem atadı, kilitledi
          }
          if (d < 6 && !row.shifts[d+1].isFixed && !row.shifts[d+1].value) {
             row.shifts[d+1].value = shiftSettings.kapanis;
             row.shifts[d+1].isFixed = true; 
          }
        }
      }

      // 2. KURAL: Haftada Max 1 Full ve 45 Saat Dengesi
      let fullCount = row.shifts.filter(s => s.value === shiftSettings.full || s.value === "FULL").length;
      
      for (let d = 0; d < 7; d++) {
        if (!row.shifts[d].isFixed && !row.shifts[d].value) {
            const isWeekend = (d === 4 || d === 5); // Cuma(4), Cts(5)
            
            // Müdür Cuma-Cts Açılış yazılmaz
            let allowedShifts = [shiftSettings.acilis, shiftSettings.kapanis];
            if (isManager && isWeekend) {
               allowedShifts = [shiftSettings.kapanis]; 
            }

            // Eğer hiç FULL yazılmadıysa 1 tane FULL hakkını kullan (45 saati bulmak için)
            if (fullCount === 0) {
                row.shifts[d].value = shiftSettings.full;
                fullCount++;
            } else {
                // Kalan günlere rastgele (ama kurallı) sabah veya akşam yaz
                row.shifts[d].value = allowedShifts[Math.floor(Math.random() * allowedShifts.length)];
            }
        }
      }
    });

    setRoster(newRoster);
  };

  // EXCEL & ODS ÇIKTI ALMA
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
    XLSX.utils.book_append_sheet(wb, ws, "Çalışma_Sayfası1");
    XLSX.writeFile(wb, `Haftalik_Cizelge_${weekStart}.${format}`);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-in fade-in duration-500">
      
      {/* BAŞLIK VE BUTONLAR */}
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
          <button onClick={() => exportToExcel("ods")} className="bg-amber-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-amber-600 transition-all">
            .ODS İNDİR
          </button>
        </div>
      </div>

      {/* 🚀 AYARLAR PANELİ (Açılır/Kapanır) */}
      {isSettingsOpen && (
        <div className="mb-6 bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Açılış Mesaisi</label><input type="text" value={shiftSettings.acilis} onChange={e => setShiftSettings({...shiftSettings, acilis: e.target.value})} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none focus:border-indigo-400"/></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Kapanış Mesaisi</label><input type="text" value={shiftSettings.kapanis} onChange={e => setShiftSettings({...shiftSettings, kapanis: e.target.value})} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none focus:border-indigo-400"/></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Ara Mesai</label><input type="text" value={shiftSettings.ara} onChange={e => setShiftSettings({...shiftSettings, ara: e.target.value})} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none focus:border-indigo-400"/></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Full Mesai</label><input type="text" value={shiftSettings.full} onChange={e => setShiftSettings({...shiftSettings, full: e.target.value})} className="w-full mt-1 p-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-black outline-none focus:border-amber-400"/></div>
        </div>
      )}

      {/* HTML5 DATALIST (Dropdown için Seçenekler) */}
      <datalist id="shift-options">
        <option value={shiftSettings.acilis} />
        <option value={shiftSettings.kapanis} />
        <option value={shiftSettings.ara} />
        <option value={shiftSettings.full} />
        <option value="İZİN" />
        <option value="RAPOR" />
      </datalist>

      {/* ÇİZELGE TABLOSU */}
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
                  
                  {row.shifts.map((shift, dIdx) => (
                    <td key={dIdx} className="p-2 text-center border-l border-slate-100 relative group">
                      <div className="flex items-center justify-center gap-1">
                        {/* AÇILIR LİSTELİ İNPUT */}
                        <input
                          list="shift-options"
                          type="text"
                          value={shift.value}
                          placeholder="..."
                          onChange={(e) => updateShift(pIdx, dIdx, e.target.value)}
                          className={`w-16 p-2 text-center text-xs font-black uppercase outline-none rounded-lg transition-all border shadow-inner
                            ${shift.isFixed ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 focus:border-indigo-400 focus:bg-white bg-slate-50 text-slate-700'}
                            ${shift.value === 'İZİN' ? 'bg-rose-50 border-rose-200 text-rose-600' : ''}
                            ${(shift.value === shiftSettings.full || shift.value === 'FULL') ? 'bg-amber-50 border-amber-200 text-amber-600' : ''}
                          `}
                        />
                        <button 
                          onClick={() => updateShift(pIdx, dIdx, shift.value, true)}
                          title={shift.isFixed ? "Kilidi Aç" : "Bu günü sabitle"}
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-xs transition-all ${shift.isFixed ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200'}`}
                        >
                          {shift.isFixed ? '🔒' : '📌'}
                        </button>
                      </div>
                    </td>
                  ))}
                  
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
