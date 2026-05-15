"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

// Çalışma saati hesaplama motoru (Örn: "10-18" -> 7 saat, "10-21" -> 10 saat, "FULL" -> 10 saat)
const calculateHours = (shift: string) => {
  if (!shift || shift === "İZİN" || shift.toUpperCase() === "IZIN" || shift === "RAPOR") return 0;
  if (shift.toUpperCase() === "FULL") return 10;
  
  const parts = shift.split("-");
  if (parts.length === 2) {
    const start = parseInt(parts[0], 10);
    const end = parseInt(parts[1], 10);
    if (!isNaN(start) && !isNaN(end)) {
      let span = end - start;
      if (span < 0) span += 24; // Gece yarısını geçen vardiyalar için (Örn 18-02)
      // 7 saatten fazla çalışmalarda 1 saat mola düşülür
      return span >= 7 ? span - 1 : span;
    }
  }
  return 0; // Geçersiz format
};

interface ShiftCell {
  value: string;
  isFixed: boolean;
}

interface RosterRow {
  personnelId: number;
  firstName: string;
  lastName: string;
  title: string;
  shifts: ShiftCell[];
}

export default function RosterPage() {
  const { data: session } = useSession();
  const [staff, setStaff] = useState<any[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [storeName, setStoreName] = useState("MUĞLA FETHİYE ERASTA");
  const [weekStart, setWeekStart] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Bu haftanın Pazartesi'ni bul
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });

  useEffect(() => {
    // Personel listesini API'den çekiyoruz
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

  // HÜCRE GÜNCELLEME
  const updateShift = (personIdx: number, dayIdx: number, val: string, toggleFixed: boolean = false) => {
    const newRoster = [...roster];
    const current = newRoster[personIdx].shifts[dayIdx];
    newRoster[personIdx].shifts[dayIdx] = {
      value: val.toUpperCase(),
      isFixed: toggleFixed ? !current.isFixed : current.isFixed
    };
    setRoster(newRoster);
  };

  // 🚀 YAPAY ZEKA: AKILLI DOLDURMA ALGORİTMASI
  const handleSmartFill = () => {
    let newRoster = JSON.parse(JSON.stringify(roster)); // Derin kopya

    const SHIFTS = ["10-18", "14-22", "FULL"];

    newRoster.forEach((row: RosterRow) => {
      // 1. KURAL: İZİN GÜNLERİNİN ÖNCESİ VE SONRASI
      for (let d = 0; d < 7; d++) {
        if (row.shifts[d].value === "İZİN") {
          // İzin öncesi (Eğer sabitlenmemişse) Açılış olsun
          if (d > 0 && !row.shifts[d-1].isFixed) {
             row.shifts[d-1].value = "10-18";
             row.shifts[d-1].isFixed = true; // Algoritma atadı, sabitle
          }
          // İzin sonrası (Eğer sabitlenmemişse) Kapanış olsun
          if (d < 6 && !row.shifts[d+1].isFixed) {
             row.shifts[d+1].value = "14-22";
             row.shifts[d+1].isFixed = true; 
          }
        }
      }

      // 2. KURAL: 45 SAATİ DENGELİ DOLDUR & MÜDÜR CUMA/CTS SABAHÇI OLAMAZ
      let totalHours = row.shifts.reduce((sum: number, shift: ShiftCell) => sum + calculateHours(shift.value), 0);
      
      for (let d = 0; d < 7; d++) {
        if (!row.shifts[d].isFixed && row.shifts[d].value === "") {
            const isManager = row.title.toLowerCase().includes("müdür");
            const isWeekend = d === 4 || d === 5; // Cuma (4) ve Cumartesi (5)
            
            let possibleShifts = [...SHIFTS];
            
            // Müdür kuralı
            if (isManager && isWeekend) {
               possibleShifts = possibleShifts.filter(s => s !== "10-18");
            }

            // Saat tamamlama mantığı (Rastgele ama hedefe yönelik)
            if (totalHours < 35) {
                row.shifts[d].value = "FULL"; // Açığı kapatmak için full ver
            } else {
                // Rastgele 10-18 veya 14-22
                const randomShift = possibleShifts[Math.floor(Math.random() * possibleShifts.length)];
                row.shifts[d].value = randomShift === "FULL" ? "14-22" : randomShift;
            }
            
            totalHours += calculateHours(row.shifts[d].value);
        }
      }
    });

    setRoster(newRoster);
    alert("✨ Yapay Zeka: İzin kuralları uygulandı ve boşluklar dolduruldu!");
  };

  // EXCEL & ODS EXPORT (Birebir İstediğin Format)
  const exportToExcel = (format: "xlsx" | "ods") => {
    const wsData: any[][] = [];
    
    // Satır 1: Başlıklar
    wsData.push(["MAĞAZA", "Adı", "Soyadı", ...DAYS]);
    
    // Satır 2: Tarihler (Pazartesiden itibaren)
    const dates = DAYS.map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d.toLocaleDateString("tr-TR");
    });
    wsData.push(["", "", "", ...dates]);

    // Satır 3+: Veriler
    roster.forEach((row, idx) => {
       const shiftValues = row.shifts.map(s => s.value);
       // İlk satırda mağaza adını göster, diğerlerinde boş bırak (Excel'deki gibi)
       const storeDisplay = idx === 0 ? storeName : "";
       wsData.push([storeDisplay, row.firstName, row.lastName, ...shiftValues]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Çalışma Sayfası1");
    XLSX.writeFile(wb, `Haftalik_Cizelge_${weekStart}.${format}`);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic uppercase leading-none">Çizelge <span className="text-indigo-600">Motoru</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Haftalık Shift Yönetimi</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <input 
            type="date" 
            value={weekStart} 
            onChange={(e) => setWeekStart(e.target.value)} 
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none"
          />
          <button onClick={handleSmartFill} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-md active:scale-95 flex items-center gap-2">
            <span>✨</span> AKILLI DOLDUR
          </button>
          <div className="h-8 w-px bg-slate-200 mx-1"></div>
          <button onClick={() => exportToExcel("xlsx")} className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-emerald-700 transition-all">
            .XLSX İNDİR
          </button>
          <button onClick={() => exportToExcel("ods")} className="bg-amber-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-amber-600 transition-all">
            .ODS İNDİR
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead className="bg-slate-900 text-white border-b-4 border-indigo-600">
            <tr className="text-[10px] font-black uppercase tracking-widest">
              <th className="p-4 w-[15%]">Personel</th>
              {DAYS.map((day, i) => {
                 const d = new Date(weekStart);
                 d.setDate(d.getDate() + i);
                 return (
                   <th key={day} className="p-4 text-center border-l border-white/10 w-[10%]">
                     <span className="block text-xs">{day}</span>
                     <span className="text-[9px] text-indigo-300 font-bold">{d.toLocaleDateString("tr-TR").slice(0,5)}</span>
                   </th>
                 );
              })}
              <th className="p-4 text-center border-l border-white/10 w-[8%] text-emerald-400">Toplam</th>
              <th className="p-4 text-center border-l border-white/10 w-[7%] text-rose-400">Fazla</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roster.map((row, pIdx) => {
              const totalHours = row.shifts.reduce((sum, shift) => sum + calculateHours(shift.value), 0);
              const overtime = totalHours > 45 ? totalHours - 45 : 0;
              const isManager = row.title.toLowerCase().includes("müdür");

              return (
                <tr key={row.personnelId} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <div className="font-black text-slate-800 text-xs uppercase">{row.firstName} {row.lastName}</div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest ${isManager ? 'text-indigo-600' : 'text-slate-400'}`}>{row.title}</div>
                  </td>
                  
                  {row.shifts.map((shift, dIdx) => (
                    <td key={dIdx} className="p-2 text-center border-l border-slate-100 relative group">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="text"
                          value={shift.value}
                          placeholder="10-18"
                          onChange={(e) => updateShift(pIdx, dIdx, e.target.value)}
                          className={`w-16 p-1.5 text-center text-[11px] font-black uppercase outline-none rounded-lg transition-all border
                            ${shift.isFixed ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 focus:border-indigo-400 focus:bg-white bg-slate-50 text-slate-700'}
                            ${shift.value === 'İZİN' ? 'bg-rose-50 border-rose-200 text-rose-600' : ''}
                            ${shift.value === 'FULL' ? 'bg-amber-50 border-amber-200 text-amber-600' : ''}
                          `}
                        />
                        {/* SABİTLEME RAPTİYESİ */}
                        <button 
                          onClick={() => updateShift(pIdx, dIdx, shift.value, true)}
                          title="Bu günü sabitle"
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-xs transition-all ${shift.isFixed ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200'}`}
                        >
                          📌
                        </button>
                      </div>
                    </td>
                  ))}
                  
                  {/* TOPLAM VE FAZLA MESAİ */}
                  <td className="p-3 text-center border-l border-slate-100">
                    <div className="font-black text-emerald-600 text-sm bg-emerald-50 py-1 rounded-lg">{totalHours}s</div>
                  </td>
                  <td className="p-3 text-center border-l border-slate-100">
                    {overtime > 0 ? (
                       <div className="font-black text-white text-xs bg-rose-500 py-1.5 rounded-lg">+{overtime}s</div>
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

      <div className="mt-6 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-4">
          <div className="text-2xl">💡</div>
          <div className="text-xs text-indigo-800 font-medium">
             <span className="font-black">Kullanım İpucu:</span> Önce personellerin İzin günlerini (veya banko full olan günlerini) yazın ve yanındaki <span className="px-1 bg-indigo-600 text-white rounded">📌</span> ikonuna basıp sabitleyin. Ardından <strong>✨ AKILLI DOLDUR</strong> butonuna bastığınızda, izin öncesi sabah, izin sonrası akşam ve haftalık 45 saat kurallarına göre geri kalan günleri sistem kendisi optimize edecektir.
          </div>
      </div>
    </div>
  );
}