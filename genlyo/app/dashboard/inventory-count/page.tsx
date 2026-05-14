"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";

interface InventoryRow {
  brand: string;
  depo: number;
  teknik: number;
  oms: number;
  description: string;
}

// 🚀 ÇIKTI İÇİN MARKA KISALTMA FONKSİYONU
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
          setInventory(data || []);
        }
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLastCount();
  }, []);

  // 🚀 ERP'DEN YAPIŞTIRILAN TABLOYU İŞLEME MOTORU
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    const lines = pasteData.split("\n").filter(line => line.trim() !== "");
    const brandMap: Record<string, { depo: number; teknik: number; oms: number }> = {};

    lines.forEach(line => {
      const cols = line.split("\t"); 
      if (cols.length < 5) return;

      const brand = cols[1]?.trim(); 
      // 🚀 HATA DÜZELTİLDİ: Lokasyon adı 4. sütunda (index 3)
      const location = cols[3]?.trim().toUpperCase() || ""; 
      const quantity = Math.round(parseFloat(cols[4]?.replace(",", "."))) || 0;

      if (!brand) return;
      if (!brandMap[brand]) brandMap[brand] = { depo: 0, teknik: 0, oms: 0 };

      // 🚀 KESİN AYRIŞTIRMA MANTIĞI
      if (location.includes("OMS")) {
        brandMap[brand].oms += quantity;
      } else if (location.includes("TEKNIK") || location.includes("TEKNİK")) {
        brandMap[brand].teknik += quantity;
      } else {
        brandMap[brand].depo += quantity;
      }
    });

    const newInventory = Object.entries(brandMap).map(([brand, vals]) => {
      const existing = inventory.find(i => i.brand === brand);
      return {
        brand,
        ...vals,
        description: existing ? existing.description : ""
      };
    });

    setInventory(newInventory);
  };

  // 🚀 A'DAN Z'YE SIRALAMA VE TOPLAMLAR
  const sortedInventory = useMemo(() => {
    return [...inventory].sort((a, b) => a.brand.localeCompare(b.brand, 'tr'));
  }, [inventory]);

  const columnTotals = useMemo(() => {
    return sortedInventory.reduce((acc, curr) => ({
      depo: acc.depo + curr.depo,
      teknik: acc.teknik + curr.teknik,
      oms: acc.oms + curr.oms
    }), { depo: 0, teknik: 0, oms: 0 });
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
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-in fade-in duration-500 print:p-0 print:bg-white print:min-h-0">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic uppercase leading-none">Sayım <span className="text-indigo-600">Defteri</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Mağaza Müdürü Özel Paneli</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95">🖨️ YAZDIR (80mm)</button>
          <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all active:scale-95">
            {isSaving ? "..." : "💾 VERİLERİ KAYDET"}
          </button>
        </div>
      </div>

      <div className="mb-6 print:hidden">
        <textarea 
          onPaste={handlePaste}
          placeholder="ERP Tablosunu buraya yapıştırın (Lokasyonlar otomatik ayrıştırılır)..."
          className="w-full h-20 p-4 bg-white border-2 border-dashed border-indigo-100 rounded-2xl outline-none focus:border-indigo-400 transition-all text-xs font-bold text-indigo-300 placeholder:text-indigo-200"
        />
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-xl border border-slate-100 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        {/* ÇIKTI VE EKRAN İÇİN TABLO */}
        <table className="w-full text-left border-collapse table-fixed print:border print:border-black">
          <thead className="bg-slate-900 text-white print:text-black print:bg-white print:border-b-2 print:border-black">
            <tr className="text-[10px] font-black uppercase tracking-widest">
              <th className="p-3 print:p-0.5 print:border print:border-black w-[35%] print:w-[32%] leading-none text-left">Marka</th>
              <th className="p-3 print:p-0.5 print:border print:border-black text-center w-[12%] print:w-[13%] leading-none">Depo</th>
              <th className="p-3 print:p-0.5 print:border print:border-black text-center w-[12%] print:w-[13%] leading-none">Tek</th>
              <th className="p-3 print:p-0.5 print:border print:border-black text-center w-[12%] print:w-[12%] leading-none">OMS</th>
              
              {/* 🚀 SADECE ÇIKTIDA GÖRÜNECEK KALEMLE YAZMA SÜTUNLARI */}
              <th className="hidden print:table-cell print:p-0.5 print:border print:border-black text-center w-[15%] leading-none">Vit.</th>
              <th className="hidden print:table-cell print:p-0.5 print:border print:border-black text-center w-[15%] leading-none">Dep.</th>
              
              {/* SADECE EKRANDA GÖRÜNECEK AÇIKLAMA SÜTUNU */}
              <th className="p-3 print:hidden w-[29%]">Açıklama</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 print:divide-y-0">
            {sortedInventory.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 even:print:bg-slate-100 odd:print:bg-white print:break-inside-avoid">
                
                {/* MARKA (Ekranda tam, çıktıda kısa) */}
                <td className="p-2 print:p-0.5 print:border print:border-black font-black text-slate-800 text-[11px] print:text-[10px] uppercase truncate">
                  <span className="print:hidden">{row.brand}</span>
                  <span className="hidden print:inline whitespace-nowrap overflow-hidden tracking-tighter">{shortenBrand(row.brand)}</span>
                </td>
                
                {/* DEPO */}
                <td className="p-1.5 print:p-0.5 print:border print:border-black text-center">
                  <input type="number" value={row.depo || ""} onChange={(e) => updateCell(idx, 'depo', parseInt(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-center text-xs font-black text-indigo-600 outline-none focus:border-indigo-400 print:hidden" />
                  <span className="hidden print:block font-black text-[11px]">{row.depo > 0 ? row.depo : ""}</span>
                </td>

                {/* TEKNİK */}
                <td className="p-1.5 print:p-0.5 print:border print:border-black text-center">
                  <input type="number" value={row.teknik || ""} onChange={(e) => updateCell(idx, 'teknik', parseInt(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-center text-xs font-black text-amber-600 outline-none focus:border-amber-400 print:hidden" />
                  <span className="hidden print:block font-black text-[11px]">{row.teknik > 0 ? row.teknik : ""}</span>
                </td>

                {/* OMS */}
                <td className="p-1.5 print:p-0.5 print:border print:border-black text-center">
                  <input type="number" value={row.oms || ""} onChange={(e) => updateCell(idx, 'oms', parseInt(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-center text-xs font-black text-rose-600 outline-none focus:border-rose-400 print:hidden" />
                  <span className="hidden print:block font-black text-[11px]">{row.oms > 0 ? row.oms : ""}</span>
                </td>

                {/* 🚀 ÇIKTI İÇİN BOŞ HÜCRELER (Vitrin ve Elle Depo) */}
                <td className="hidden print:table-cell print:border print:border-black"></td>
                <td className="hidden print:table-cell print:border print:border-black"></td>

                {/* AÇIKLAMA (Ekran Modu) */}
                <td className="p-2 print:hidden">
                  <input type="text" value={row.description} placeholder="..." onChange={(e) => updateCell(idx, 'description', e.target.value)} className="w-full bg-transparent border-b border-slate-100 p-1 text-[10px] font-bold outline-none italic text-slate-400 focus:border-indigo-200" />
                </td>
              </tr>
            ))}

            {/* TOPLAM SATIRI */}
            {sortedInventory.length > 0 && (
              <tr className="bg-slate-50 print:bg-slate-200 border-t-2 border-slate-900 print:border-t-2 print:border-black">
                <td className="p-3 print:p-0.5 print:border print:border-black font-black text-[11px] print:text-[10px] uppercase text-right">TOPLAM</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-indigo-600 print:text-black text-[11px] print:text-[10px]">{columnTotals.depo.toLocaleString('tr-TR')}</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-amber-600 print:text-black text-[11px] print:text-[10px]">{columnTotals.teknik.toLocaleString('tr-TR')}</td>
                <td className="p-2 print:p-0.5 print:border print:border-black text-center font-black text-rose-600 print:text-black text-[11px] print:text-[10px]">{columnTotals.oms.toLocaleString('tr-TR')}</td>
                <td className="hidden print:table-cell print:border print:border-black"></td>
                <td className="hidden print:table-cell print:border print:border-black"></td>
                <td className="p-4 print:hidden"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🚀 TERMAL YAZICI (80mm) CSS AYARLARI */}
      <style jsx global>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          html, body { 
            background: white !important; 
            width: 80mm !important; 
            height: max-content !important; 
            min-height: max-content !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            overflow: hidden !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }
          nav, aside, header, .print\:hidden { display: none !important; }
          
          table { 
            width: 80mm !important; 
            border-collapse: collapse !important; 
            table-layout: fixed !important; 
          }
          
          th, td { 
            border: 1px solid #000 !important; /* Hücre çizgileri (Grid) */
            padding: 1px !important; 
            line-height: 1.2 !important;
            vertical-align: middle !important;
          }
          
          /* Marka sola yaslı, diğerleri ortalı */
          th:first-child, td:first-child { text-align: left !important; padding-left: 2px !important; }

          /* Zebra Desen (Yazıcıda okunurluk için) */
          tr:nth-child(even) { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
          
          /* Boş sayfa çıkarmayı önleme */
          tr { page-break-inside: avoid !important; }
          * { box-sizing: border-box !important; }
        }
      `}</style>
    </div>
  );
}
