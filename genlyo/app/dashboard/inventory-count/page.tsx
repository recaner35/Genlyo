"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";

interface InventoryRow {
  brand: string;
  stok: number;      // Eski 'depo' (ERP'den gelen ana stok)
  teknik: number;    // ERP'den gelen
  oms: number;       // ERP'den gelen
  disVitrin: number; // Elle girilen
  icVitrin: number;  // Elle girilen
  depo: number;      // Elle girilen (Fiziki depo sayımı)
  description: string;
}

// ÇIKTI İÇİN MARKA KISALTMA
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

  useEffect(() => {
    const fetchLastCount = async () => {
      try {
        const res = await fetch('/api/inventory-count');
        if (res.ok) {
          const data = await res.json();
          // Geçmiş verilerde eski 'depo' alanı 'stok' olarak adlandırılmamışsa uyumluluk sağla
          const formattedData = data.map((item: any) => ({
            brand: item.brand || "",
            stok: item.stok ?? item.depo ?? 0,
            teknik: item.teknik || 0,
            oms: item.oms || 0,
            disVitrin: item.disVitrin || 0,
            icVitrin: item.icVitrin || 0,
            depo: item.depo || 0, // Eğer API eskiden depoyu ana stok tutuyorsa, burası fiziksel depoya dönüşecek
            description: item.description || ""
          }));
          setInventory(formattedData);
        }
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLastCount();
  }, []);

  // 🚀 AKILLI YAPIŞTIRMA VE LİSTE GÜNCELLEME MOTORU
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    const lines = pasteData.split("\n").filter(line => line.trim() !== "");
    
    // Sadece YENİ kopyalanan verilerin toplanacağı harita
    const brandMap: Record<string, { stok: number; teknik: number; oms: number }> = {};

    lines.forEach(line => {
      const cols = line.split("\t"); 
      if (cols.length < 5) return;

      const brand = cols[1]?.trim(); 
      const location = cols[3]?.trim().toUpperCase() || ""; 
      const quantity = Math.round(parseFloat(cols[4]?.replace(",", "."))) || 0;

      if (!brand) return;
      if (!brandMap[brand]) brandMap[brand] = { stok: 0, teknik: 0, oms: 0 };

      if (location.includes("OMS")) {
        brandMap[brand].oms += quantity;
      } else if (location.includes("TEKNIK") || location.includes("TEKNİK")) {
        brandMap[brand].teknik += quantity;
      } else {
        brandMap[brand].stok += quantity; // Ana ERP stoğu
      }
    });

    // Yeni listeyi oluştur (Sadece kopyalanan markalar kalır, eskiler silinir, ortakların verisi korunur)
    const newInventory = Object.keys(brandMap).map((brand) => {
      const existing = inventory.find(i => i.brand === brand);
      return {
        brand,
        stok: brandMap[brand].stok,
        teknik: brandMap[brand].teknik,
        oms: brandMap[brand].oms,
        // Eskiden kalan elle girilmiş verileri koru, yoksa sıfırla
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/inventory-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sortedInventory)
      });
      if (res.ok) alert("✅ Sayım verileri ve açıklamalar kaydedildi.");
    } catch (err) { alert("❌ Hata!"); } finally { setIsSaving(false); }
  };

  if (!isManager) return <div className="p-20 text-center font-black text-rose-500">YETKİSİZ ERİŞİM</div>;
  if (loading) return <div className="p-20 text-center animate-pulse font-black">LİSTE HAZIRLANIYOR...</div>;

  return (
    <div className="p-2 md:p-6 bg-slate-50 min-h-screen animate-in fade-in duration-500 print:p-0 print:bg-white print:min-h-0">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic uppercase leading-none">Sayım <span className="text-indigo-600">Defteri</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">ERP Entegreli Akıllı Takip</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95">🖨️ YAZDIR (80mm)</button>
          <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all active:scale-95">
            {isSaving ? "..." : "💾 VERİLERİ SİSTEME KAYDET"}
          </button>
        </div>
      </div>

      <div className="mb-4 print:hidden">
        <textarea 
          onPaste={handlePaste}
          placeholder="ERP Tablosunu buraya yapıştırın (Stok, Teknik, OMS ayrıştırılır. Stoksuzlar otomatik silinir)..."
          className="w-full h-16 p-4 bg-white border-2 border-dashed border-indigo-100 rounded-2xl outline-none focus:border-indigo-400 transition-all text-xs font-bold text-indigo-300 placeholder:text-indigo-200"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-x-auto print:overflow-hidden print:shadow-none print:border-none print:rounded-none">
        <table className="w-full text-left border-collapse table-fixed print:border print:border-black min-w-[800px] print:min-w-0">
          <thead className="bg-slate-900 text-white print:text-black print:bg-white print:border-b-2 print:border-black">
            <tr className="text-[10px] font-black uppercase tracking-widest leading-tight">
              <th className="p-2 print:p-0.5 print:border print:border-black w-[22%] print:w-[26%] text-left">Marka</th>
              
              {/* ERP Verileri */}
              <th className="p-2 print:p-0.5 print:border print:border-black text-center w-[8%] print:w-[10%] text-indigo-300 print:text-black">Stok</th>
              <th className="p-2 print:p-0.5 print:border print:border-black text-center w-[5%] print:w-[6%] text-indigo-300 print:text-black">T</th>
              <th className="p-2 print:p-0.5 print:border print:border-black text-center w-[5%] print:w-[6%] text-indigo-300 print:text-black">O</th>
              
              {/* Fiziki Sayım Verileri */}
              <th className="p-2 print:p-0.5 print:border print:border-black text-center w-[10%] print:w-[12%]">D.Vit</th>
              <th className="p-2 print:p-0.5 print:border print:border-black text-center w-[10%] print:w-[12%]">İ.Vit</th>
              <th className="p-2 print:p-0.5 print:border print:border-black text-center w-[10%] print:w-[12%]">Depo</th>
              
              {/* Eşleşme ve Açıklama */}
              <th className="p-2 print:p-0.5 print:border print:border-black text-center w-[8%] print:w-[10%]">Fark</th>
              <th className="p-2 print:hidden w-[22%]">Açıklama</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-y-0">
            {sortedInventory.map((row, idx) => {
              // 🚀 MATEMATİK: STOK = (Dış + İç + Depo) Eşleşiyor mu?
              const physicalCount = (row.disVitrin || 0) + (row.icVitrin || 0) + (row.depo || 0);
              const diff = row.stok - physicalCount;

              return (
                <tr key={idx} className="hover:bg-slate-50 even:print:bg-slate-100 odd:print:bg-white print:break-inside-avoid">
                  
                  {/* MARKA */}
                  <td className="p-1 print:p-0.5 print:border print:border-black font-black text-slate-800 text-xs print:text-[10px] uppercase truncate">
                    <span className="print:hidden">{row.brand}</span>
                    <span className="hidden print:inline whitespace-nowrap overflow-hidden tracking-tighter">{shortenBrand(row.brand)}</span>
                  </td>
                  
                  {/* ERP STOK */}
                  <td className="p-1 print:p-0.5 print:border print:border-black text-center">
                    <input type="number" value={row.stok || ""} onChange={(e) => updateCell(idx, 'stok', parseInt(e.target.value) || 0)} className="w-full bg-indigo-50 border border-transparent rounded p-1 text-center text-xs font-black text-indigo-700 outline-none focus:border-indigo-400 print:hidden" />
                    <span className="hidden print:block font-black text-[11px]">{row.stok > 0 ? row.stok : ""}</span>
                  </td>

                  {/* ERP TEKNİK (Çok Dar) */}
                  <td className="p-1 print:p-0.5 print:border print:border-black text-center">
                    <input type="number" value={row.teknik || ""} onChange={(e) => updateCell(idx, 'teknik', parseInt(e.target.value) || 0)} className="w-full bg-slate-50 border border-transparent rounded p-1 text-center text-[10px] font-black text-slate-500 outline-none focus:border-slate-300 print:hidden" />
                    <span className="hidden print:block font-black text-[10px] text-slate-600">{row.teknik > 0 ? row.teknik : ""}</span>
                  </td>

                  {/* ERP OMS (Çok Dar) */}
                  <td className="p-1 print:p-0.5 print:border print:border-black text-center">
                    <input type="number" value={row.oms || ""} onChange={(e) => updateCell(idx, 'oms', parseInt(e.target.value) || 0)} className="w-full bg-slate-50 border border-transparent rounded p-1 text-center text-[10px] font-black text-slate-500 outline-none focus:border-slate-300 print:hidden" />
                    <span className="hidden print:block font-black text-[10px] text-slate-600">{row.oms > 0 ? row.oms : ""}</span>
                  </td>

                  {/* FİZİKİ: DIŞ VİTRİN */}
                  <td className="p-1 print:p-0.5 print:border print:border-black text-center">
                    <input type="number" value={row.disVitrin || ""} onChange={(e) => updateCell(idx, 'disVitrin', parseInt(e.target.value) || 0)} className="w-full bg-white border border-slate-200 rounded p-1 text-center text-xs font-black text-slate-700 outline-none focus:border-emerald-400 print:hidden shadow-inner" />
                    <span className="hidden print:block font-black text-[11px]">{row.disVitrin > 0 ? row.disVitrin : ""}</span>
                  </td>

                  {/* FİZİKİ: İÇ VİTRİN */}
                  <td className="p-1 print:p-0.5 print:border print:border-black text-center">
                    <input type="number" value={row.icVitrin || ""} onChange={(e) => updateCell(idx, 'icVitrin', parseInt(e.target.value) || 0)} className="w-full bg-white border border-slate-200 rounded p-1 text-center text-xs font-black text-slate-700 outline-none focus:border-emerald-400 print:hidden shadow-inner" />
                    <span className="hidden print:block font-black text-[11px]">{row.icVitrin > 0 ? row.icVitrin : ""}</span>
                  </td>

                  {/* FİZİKİ: DEPO */}
                  <td className="p-1 print:p-0.5 print:border print:border-black text-center">
                    <input type="number" value={row.depo || ""} onChange={(e) => updateCell(idx, 'depo', parseInt(e.target.value) || 0)} className="w-full bg-white border border-slate-200 rounded p-1 text-center text-xs font-black text-slate-700 outline-none focus:border-emerald-400 print:hidden shadow-inner" />
                    <span className="hidden print:block font-black text-[11px]">{row.depo > 0 ? row.depo : ""}</span>
                  </td>

                  {/* 🚀 FARK (EŞLEŞME DURUMU) */}
                  <td className="p-1 print:p-0.5 print:border print:border-black text-center">
                    <div className="print:hidden">
                       {diff === 0 ? (
                         <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-600 rounded font-black text-[10px]">✔</span>
                       ) : (
                         <span className={`inline-block px-2 py-1 rounded font-black text-[10px] ${diff > 0 ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                           {diff > 0 ? `Eksik: ${diff}` : `Fazla: ${Math.abs(diff)}`}
                         </span>
                       )}
                    </div>
                    {/* Çıktıda sadece rakam basılır (Fark varsa eksi, fazlaysa artı) */}
                    <span className="hidden print:block font-black text-[11px]">{diff !== 0 ? (diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`) : ""}</span>
                  </td>

                  {/* AÇIKLAMA */}
                  <td className="p-1 print:hidden">
                    <input type="text" value={row.description} placeholder="Not..." onChange={(e) => updateCell(idx, 'description', e.target.value)} className="w-full bg-transparent border-b border-slate-200 p-1 text-xs font-bold outline-none italic text-slate-500 focus:border-indigo-400" />
                  </td>
                </tr>
              );
            })}

            {/* TOPLAM SATIRI */}
            {sortedInventory.length > 0 && (
              <tr className="bg-slate-100 print:bg-slate-200 border-t-2 border-slate-900 print:border-t-2 print:border-black">
                <td className="p-2 print:p-0.5 print:border print:border-black font-black text-xs print:text-[10px] uppercase text-right">TOPLAM</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-indigo-700 print:text-black text-xs print:text-[11px]">{columnTotals.stok.toLocaleString('tr-TR')}</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-slate-500 print:text-black text-xs print:text-[10px]">{columnTotals.teknik.toLocaleString('tr-TR')}</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-slate-500 print:text-black text-xs print:text-[10px]">{columnTotals.oms.toLocaleString('tr-TR')}</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-slate-800 print:text-black text-xs print:text-[11px]">{columnTotals.disVitrin.toLocaleString('tr-TR')}</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-slate-800 print:text-black text-xs print:text-[11px]">{columnTotals.icVitrin.toLocaleString('tr-TR')}</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-slate-800 print:text-black text-xs print:text-[11px]">{columnTotals.depo.toLocaleString('tr-TR')}</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-rose-600 print:text-black text-xs print:text-[11px]">
                   {Math.abs(columnTotals.stok - (columnTotals.disVitrin + columnTotals.icVitrin + columnTotals.depo))}
                </td>
                <td className="p-2 print:hidden"></td>
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
            height: max-content !important; min-height: max-content !important; 
            margin: 0 !important; padding: 0 !important; overflow: hidden !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }
          nav, aside, header, .print\:hidden { display: none !important; }
          
          table { width: 80mm !important; border-collapse: collapse !important; table-layout: fixed !important; }
          
          th, td { 
            border: 1px solid #000 !important; padding: 1px !important; 
            line-height: 1.2 !important; vertical-align: middle !important;
            word-wrap: break-word; overflow: hidden;
          }
          
          th:first-child, td:first-child { text-align: left !important; padding-left: 2px !important; }
          tr:nth-child(even) { background-color: #e5e7eb !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
          tr { page-break-inside: avoid !important; }
          * { box-sizing: border-box !important; }
        }
      `}</style>
    </div>
  );
}
