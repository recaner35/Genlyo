"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

interface InventoryRow {
  brand: string;
  stok: number;      
  teknik: number;    
  oms: number;       
  disVitrin: number; 
  icVitrin: number;  
  depo: number;      
  description: string;
}

const shortenBrand = (brand: string) => {
  const words = brand.trim().split(/\s+/);
  if (words.length === 1) return brand;
  if (words.length === 2) return `${words[0]} ${words[1][0]}.`;
  if (words.length >= 3) return `${words[0]} ${words[1][0]}. ${words[2][0]}.`;
  return brand;
};

export default function InventoryCountPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "STORE_MANAGER";
  const isManager = userRole === "STORE_MANAGER" || userRole === "ADMIN";

  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🚀 EXCEL TİPİ DİKEY YÖNLENDİRME (ENTER İLE ALTA GEÇİŞ) İÇİN REF SİSTEMİ
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const fetchLastCount = async () => {
      try {
        const res = await fetch('/api/inventory-count');
        if (res.ok) {
          const data = await res.json();
          const formattedData = data.map((item: any) => ({
            brand: item.brand || "",
            stok: item.stok || 0,
            teknik: item.teknik || 0,
            oms: item.oms || 0,
            disVitrin: item.disVitrin || 0,
            icVitrin: item.icVitrin || 0,
            depo: item.depo || 0,
            description: item.description || ""
          }));
          setInventory(formattedData);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchLastCount();
  }, []);

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    const lines = pasteData.split("\n").filter(line => line.trim() !== "");
    const brandMap: Record<string, { stok: number; teknik: number; oms: number }> = {};

    lines.forEach(line => {
      const cols = line.split("\t"); 
      if (cols.length < 5) return;
      const brand = cols[1]?.trim(); 
      const location = cols[3]?.trim().toUpperCase() || ""; 
      const quantity = Math.round(parseFloat(cols[4]?.replace(",", "."))) || 0;
      if (!brand) return;
      if (!brandMap[brand]) brandMap[brand] = { stok: 0, teknik: 0, oms: 0 };
      if (location.includes("OMS")) brandMap[brand].oms += quantity;
      else if (location.includes("TEKNIK") || location.includes("TEKNİK")) brandMap[brand].teknik += quantity;
      else brandMap[brand].stok += quantity;
    });

    const newInventory = Object.keys(brandMap).map((brand) => {
      const existing = inventory.find(i => i.brand === brand);
      return {
        brand,
        stok: brandMap[brand].stok,
        teknik: brandMap[brand].teknik,
        oms: brandMap[brand].oms,
        disVitrin: existing ? existing.disVitrin : 0,
        icVitrin: existing ? existing.icVitrin : 0,
        depo: existing ? existing.depo : 0,
        description: existing ? existing.description : ""
      };
    });
    setInventory(newInventory);
  };

  const sortedInventory = useMemo(() => {
    return [...inventory].sort((a, b) => a.brand.localeCompare(b.brand, 'tr'));
  }, [inventory]);

  const columnTotals = useMemo(() => {
    return sortedInventory.reduce((acc, curr) => ({
      stok: acc.stok + curr.stok,
      teknik: acc.teknik + curr.teknik,
      oms: acc.oms + curr.oms,
      disVitrin: acc.disVitrin + curr.disVitrin,
      icVitrin: acc.icVitrin + curr.icVitrin,
      depo: acc.depo + curr.depo
    }), { stok: 0, teknik: 0, oms: 0, disVitrin: 0, icVitrin: 0, depo: 0 });
  }, [sortedInventory]);

  const updateCell = (idx: number, field: keyof InventoryRow, val: any) => {
    const updated = [...sortedInventory];
    updated[idx] = { ...updated[idx], [field]: val };
    setInventory(updated);
  };

  // 🚀 KLAVYE YÖNLENDİRİCİSİ (Aynı Sütunda Alta İner)
  const handleCellKeyDown = (e: React.KeyboardEvent, rowIdx: number, field: string) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Varsayılan Enter hareketini durdur
      const nextRef = cellRefs.current[`${rowIdx + 1}-${field}`]; // Bir alt satırdaki aynı sütunu bul
      if (nextRef) {
        nextRef.focus();
        nextRef.select(); // Değeri seçili hale getir ki üzerine direkt sayı yazılabilsin
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/inventory-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sortedInventory)
      });
      if (res.ok) alert("✅ Sayım verileri kaydedildi.");
    } catch (err) { alert("❌ Hata!"); } finally { setIsSaving(false); }
  };

  if (!isManager) return <div className="p-20 text-center font-black text-rose-500">YETKİSİZ ERİŞİM</div>;
  if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase">Yükleniyor...</div>;

  return (
    <div className="p-2 md:p-6 bg-slate-50 min-h-screen animate-in fade-in duration-500 print:p-0 print:bg-white print:min-h-0">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic uppercase leading-none">Sayım <span className="text-indigo-600">Defteri</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 tracking-tighter">Mağaza Müdürü Kokpiti</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95">🖨️ YAZDIR (80mm)</button>
          <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all active:scale-95">
            {isSaving ? "..." : "💾 VERİLERİ KAYDET"}
          </button>
        </div>
      </div>

      <div className="mb-4 print:hidden">
        <textarea 
          onPaste={handlePaste}
          placeholder="ERP Tablosunu buraya yapıştırın..."
          className="w-full h-16 p-4 bg-white border-2 border-dashed border-indigo-100 rounded-2xl outline-none focus:border-indigo-400 transition-all text-xs font-bold text-indigo-300 placeholder:text-indigo-200"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-x-auto print:overflow-hidden print:shadow-none print:border-none print:rounded-none">
        <table className="w-full text-left border-collapse table-fixed print:border print:border-black min-w-[900px] print:min-w-0">
          <thead className="bg-slate-900 text-white print:text-black print:bg-white print:border-b-2 print:border-black">
            <tr className="text-[10px] font-black uppercase leading-tight">
              <th className="p-2 print:p-0.5 print:border print:border-black w-[20%] print:w-[32%] text-left">Marka</th>
              <th className="p-2 print:p-0.5 print:border print:border-black text-center w-[8%] print:w-[12%]">Stok</th>
              <th className="p-2 print:p-0.5 print:border print:border-black text-center w-[5%] print:w-[8%]">T</th>
              <th className="p-2 print:p-0.5 print:border print:border-black text-center w-[5%] print:w-[8%]">O</th>
              <th className="p-2 print:p-0.5 print:border print:border-black text-center w-[10%] print:w-[12%]">
                <span className="print:hidden">Dış Vitrin</span><span className="hidden print:inline">Dış</span>
              </th>
              <th className="p-2 print:p-0.5 print:border print:border-black text-center w-[10%] print:w-[12%]">
                <span className="print:hidden">İç Vitrin</span><span className="hidden print:inline">İç</span>
              </th>
              <th className="p-2 print:p-0.5 print:border print:border-black text-center w-[10%] print:w-[12%]">Depo</th>
              <th className="p-2 text-center w-[8%] print:hidden">Fark</th>
              <th className="p-2 print:hidden w-[24%]">Açıklama</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-y-0">
            {sortedInventory.map((row, idx) => {
              const physicalCount = (row.disVitrin || 0) + (row.icVitrin || 0) + (row.depo || 0);
              const diff = row.stok - physicalCount;

              return (
                <tr key={idx} className="hover:bg-slate-50 even:print:bg-slate-200 odd:print:bg-white print:break-inside-avoid">
                  {/* MARKA */}
                  <td className="p-1.5 print:p-0.5 print:border print:border-black font-black text-slate-800 text-xs print:text-[10px] print:text-black uppercase truncate">
                    <span className="print:hidden">{row.brand}</span>
                    <span className="hidden print:inline whitespace-nowrap overflow-hidden font-black">{shortenBrand(row.brand)}</span>
                  </td>
                  
                  {/* STOK */}
                  <td className="p-1 print:p-0.5 print:border print:border-black text-center">
                    <input 
                      ref={el => { cellRefs.current[`${idx}-stok`] = el; }}
                      type="number" value={row.stok || ""} 
                      onChange={(e) => updateCell(idx, 'stok', parseInt(e.target.value) || 0)} 
                      onKeyDown={(e) => handleCellKeyDown(e, idx, 'stok')}
                      className="w-full bg-indigo-50 border border-transparent rounded p-1 text-center text-xs font-black text-indigo-700 outline-none focus:border-indigo-400 print:hidden" 
                    />
                    <span className="hidden print:block font-black text-[11px] print:text-black">{row.stok > 0 ? row.stok : ""}</span>
                  </td>

                  {/* TEKNİK */}
                  <td className="p-1 print:p-0.5 print:border print:border-black text-center">
                    <input 
                      ref={el => { cellRefs.current[`${idx}-teknik`] = el; }}
                      type="number" value={row.teknik || ""} 
                      onChange={(e) => updateCell(idx, 'teknik', parseInt(e.target.value) || 0)} 
                      onKeyDown={(e) => handleCellKeyDown(e, idx, 'teknik')}
                      className="w-full bg-slate-50 border border-transparent rounded p-1 text-center text-[10px] font-black text-slate-500 outline-none print:hidden" 
                    />
                    <span className="hidden print:block font-black text-[10px] print:text-black">{row.teknik > 0 ? row.teknik : ""}</span>
                  </td>

                  {/* OMS */}
                  <td className="p-1 print:p-0.5 print:border print:border-black text-center">
                    <input 
                      ref={el => { cellRefs.current[`${idx}-oms`] = el; }}
                      type="number" value={row.oms || ""} 
                      onChange={(e) => updateCell(idx, 'oms', parseInt(e.target.value) || 0)} 
                      onKeyDown={(e) => handleCellKeyDown(e, idx, 'oms')}
                      className="w-full bg-slate-50 border border-transparent rounded p-1 text-center text-[10px] font-black text-slate-500 outline-none print:hidden" 
                    />
                    <span className="hidden print:block font-black text-[10px] print:text-black">{row.oms > 0 ? row.oms : ""}</span>
                  </td>

                  {/* DIŞ VİTRİN */}
                  <td className="p-1 print:p-0.5 print:border print:border-black text-center">
                    <input 
                      ref={el => { cellRefs.current[`${idx}-disVitrin`] = el; }}
                      type="number" value={row.disVitrin || ""} 
                      onChange={(e) => updateCell(idx, 'disVitrin', parseInt(e.target.value) || 0)} 
                      onKeyDown={(e) => handleCellKeyDown(e, idx, 'disVitrin')}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-center text-xs font-black text-slate-700 outline-none focus:border-emerald-400 print:hidden shadow-inner" 
                    />
                    <span className="hidden print:block font-black text-[11px] print:text-black">{row.disVitrin > 0 ? row.disVitrin : ""}</span>
                  </td>

                  {/* İÇ VİTRİN */}
                  <td className="p-1 print:p-0.5 print:border print:border-black text-center">
                    <input 
                      ref={el => { cellRefs.current[`${idx}-icVitrin`] = el; }}
                      type="number" value={row.icVitrin || ""} 
                      onChange={(e) => updateCell(idx, 'icVitrin', parseInt(e.target.value) || 0)} 
                      onKeyDown={(e) => handleCellKeyDown(e, idx, 'icVitrin')}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-center text-xs font-black text-slate-700 outline-none focus:border-emerald-400 print:hidden shadow-inner" 
                    />
                    <span className="hidden print:block font-black text-[11px] print:text-black">{row.icVitrin > 0 ? row.icVitrin : ""}</span>
                  </td>

                  {/* DEPO */}
                  <td className="p-1 print:p-0.5 print:border print:border-black text-center">
                    <input 
                      ref={el => { cellRefs.current[`${idx}-depo`] = el; }}
                      type="number" value={row.depo || ""} 
                      onChange={(e) => updateCell(idx, 'depo', parseInt(e.target.value) || 0)} 
                      onKeyDown={(e) => handleCellKeyDown(e, idx, 'depo')}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-center text-xs font-black text-slate-700 outline-none focus:border-emerald-400 print:hidden shadow-inner" 
                    />
                    <span className="hidden print:block font-black text-[11px] print:text-black">{row.depo > 0 ? row.depo : ""}</span>
                  </td>

                  {/* FARK */}
                  <td className="p-1 text-center print:hidden">
                    {diff === 0 ? (
                      <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-600 rounded font-black text-[10px]">✔</span>
                    ) : (
                      <span className={`inline-block px-2 py-1 rounded font-black text-[10px] ${diff > 0 ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                        {diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`}
                      </span>
                    )}
                  </td>

                  {/* AÇIKLAMA */}
                  <td className="p-1 print:hidden">
                    <input 
                      ref={el => { cellRefs.current[`${idx}-description`] = el; }}
                      type="text" value={row.description} placeholder="Not..." 
                      onChange={(e) => updateCell(idx, 'description', e.target.value)} 
                      onKeyDown={(e) => handleCellKeyDown(e, idx, 'description')}
                      className="w-full bg-transparent border-b border-slate-200 p-1 text-[10px] font-bold outline-none italic text-slate-500 focus:border-indigo-400" 
                    />
                  </td>
                </tr>
              );
            })}
            {/* TOPLAM SATIRI */}
            {sortedInventory.length > 0 && (
              <tr className="bg-slate-100 print:bg-slate-300 border-t-2 border-slate-900 print:border-t-2 print:border-black">
                <td className="p-2 print:p-0.5 print:border print:border-black font-black text-xs print:text-[10px] print:text-black uppercase text-right">TOPLAM</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-indigo-700 print:text-black text-xs print:text-[11px]">{columnTotals.stok.toLocaleString('tr-TR')}</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-slate-500 print:text-black text-xs print:text-[10px]">{columnTotals.teknik.toLocaleString('tr-TR')}</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-slate-500 print:text-black text-xs print:text-[10px]">{columnTotals.oms.toLocaleString('tr-TR')}</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-slate-800 print:text-black text-xs print:text-[11px]">{columnTotals.disVitrin.toLocaleString('tr-TR')}</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-slate-800 print:text-black text-xs print:text-[11px]">{columnTotals.icVitrin.toLocaleString('tr-TR')}</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-slate-800 print:text-black text-xs print:text-[11px]">{columnTotals.depo.toLocaleString('tr-TR')}</td>
                <td className="print:hidden"></td>
                <td className="print:hidden"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          html, body { 
            background: white !important; width: 80mm !important; 
            margin: 0 !important; padding: 0 !important; overflow: hidden !important;
            font-family: Arial, sans-serif !important;
            -webkit-print-color-adjust: exact;
          }
          nav, aside, header, .print\:hidden { display: none !important; }
          table { width: 80mm !important; border-collapse: collapse !important; table-layout: fixed !important; }
          th, td { 
            border: 1px solid #000 !important; padding: 1.5px !important; 
            line-height: 1.2 !important; vertical-align: middle !important;
            color: black !important;
          }
          th { font-weight: 900 !important; }
          td { font-weight: 900 !important; }
          tr:nth-child(even) { background-color: #f1f1f1 !important; }
          tr { page-break-inside: avoid !important; }
        }
      `}</style>
    </div>
  );
}
