"use client";

import { useEffect, useState, useMemo } from "react";
import Papa from 'papaparse';
import { useSession } from "next-auth/react";

const MONTHS = [
  { id: 1, name: "Ocak" }, { id: 2, name: "Şubat" }, { id: 3, name: "Mart" },
  { id: 4, name: "Nisan" }, { id: 5, name: "Mayıs" }, { id: 6, name: "Haziran" },
  { id: 7, name: "Temmuz" }, { id: 8, name: "Ağustos" }, { id: 9, name: "Eylül" },
  { id: 10, name: "Ekim" }, { id: 11, name: "Kasım" }, { id: 12, name: "Aralık" }
];

export default function RevenueMatrixPage() {
  const { data: session } = useSession();
  const [stores, setStores] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [entryData, setEntryData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const displayedDays = useMemo(() => {
    const totalDaysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const isFutureYear = selectedYear > today.getFullYear();
    const isFutureMonth = selectedYear === today.getFullYear() && selectedMonth > today.getMonth() + 1;
    const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1;

    if (isFutureYear || isFutureMonth) return 0;
    if (isCurrentMonth) return today.getDate();
    return totalDaysInMonth;
  }, [selectedYear, selectedMonth, today]);

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setIsSaving(true);
        const allData = results.data;
        const chunkSize = 100; 
        let totalProcessed = 0;

        try {
          for (let i = 0; i < allData.length; i += chunkSize) {
            const chunk = allData.slice(i, i + chunkSize);
            
            const res = await fetch('/api/sales/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: chunk })
            });

            if (!res.ok) throw new Error("Paket yüklenirken hata oluştu.");
            
            const resData = await res.json();
            totalProcessed += resData.count;
          }

          alert(`✅ Muazzam! Toplam ${totalProcessed} satır veri başarıyla işlendi ve takvim jilet gibi düzeltildi.`);
          window.location.reload();
        } catch (err) {
          console.error(err);
          alert("❌ İşlem sırasında bir kopukluk oldu. İnternetinizi kontrol edip tekrar deneyin.");
        } finally {
          setIsSaving(false);
        }
      }
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resS, resSales] = await Promise.all([
        fetch('/api/stores'),
        fetch(`/api/sales?year=${selectedYear}&month=${selectedMonth}`)
      ]);
      
      const storesData = await resS.json();
      const salesPayload = await resSales.json();

      const salesArray = Array.isArray(salesPayload?.sales) ? salesPayload.sales : [];
      const allowedStoreId = salesPayload?.allowedStoreId; 

      let finalStores = Array.isArray(storesData) ? storesData : (storesData.store ? [storesData.store] : []);

      if (allowedStoreId) {
          finalStores = finalStores.filter((s: any) => s.id === allowedStoreId);
      }
      setStores(finalStores);

      const matrix: any = {};
      salesArray.forEach((s: any) => {
        const day = new Date(s.date).getUTCDate();
        matrix[`${s.storeId}___${day}`] = s.revenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
      });
      setEntryData(matrix);
    } catch (err) {
      console.error("Fetch Hatası:", err);
    } finally { setLoading(false); }
  };

  const parseERPValue = (val: any) => {
    if (typeof val !== 'string') return val;
    if (!val || val.trim() === "") return null;
    const cleaned = val.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  // ==========================================
  // 🚀 YENİ: EXCEL TARZI HÜCRE İÇİ YAPIŞTIRMA
  // ==========================================
  const handleCellPaste = (e: any, storeId: string, startDay: number) => {
      // Sadece tek bir rakam yapıştırılıyorsa normal davranmasına izin ver
      const pasteData = e.clipboardData.getData('Text');
      const rows = pasteData.split(/\r?\n/).filter((r: string) => r.trim() !== '');

      // Eğer birden fazla satır yapıştırılıyorsa (Excel'den toplu kopyalama) devreye gir
      if (rows.length > 1) {
          e.preventDefault(); // Kutunun içine hepsini tek satırda yazmasını engelle
          
          const newEntryData = { ...entryData };
          let pastedCount = 0;

          rows.forEach((row: string, index: number) => {
              const targetDay = startDay + index; // Tıklanan günden başlayıp aşağı doğru in
              
              // Sadece o ayın geçerli günleri içine yaz (Örn: 35. güne taşmasını engelle)
              if (targetDay <= displayedDays) {
                  const cleanAmount = parseFloat(row.replace(/\./g, '').replace(',', '.'));
                  
                  if (!isNaN(cleanAmount)) {
                      const cellKey = `${storeId}___${targetDay}`;
                      newEntryData[cellKey] = cleanAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
                      pastedCount++;
                  }
              }
          });

          setEntryData(newEntryData);
          if (pastedCount > 0) {
              console.log(`✅ ${pastedCount} günlük ciro başarıyla sütuna yerleştirildi.`);
          }
      }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload: any[] = [];
    
    Object.entries(entryData).forEach(([key, rawValue]) => {
      const parts = key.split('___');
      const storeId = parts[0];
      const day = parts[1];
      
      const cleanRevenue = parseERPValue(rawValue);
      if (cleanRevenue !== null && storeId && day) {
        payload.push({
          storeId,
          year: selectedYear,
          month: selectedMonth,
          day: parseInt(day),
          revenue: cleanRevenue
        });
      }
    });

    if (payload.length === 0) {
      alert("⚠️ Hata: Kaydedilecek geçerli bir veri girişi saptanmadı.");
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok && result.count > 0) {
        alert(`✅ Başarılı! ${result.count} adet ciro verisi işlendi.`);
        fetchData();
      } else if (res.ok && result.count === 0) {
        alert("⚠️ Kritik Hata: Veritabanında eşleşen mağaza bulunamadı.");
      } else {
        alert(`❌ Hata: ${result.error}`);
      }
    } catch (err) {
      alert("❌ Kritik sistem hatası!");
    } finally { setIsSaving(false); }
  };

  const filteredStores = useMemo(() => {
    return stores.filter(s => s.name.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')));
  }, [stores, searchTerm]);

  const currentMonthName = MONTHS.find(m => m.id === selectedMonth)?.name || "";

  if (loading) return <div className="p-20 text-center font-black text-indigo-600 animate-pulse tracking-widest uppercase">Grid Yapılandırılıyor...</div>;

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight italic uppercase">Ciro <span className="text-indigo-600">Matrisi</span></h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sadece gerçekleşen günler listelenir</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {session?.user?.role !== "STORE_MANAGER" && (
            <input 
              type="text" 
              placeholder="Mağaza ara..." 
              className="px-4 py-2 text-xs font-bold border rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-indigo-100"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          )}
          <div className="flex bg-white p-1 rounded-xl border shadow-sm">
            <select className="px-3 py-2 text-xs font-black text-slate-600 outline-none border-r" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="px-3 py-2 text-xs font-black text-slate-600 outline-none" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {MONTHS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            {session?.user?.role === "ADMIN" && (
                <label className="cursor-pointer bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg hover:bg-emerald-700 transition-all uppercase">
                📥 CSV ile Geçmişi Düzelt
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </label>
            )}
          </div>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-xs shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all uppercase"
          >
            {isSaving ? "SENKRONİZE EDİLİYOR..." : "TÜMÜNÜ KAYDET"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-250px)] relative">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky top-0 left-0 z-40 bg-slate-100 p-4 border-b border-r border-slate-200 text-[10px] font-black text-slate-500 uppercase w-32 text-center shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                  Tarih
                </th>
                {filteredStores.map(store => (
                  <th key={store.id} className="sticky top-0 z-30 bg-slate-50 p-3 text-center border-b border-r border-slate-200 text-[10px] font-black text-slate-600 min-w-[140px]">
                    <div className="truncate mx-auto font-bold" title={store.name}>{store.name}</div>
                    {session?.user?.role === "ADMIN" && (
                        <div className="text-[8px] text-indigo-500 font-bold uppercase mt-1 tracking-tighter">{store.region?.name || 'GENEL'}</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: displayedDays }).map((_, i) => {
                const day = i + 1;
                return (
                  <tr key={day} className="group hover:bg-indigo-50/20">
                    <td className="sticky left-0 z-20 bg-white group-hover:bg-indigo-50/40 p-3 border-r border-slate-200 font-black text-slate-800 text-[12px] text-center shadow-[2px_0_5px_rgba(0,0,0,0.03)] transition-colors">
                      {day} {currentMonthName}
                    </td>
                    {filteredStores.map(store => {
                      const cellKey = `${store.id}___${day}`;
                      return (
                        <td key={store.id} className="p-0 border-r border-slate-100 group-hover:border-indigo-100">
                          <input 
                            type="text" 
                            placeholder="-"
                            className="w-full py-4 px-1 bg-transparent text-center font-mono font-bold text-indigo-600 text-[11px] outline-none focus:bg-white focus:ring-1 focus:ring-inset focus:ring-indigo-500 transition-all"
                            value={entryData[cellKey] || ""}
                            onChange={(e) => setEntryData({ ...entryData, [cellKey]: e.target.value })}
                            
                            // 🚀 SİHİR BURADA: Kullanıcı bu kutuya bir şey yapıştırdığında devreye gir
                            onPaste={(e) => handleCellPaste(e, store.id, day)} 
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {displayedDays === 0 && (
            <div className="py-32 text-center bg-slate-50/30">
              <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Bu dönem için ciro girişi henüz açılmamıştır.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}