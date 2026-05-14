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

export default function InventoryCountPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "STORE_MANAGER";

  // Sadece MAĞAZA MÜDÜRÜ görebilir
  const isManager = userRole === "STORE_MANAGER" || userRole === "ADMIN";

  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Veritabanından (varsa) son sayımı ve açıklamaları getir
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
    const pasteData = e.clipboardData.getData("text");
    const lines = pasteData.split("\n").filter(line => line.trim() !== "");
    
    // Geçici map: Marka -> {depo, teknik, oms}
    const brandMap: Record<string, { depo: number; teknik: number; oms: number }> = {};

    lines.forEach(line => {
      const cols = line.split("\t"); // Excel/ERP genelde Tab ile ayrılır
      if (cols.length < 5) return;

      const brand = cols[1]?.trim(); // 2. Sütun: Marka
      const location = cols[2]?.trim(); // 3. Sütun: Lokasyon Bağlamı
      const quantity = parseFloat(cols[4]?.replace(",", ".")) || 0; // 5. Sütun: Stok Adedi

      if (!brand) return;

      if (!brandMap[brand]) {
        brandMap[brand] = { depo: 0, teknik: 0, oms: 0 };
      }

      // Bağlam kontrolü
      if (location.includes("OMS")) {
        brandMap[brand].oms += quantity;
      } else if (location.includes("Teknik")) {
        brandMap[brand].teknik += quantity;
      } else {
        // "Mağaza Adı" (Düz) ise Depo sayılır
        brandMap[brand].depo += quantity;
      }
    });

    // Map'i tablo dizisine çevir (Eski açıklamaları koru)
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/inventory-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inventory)
      });
      if (res.ok) alert("✅ Sayım defteri ve açıklamalar kaydedildi.");
    } catch (err) {
      alert("❌ Kayıt hatası.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isManager) return <div className="p-20 text-center font-black text-rose-500">BU SAYFA SADECE MAĞAZA MÜDÜRLERİNE ÖZELDİR.</div>;
  if (loading) return <div className="p-20 text-center animate-pulse font-black">YÜKLENİYOR...</div>;

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-in fade-in duration-500">
      
      {/* BAŞLIK VE KONTROLLER (YAZDIRIRKEN GİZLENİR) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic uppercase">Sayım <span className="text-indigo-600">Defteri</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">ERP Tablosunu Buraya Yapıştırın</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md">
            🖨️ YAZDIR (80mm)
          </button>
          <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all">
            {isSaving ? "KAYDEDİLİYOR..." : "💾 AÇIKLAMALARI KAYDET"}
          </button>
        </div>
      </div>

      {/* YAPIŞTIRMA ALANI (print:hidden) */}
      <div className="mb-6 print:hidden">
        <textarea 
          onPaste={handlePaste}
          placeholder="ERP'den kopyaladığınız tabloyu buraya yapıştırın..."
          className="w-full h-24 p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl outline-none focus:border-indigo-300 transition-all text-xs font-bold text-slate-400"
        />
      </div>

      {/* SAYIM TABLOSU */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 print:bg-white border-b print:border-b-2 print:border-black">
            <tr className="text-[10px] font-black text-slate-500 uppercase print:text-black">
              <th className="p-4 print:p-1">Marka</th>
              <th className="p-4 print:p-1 text-center">Depo</th>
              <th className="p-4 print:p-1 text-center">Teknik</th>
              <th className="p-4 print:p-1 text-center">OMS</th>
              <th className="p-4 print:p-1 print:hidden">Açıklama / Not</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 print:divide-y-0">
            {inventory.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 print:border-b print:border-black/10">
                <td className="p-4 print:p-1 font-black text-slate-900 text-xs print:text-[10px] uppercase">{row.brand}</td>
                <td className="p-4 print:p-1 text-center font-black text-indigo-600 print:text-black text-xs print:text-[10px]">{row.depo}</td>
                <td className="p-4 print:p-1 text-center font-black text-amber-600 print:text-black text-xs print:text-[10px]">{row.teknik}</td>
                <td className="p-4 print:p-1 text-center font-black text-rose-600 print:text-black text-xs print:text-[10px]">{row.oms}</td>
                <td className="p-4 print:p-1 print:hidden">
                  <input 
                    type="text" 
                    value={row.description}
                    placeholder="Not ekle..."
                    onChange={(e) => {
                      const newInv = [...inventory];
                      newInv[idx].description = e.target.value;
                      setInventory(newInv);
                    }}
                    className="w-full bg-slate-50 border border-transparent focus:border-indigo-100 rounded-lg p-2 text-[10px] font-bold outline-none"
                  />
                </td>
              </tr>
            ))}
            {inventory.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-[10px] font-black text-slate-300 uppercase">Veri Yapıştırılmadı</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* TERMAL YAZICI (80mm) CSS AYARLARI */}
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            background: white;
            width: 80mm;
            padding: 2mm;
          }
          nav, aside, header, .print\:hidden {
            display: none !important;
          }
          table {
            width: 100% !important;
          }
          th, td {
            border-bottom: 0.1mm solid #000 !important;
            padding: 1mm 0 !important;
            line-height: 1 !important;
          }
          .bg-slate-50 { background: white !important; }
          .text-indigo-600, .text-amber-600, .text-rose-600 { color: black !important; }
        }
      `}</style>
    </div>
  );
}
