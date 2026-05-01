"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const CATEGORIES = ["A+", "A", "B", "C", "D", "E"];
const TITLES = ["Satış Danışmanı", "Uzman", "Usta", "Mağaza Müdürü"];

export default function BonusRulesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState<"REVENUE" | "PRODUCT" | "PENALTY" | "MILESTONE" | "SALARY">("REVENUE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // ==========================================
  // 💾 STATE (EXCEL TABLO VERİLERİ)
  // ==========================================
  const [thresholds, setThresholds] = useState<number[]>([]);
  const [revMatrix, setRevMatrix] = useState<any>({});
  
  const [products, setProducts] = useState<any[]>([]);
  const [penalties, setPenalties] = useState<any[]>([]);
  
  const [mileThresholds, setMileThresholds] = useState<number[]>([]);
  const [mileMatrix, setMileMatrix] = useState<any>({}); 
  const MILESTONE_TYPES = [
      { id: 'PERSONNEL', label: 'Satış Personelleri İlave Teşvik Tablosu' },
      { id: 'MANAGER', label: 'Mağaza Müdürleri İlave Teşvik Tablosu' }
  ];

  // 🚀 YENİ: MAAŞ VE YOL ÜCRETİ STATE'İ
  const [salaries, setSalaries] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bonus-rules', { cache: 'no-store' });
      if (res.ok) {
        const result = await res.json();
        
        // --- 1. Ciro Primleri ---
        const rules = result.revenueRules || [];
        let fetchedThresholds = Array.from(new Set(rules.map((r: any) => r.minTargetHitRate))).sort((a: any, b: any) => a - b) as number[];
        if (fetchedThresholds.length === 0) fetchedThresholds = [85, 90, 95, 100, 105, 110, 115, 120];
        setThresholds(fetchedThresholds);

        const newRevMatrix: any = {};
        TITLES.forEach(t => {
            newRevMatrix[t] = {};
            CATEGORIES.forEach(c => {
                newRevMatrix[t][c] = {};
                fetchedThresholds.forEach(th => {
                    const rule = rules.find((r: any) => r.titleName === t && r.storeCategory === c && r.minTargetHitRate === th);
                    newRevMatrix[t][c][th] = rule ? rule.multiplier : "";
                });
            });
        });
        setRevMatrix(newRevMatrix);
        
        // --- 2. Marka ve Cezalar ---
        setProducts(result.productRules?.length > 0 ? result.productRules : [{ name: "", isBrand: true, calcType: "PERCENTAGE", value: 0, isConditional: false }]);
        setPenalties(result.penaltyRules?.length > 0 ? result.penaltyRules : [{ modelName: "", penaltyPercent: 0, rewardAmount: 0, isActive: true }]);
        
        // --- 3. İlave Teşvikler (Kilometre Taşları Matrisi) ---
        const mRules = result.milestoneRules || [];
        let fetchedMileThresh = Array.from(new Set(mRules.map((r: any) => r.minTargetHitRate))).sort((a: any, b: any) => a - b) as number[];
        if (fetchedMileThresh.length === 0) fetchedMileThresh = [105, 110, 115, 120];
        setMileThresholds(fetchedMileThresh);

        const newMileMatrix: any = { 'PERSONNEL': {}, 'MANAGER': {} };
        ['PERSONNEL', 'MANAGER'].forEach(type => {
            CATEGORIES.forEach(c => {
                newMileMatrix[type][c] = {};
                fetchedMileThresh.forEach(th => {
                    const rule = mRules.find((r: any) => r.storeCategory === c && r.minTargetHitRate === th && r.isForManager === (type === 'MANAGER'));
                    newMileMatrix[type][c][th] = rule ? rule.rewardAmount : "";
                });
            });
        });
        setMileMatrix(newMileMatrix);

        // --- 4. Maaş ve Yol Ücretleri (YENİ) ---
        // Veritabanındaki verileri unvan listemizle eşleştirip tabloyu akıllıca hazırlıyoruz
        const initialSalaries = TITLES.map(t => {
            const existing = result.titleRewards?.find((r: any) => r.titleName === t);
            return {
                titleName: t,
                baseSalary: existing ? existing.baseSalary : 0,
                travelAllowance: existing ? existing.travelAllowance : 0
            };
        });
        setSalaries(initialSalaries);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // ==========================================
  // 🚀 DİNAMİK SÜTUN (KOLON) YÖNETİMİ
  // ==========================================
  const addThresholdColumn = () => {
      const maxVal = thresholds.length > 0 ? Math.max(...thresholds) : 120;
      setThresholds([...thresholds, maxVal + 5]);
  };
  const removeThresholdColumn = (idxToRemove: number) => {
      if (confirm("Bu sütunu (barajı) ve içindeki tüm verileri silmek istediğinize emin misiniz?")) {
          setThresholds(thresholds.filter((_, i) => i !== idxToRemove));
      }
  };
  const updateThresholdHeader = (idx: number, newThresh: number) => {
      if (isNaN(newThresh)) return;
      const oldThresh = thresholds[idx];
      const newThresholds = [...thresholds];
      newThresholds[idx] = newThresh;
      setThresholds(newThresholds);

      const newMatrix = { ...revMatrix };
      TITLES.forEach(t => {
          CATEGORIES.forEach(c => {
              if (newMatrix[t]?.[c]?.[oldThresh] !== undefined) {
                  const val = newMatrix[t][c][oldThresh];
                  delete newMatrix[t][c][oldThresh];
                  newMatrix[t][c][newThresh] = val;
              }
          });
      });
      setRevMatrix(newMatrix);
  };

  const addMileThresholdColumn = () => {
      const maxVal = mileThresholds.length > 0 ? Math.max(...mileThresholds) : 120;
      setMileThresholds([...mileThresholds, maxVal + 5]);
  };
  const removeMileThresholdColumn = (idx: number) => {
      if (confirm("Bu barajı silmek istediğinize emin misiniz?")) setMileThresholds(mileThresholds.filter((_, i) => i !== idx));
  };
  const updateMileThresholdHeader = (idx: number, newThresh: number) => {
      if (isNaN(newThresh)) return;
      const old = mileThresholds[idx];
      const arr = [...mileThresholds];
      arr[idx] = newThresh;
      setMileThresholds(arr);

      const mat = { ...mileMatrix };
      ['PERSONNEL', 'MANAGER'].forEach(t => { 
          CATEGORIES.forEach(c => { 
              if (mat[t]?.[c]?.[old] !== undefined) { 
                  mat[t][c][newThresh] = mat[t][c][old]; 
                  delete mat[t][c][old]; 
              } 
          }); 
      });
      setMileMatrix(mat);
  };

  // ==========================================
  // 🚀 YAPIŞTIRMA VE HÜCRE GÜNCELLEME MOTORLARI
  // ==========================================
  const handleRevenuePaste = (e: any, title: string, startCatIdx: number, startThreshIdx: number) => {
    e.preventDefault();
    const pasteText = e.clipboardData.getData('Text');
    const rows = pasteText.split(/\r?\n/).filter((r: string) => r.trim() !== '');
    const newData = JSON.parse(JSON.stringify(revMatrix));
    rows.forEach((row: string, rOffset: number) => {
        const cells = row.split('\t');
        const cat = CATEGORIES[startCatIdx + rOffset];
        if (!cat) return; 
        cells.forEach((cell: string, cOffset: number) => {
            const thresh = thresholds[startThreshIdx + cOffset];
            if (!thresh) return; 
            const val = parseFloat(cell.replace(',', '.')); 
            if (!isNaN(val)) {
                if (!newData[title]) newData[title] = {};
                if (!newData[title][cat]) newData[title][cat] = {};
                newData[title][cat][thresh] = val;
            }
        });
    });
    setRevMatrix(newData);
  };
  const updateRevCell = (title: string, cat: string, thresh: number, val: string) => {
    const newData = { ...revMatrix };
    if(!newData[title]) newData[title] = {};
    if(!newData[title][cat]) newData[title][cat] = {};
    newData[title][cat][thresh] = val;
    setRevMatrix(newData);
  };

  const handleMilestonePaste = (e: any, typeId: string, startCatIdx: number, startThreshIdx: number) => {
    e.preventDefault();
    const rows = e.clipboardData.getData('Text').split(/\r?\n/).filter((r: string) => r.trim() !== '');
    const newData = JSON.parse(JSON.stringify(mileMatrix));
    rows.forEach((row: string, rOffset: number) => {
        const cat = CATEGORIES[startCatIdx + rOffset];
        if (!cat) return; 
        row.split('\t').forEach((cell: string, cOffset: number) => {
            const thresh = mileThresholds[startThreshIdx + cOffset];
            if (!thresh) return; 
            const val = parseFloat(cell.replace(',', '.')); 
            if (!isNaN(val)) {
                if (!newData[typeId]) newData[typeId] = {};
                if (!newData[typeId][cat]) newData[typeId][cat] = {};
                newData[typeId][cat][thresh] = val;
            }
        });
    });
    setMileMatrix(newData);
  };
  const updateMileCell = (typeId: string, cat: string, thresh: number, val: string) => {
    const newData = { ...mileMatrix };
    if(!newData[typeId]) newData[typeId] = {};
    if(!newData[typeId][cat]) newData[typeId][cat] = {};
    newData[typeId][cat][thresh] = val;
    setMileMatrix(newData);
  };

  const handleProductPaste = (e: any, startRowIdx: number) => {
    e.preventDefault();
    const rows = e.clipboardData.getData('Text').split(/\r?\n/).filter((r: string) => r.trim() !== '');
    const newProducts = [...products];
    rows.forEach((rowStr: string, rOffset: number) => {
        const cells = rowStr.split('\t');
        const targetIdx = startRowIdx + rOffset;
        if (!newProducts[targetIdx]) newProducts.push({ name: "", isBrand: true, calcType: "PERCENTAGE", value: 0, isConditional: false });
        if (cells[0] !== undefined && cells[0].trim() !== '') newProducts[targetIdx].name = cells[0].trim();
        if (cells[1] !== undefined) { const t = cells[1].toLowerCase(); newProducts[targetIdx].isBrand = !(t.includes('özel') || t.includes('special')); }
        if (cells[2] !== undefined) { const t = cells[2].toLowerCase(); newProducts[targetIdx].calcType = (t.includes('sabit') || t.includes('fixed') || t.includes('tl')) ? 'FIXED' : 'PERCENTAGE'; }
        if (cells[3] !== undefined) { const val = parseFloat(cells[3].replace(',', '.')); if (!isNaN(val)) newProducts[targetIdx].value = val; }
        if (cells[4] !== undefined) { const t = cells[4].toLowerCase(); newProducts[targetIdx].isConditional = t.includes('evet') || t.includes('var') || t.includes('true') || t.includes('şartlı'); }
    });
    setProducts(newProducts);
  };

  const handlePenaltyPaste = (e: any, startRowIdx: number) => {
    e.preventDefault();
    const rows = e.clipboardData.getData('Text').split(/\r?\n/).filter((r: string) => r.trim() !== '');
    const newPenalties = [...penalties];
    rows.forEach((rowStr: string, rOffset: number) => {
        const cells = rowStr.split('\t');
        const targetIdx = startRowIdx + rOffset;
        if (!newPenalties[targetIdx]) newPenalties.push({ modelName: "", penaltyPercent: 0, rewardAmount: 0, isActive: true });
        if (cells[0] !== undefined && cells[0].trim() !== '') newPenalties[targetIdx].modelName = cells[0].trim();
        if (cells[1] !== undefined) { const val = parseFloat(cells[1].replace(',', '.')); if (!isNaN(val)) newPenalties[targetIdx].penaltyPercent = val; }
        if (cells[2] !== undefined) { const val = parseFloat(cells[2].replace(',', '.')); if (!isNaN(val)) newPenalties[targetIdx].rewardAmount = val; }
    });
    setPenalties(newPenalties);
  };

  // 🚀 YENİ: MAAŞ BİLGİSİNİ GÜNCELLEME
  const updateSalary = (idx: number, field: string, val: any) => {
    const newSalaries = [...salaries];
    newSalaries[idx][field] = isNaN(val) ? 0 : val;
    setSalaries(newSalaries);
  };

  // ==========================================
  // 💾 TOPLU KAYIT İŞLEMLERİ
  // ==========================================
  const saveRevenueRules = async () => {
    const payload: any[] = [];
    TITLES.forEach(t => {
        CATEGORIES.forEach(c => {
            thresholds.forEach(th => {
                const val = parseFloat(revMatrix[t]?.[c]?.[th]);
                if (!isNaN(val) && val > 0) payload.push({ titleName: t, storeCategory: c, minTargetHitRate: th, multiplier: val });
            });
        });
    });
    await submitBulk('REVENUE', payload);
  };

  const saveMilestoneRules = async () => {
    const payload: any[] = [];
    ['PERSONNEL', 'MANAGER'].forEach(type => {
        CATEGORIES.forEach(c => {
            mileThresholds.forEach(th => {
                const val = parseFloat(mileMatrix[type]?.[c]?.[th]);
                if (!isNaN(val) && val > 0) payload.push({ storeCategory: c, minTargetHitRate: th, isForManager: type === 'MANAGER', rewardAmount: val });
            });
        });
    });
    await submitBulk('MILESTONE', payload);
  };

  // 🚀 YENİ: MAAŞLARI KAYDETME FONKSİYONU
  const saveSalaries = async () => {
    await submitBulk('SALARY', salaries);
  };

  const submitBulk = async (ruleType: string, payload: any[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/bonus-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleType, isBulk: true, data: payload })
      });
      if (res.ok) {
         alert("✅ Tablo başarıyla senkronize edildi!");
         fetchData();
      } else {
         const r = await res.json();
         alert(`Hata: ${r.error}`);
      }
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const addProductRow = () => setProducts([...products, { name: "", isBrand: true, calcType: "PERCENTAGE", value: 0, isConditional: false }]);
  const updateProduct = (idx: number, field: string, val: any) => { const n = [...products]; n[idx][field] = val; setProducts(n); };
  const removeProductRow = (idx: number) => setProducts(products.filter((_, i) => i !== idx));

  const addPenaltyRow = () => setPenalties([...penalties, { modelName: "", penaltyPercent: 0, rewardAmount: 0, isActive: true }]);
  const updatePenalty = (idx: number, field: string, val: any) => { const n = [...penalties]; n[idx][field] = val; setPenalties(n); };
  const removePenaltyRow = (idx: number) => setPenalties(penalties.filter((_, i) => i !== idx));

  if (!isAdmin) return <div className="flex h-screen items-center justify-center font-black text-2xl text-slate-400">Yetkisiz Erişim</div>;

  return (
    <div className="p-6 md:p-10 bg-slate-50/50 min-h-screen font-sans">
      
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight italic">Prim & Teşvik <span className="text-indigo-600">Matrisi</span></h1>
          <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">Excel Uyumlu Toplu Veri Giriş Terminali</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-8 scrollbar-none">
        {[
            { id: "REVENUE", icon: "📊", label: "A. Ciro Primleri" },
            { id: "PRODUCT", icon: "🏷️", label: "B. Marka & Özel Ürün" },
            { id: "PENALTY", icon: "⚠️", label: "C. Zorunlu Satış" },
            { id: "MILESTONE", icon: "🚀", label: "D. İlave Teşvikler" },
            { id: "SALARY", icon: "💰", label: "E. Maaş & Yol" } // YENİ SEKME BUTONU
        ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                <span>{tab.icon}</span> {tab.label}
            </button>
        ))}
      </div>

      {loading ? (
        <div className="py-32 flex justify-center"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* TAB 1: CİRO PRİMLERİ (Önceki kodların aynısı...) */}
          {activeTab === "REVENUE" && (
             <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100 gap-4">
                   <p className="text-xs font-bold text-indigo-800 flex-1">💡 <strong>İpucu:</strong> Sütun başlıklarındaki (%) oranlarını değiştirebilir, sağdan yeni hedef barajı ekleyebilir veya Excel'den veriyi CTRL+V ile yapıştırabilirsiniz.</p>
                   <div className="flex gap-2">
                      <button onClick={addThresholdColumn} className="bg-white border border-indigo-200 text-indigo-700 px-6 py-3 rounded-xl font-black shadow-sm hover:border-indigo-500 transition-all">+ Baraj Ekle</button>
                      <button onClick={saveRevenueRules} disabled={saving} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all">{saving ? "KAYDEDİLİYOR..." : "TÜMÜNÜ KAYDET"}</button>
                   </div>
                </div>

                {TITLES.map(title => (
                   <div key={title} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-slate-800 text-white p-4 px-6 border-b border-slate-700"><h3 className="font-black tracking-widest uppercase">{title} Çarpan Tablosu</h3></div>
                      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 pb-2">
                         <table className="w-full text-center whitespace-nowrap">
                            <thead className="bg-slate-50">
                               <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                                  <th className="p-4 border-r border-slate-200 w-32 bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Kategori \ Hedef</th>
                                  {thresholds.map((th, idx) => (
                                      <th key={idx} className="p-2 border-r border-slate-100 relative group">
                                          <div className="flex items-center justify-center gap-1">
                                             <span className="text-slate-400 font-black">%</span>
                                             <input type="number" value={th} onChange={(e) => updateThresholdHeader(idx, parseFloat(e.target.value))} className="w-14 bg-transparent text-center outline-none font-black text-slate-800 text-sm border-b border-transparent focus:border-indigo-500"/>
                                          </div>
                                          <button onClick={() => removeThresholdColumn(idx)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity" title="Barajı Sil">
                                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                          </button>
                                      </th>
                                  ))}
                               </tr>
                            </thead>
                            <tbody>
                               {CATEGORIES.map((cat, rIdx) => (
                                  <tr key={cat} className="border-b border-slate-50 hover:bg-slate-50/50">
                                     <td className="p-3 border-r border-slate-200 font-black text-indigo-700 bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{cat} Sınıfı</td>
                                     {thresholds.map((th, cIdx) => (
                                        <td key={cIdx} className="p-1 border-r border-slate-100">
                                           <input type="text" className="w-full h-full p-3 text-center text-sm font-bold text-emerald-700 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 focus:bg-indigo-50/30 transition-all" placeholder="0.000" value={revMatrix[title]?.[cat]?.[th] || ""} onChange={(e) => updateRevCell(title, cat, th, e.target.value)} onPaste={(e) => handleRevenuePaste(e, title, rIdx, cIdx)}/>
                                        </td>
                                     ))}
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   </div>
                ))}
             </div>
          )}

          {/* TAB 2: MARKA VE ÖZEL ÜRÜN */}
          {activeTab === "PRODUCT" && (
             <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100 gap-4">
                   <div className="flex-1"><p className="text-xs font-bold text-indigo-800 mb-1">💡 <strong>Excel İpucu:</strong> Sütun sırası: [Marka Adı] - [Genel Marka / Özel Model] - [Yüzde / Sabit] - [Değer] - [Evet / Hayır]</p></div>
                   <div className="flex gap-2">
                      <button onClick={addProductRow} className="bg-white border border-indigo-200 text-indigo-700 px-6 py-3 rounded-xl font-black shadow-sm hover:border-indigo-500 transition-all">+ Satır Ekle</button>
                      <button onClick={() => submitBulk('PRODUCT', products)} disabled={saving} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all">{saving ? "KAYDEDİLİYOR..." : "TÜMÜNÜ KAYDET"}</button>
                   </div>
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left whitespace-nowrap">
                         <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <tr><th className="p-4 pl-6">Marka / Ürün Adı</th><th className="p-4">Tip</th><th className="p-4">Kazanç Tipi</th><th className="p-4">Değer</th><th className="p-4 text-center">Şartlı mı? (%95 Barajı)</th><th className="p-4 pr-6 text-right">Sil</th></tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {products.map((row, idx) => (
                               <tr key={idx} className="hover:bg-slate-50/50 group">
                                  <td className="p-2 pl-6"><input type="text" value={row.name} onChange={e => updateProduct(idx, 'name', e.target.value)} onPaste={(e) => handleProductPaste(e, idx)} className="w-full p-3 rounded-lg border-transparent focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-slate-800" placeholder="Excel'den Yapıştır (CTRL+V)" /></td>
                                  <td className="p-2">
                                     <select value={row.isBrand ? "BRAND" : "SPECIAL"} onChange={e => updateProduct(idx, 'isBrand', e.target.value === "BRAND")} className="p-3 rounded-lg border-transparent focus:border-indigo-500 focus:ring-2 outline-none font-bold text-slate-600">
                                        <option value="BRAND">Genel Marka</option><option value="SPECIAL">Özel Model</option>
                                     </select>
                                  </td>
                                  <td className="p-2">
                                     <select value={row.calcType} onChange={e => updateProduct(idx, 'calcType', e.target.value)} className="p-3 rounded-lg border-transparent focus:border-indigo-500 focus:ring-2 outline-none font-bold text-slate-600">
                                        <option value="PERCENTAGE">Cirodan Yüzde (%)</option><option value="FIXED">Sabit Tutar (TL)</option>
                                     </select>
                                  </td>
                                  <td className="p-2"><input type="number" step="0.1" value={row.value} onChange={e => updateProduct(idx, 'value', parseFloat(e.target.value))} className="w-32 p-3 rounded-lg border-transparent focus:border-indigo-500 focus:ring-2 outline-none font-bold text-emerald-600" /></td>
                                  <td className="p-2 text-center"><input type="checkbox" checked={row.isConditional} onChange={e => updateProduct(idx, 'isConditional', e.target.checked)} className="w-5 h-5 rounded text-indigo-600 cursor-pointer" /></td>
                                  <td className="p-2 pr-6 text-right"><button onClick={() => removeProductRow(idx)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors">🗑️</button></td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
          )}

          {/* TAB 3: CEZA VE ZORUNLU SATIŞ */}
          {activeTab === "PENALTY" && (
             <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-amber-50 p-4 rounded-2xl border border-amber-100 gap-4">
                   <div className="flex-1"><p className="text-xs font-bold text-amber-800 mb-1">💡 <strong>Excel İpucu:</strong> Sütun sırası: [Zorunlu Model Adı] - [Kesinti Oranı (%)] - [Satış Ödülü (TL)]</p></div>
                   <div className="flex gap-2">
                      <button onClick={addPenaltyRow} className="bg-white border border-amber-200 text-amber-700 px-6 py-3 rounded-xl font-black shadow-sm hover:border-amber-500 transition-all">+ Satır Ekle</button>
                      <button onClick={() => submitBulk('PENALTY', penalties)} disabled={saving} className="bg-amber-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-amber-700 transition-all">{saving ? "KAYDEDİLİYOR..." : "TÜMÜNÜ KAYDET"}</button>
                   </div>
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left whitespace-nowrap">
                         <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <tr><th className="p-4 pl-6">Zorunlu Model Adı</th><th className="p-4">Kesinti Oranı (%)</th><th className="p-4">Kazanım / Prim (TL)</th><th className="p-4 pr-6 text-right">Sil</th></tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {penalties.map((row, idx) => (
                               <tr key={idx} className="hover:bg-amber-50/20 group">
                                  <td className="p-2 pl-6"><input type="text" value={row.modelName} onChange={e => updatePenalty(idx, 'modelName', e.target.value)} onPaste={(e) => handlePenaltyPaste(e, idx)} className="w-full max-w-md p-3 rounded-lg border-transparent focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none font-bold text-slate-800" placeholder="Excel'den Yapıştır (CTRL+V)" /></td>
                                  <td className="p-2"><div className="flex items-center gap-1"><span className="font-black text-red-500">- %</span><input type="number" step="0.1" value={row.penaltyPercent} onChange={e => updatePenalty(idx, 'penaltyPercent', parseFloat(e.target.value))} className="w-24 p-3 rounded-lg border-transparent focus:border-red-500 focus:ring-2 outline-none font-bold text-red-600" /></div></td>
                                  <td className="p-2"><div className="flex items-center gap-1"><span className="font-black text-emerald-500">+</span><input type="number" step="10" value={row.rewardAmount} onChange={e => updatePenalty(idx, 'rewardAmount', parseFloat(e.target.value))} className="w-32 p-3 rounded-lg border-transparent focus:border-emerald-500 focus:ring-2 outline-none font-bold text-emerald-600" placeholder="0" /><span className="font-bold text-slate-400 text-sm">TL</span></div></td>
                                  <td className="p-2 pr-6 text-right"><button onClick={() => removePenaltyRow(idx)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors">🗑️</button></td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
          )}

          {/* TAB 4: İLAVE TEŞVİKLER (KİLOMETRE TAŞLARI MATRİSİ) */}
          {activeTab === "MILESTONE" && (
             <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-100 gap-4">
                   <p className="text-xs font-bold text-emerald-800 flex-1">💡 <strong>İpucu:</strong> Sütun başlıklarındaki (%) oranlarını değiştirebilir, sağdan yeni hedef barajı ekleyebilir veya Excel'den sabit prim tutarlarını (TL) yapıştırabilirsiniz.</p>
                   <div className="flex gap-2">
                      <button onClick={addMileThresholdColumn} className="bg-white border border-emerald-200 text-emerald-700 px-6 py-3 rounded-xl font-black shadow-sm hover:border-emerald-500 transition-all">+ Baraj Ekle</button>
                      <button onClick={saveMilestoneRules} disabled={saving} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-emerald-700 transition-all">{saving ? "KAYDEDİLİYOR..." : "TÜMÜNÜ KAYDET"}</button>
                   </div>
                </div>
                {MILESTONE_TYPES.map(type => (
                   <div key={type.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-emerald-800 text-white p-4 px-6 border-b border-emerald-700"><h3 className="font-black tracking-widest uppercase">{type.label}</h3></div>
                      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 pb-2">
                         <table className="w-full text-center whitespace-nowrap">
                            <thead className="bg-slate-50">
                               <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                                  <th className="p-4 border-r border-slate-200 w-32 bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Kategori \ Hedef</th>
                                  {mileThresholds.map((th, idx) => (
                                      <th key={idx} className="p-2 border-r border-slate-100 relative group">
                                          <div className="flex items-center justify-center gap-1"><span className="text-slate-400 font-black">%</span><input type="number" value={th} onChange={(e) => updateMileThresholdHeader(idx, parseFloat(e.target.value))} className="w-14 bg-transparent text-center outline-none font-black text-slate-800 text-sm border-b border-transparent focus:border-emerald-500" /></div>
                                          <button onClick={() => removeMileThresholdColumn(idx)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity" title="Barajı Sil"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                      </th>
                                  ))}
                               </tr>
                            </thead>
                            <tbody>
                               {CATEGORIES.map((cat, rIdx) => (
                                  <tr key={cat} className="border-b border-slate-50 hover:bg-slate-50/50">
                                     <td className="p-3 border-r border-slate-200 font-black text-emerald-700 bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{cat} Sınıfı</td>
                                     {mileThresholds.map((th, cIdx) => (
                                        <td key={cIdx} className="p-1 border-r border-slate-100">
                                           <div className="flex items-center justify-center h-full relative">
                                              <span className="text-slate-400 font-bold text-xs absolute left-2 pointer-events-none">₺</span>
                                              <input type="text" className="w-full h-full p-3 pl-6 text-center text-sm font-black text-emerald-600 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 focus:bg-emerald-50/30 transition-all" placeholder="0" value={mileMatrix[type.id]?.[cat]?.[th] || ""} onChange={(e) => updateMileCell(type.id, cat, th, e.target.value)} onPaste={(e) => handleMilestonePaste(e, type.id, rIdx, cIdx)}/>
                                           </div>
                                        </td>
                                     ))}
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   </div>
                ))}
             </div>
          )}

          {/* ========================================== */}
          {/* 🚀 TAB 5: YENİ EKLENEN MAAŞ VE YOL SEKMESİ */}
          {/* ========================================== */}
          {activeTab === "SALARY" && (
             <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-sky-50 p-4 rounded-2xl border border-sky-100 gap-4">
                   <div className="flex-1">
                      <p className="text-xs font-bold text-sky-800 mb-1">💡 <strong>Bilgi:</strong> Unvanlar sisteme otomatik yansıtılmıştır. Buraya gireceğiniz değerler ay sonu kazanç hesaplamalarında personellerin <strong>hakediş (net)</strong> tutarına doğrudan eklenecektir.</p>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={saveSalaries} disabled={saving} className="bg-sky-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-sky-700 transition-all">{saving ? "KAYDEDİLİYOR..." : "TÜMÜNÜ KAYDET"}</button>
                   </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left whitespace-nowrap">
                         <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <tr>
                               <th className="p-4 pl-6 w-1/3">Personel Unvanı</th>
                               <th className="p-4 w-1/3 text-center">Temel Maaş (TL)</th>
                               <th className="p-4 pr-6 w-1/3 text-center">Yol / Yemek Ücreti (TL)</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {salaries.map((row, idx) => (
                               <tr key={idx} className="hover:bg-sky-50/20 group">
                                  <td className="p-4 pl-6 font-black text-slate-700">{row.titleName}</td>
                                  <td className="p-2">
                                     <div className="flex items-center justify-center gap-2">
                                        <input type="number" value={row.baseSalary} onChange={e => updateSalary(idx, 'baseSalary', parseFloat(e.target.value))} className="w-32 p-3 text-center rounded-lg border-transparent focus:border-sky-500 focus:ring-2 outline-none font-bold text-slate-800 bg-slate-50" placeholder="0" />
                                        <span className="font-bold text-slate-400 text-sm">₺</span>
                                     </div>
                                  </td>
                                  <td className="p-2 pr-6">
                                     <div className="flex items-center justify-center gap-2">
                                        <input type="number" value={row.travelAllowance} onChange={e => updateSalary(idx, 'travelAllowance', parseFloat(e.target.value))} className="w-32 p-3 text-center rounded-lg border-transparent focus:border-sky-500 focus:ring-2 outline-none font-bold text-slate-800 bg-slate-50" placeholder="0" />
                                        <span className="font-bold text-slate-400 text-sm">₺</span>
                                     </div>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
          )}

        </div>
      )}
    </div>
  );
}