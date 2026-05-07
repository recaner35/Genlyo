"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import TargetNavigationCard from "@/components/dashboard/TargetNavigationCard";

export default function DashboardHomePage() {
  const { data: session } = useSession();
  
  const [level, setLevel] = useState("STORE"); 
  const [filterId, setFilterId] = useState("ALL");
  const [stores, setStores] = useState<any[]>([]);
  const [myStoreId, setMyStoreId] = useState<string | null>(null);

  const [data, setData] = useState({ 
      currMonthName: "...", nextMonthName: "...",
      m1CurrSales: 0, m2CurrSales: 0, hybridCurrSales: 0, currTarget: 0,
      m1Sales: 0, m2Sales: 0, hybridSales: 0, 
      m1Target: 0, m2Target: 0, hybridTarget: 0,
      hybridRealizedSales: 0 
  });
  const [loading, setLoading] = useState(true);

  // Personel verileri için State
  const [personnelSales, setPersonnelSales] = useState<any[]>([]);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);

  const [quickRevenue, setQuickRevenue] = useState("");
  const [isSavingQuick, setIsSavingQuick] = useState(false);
  const [reportEmail, setReportEmail] = useState("");

  const userRole = session?.user?.role;
  const isStoreManager = userRole === "STORE_MANAGER";
  const isRegionManager = userRole === "REGION_MANAGER";
  const isAdmin = userRole === "ADMIN";

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const formattedDateString = `${String(currentDay).padStart(2, '0')}.${String(currentMonth).padStart(2, '0')}.${currentYear}`;

  useEffect(() => {
    fetch('/api/stores').then(res => res.json()).then(resData => {
        const storeList = Array.isArray(resData) ? resData : (resData.store ? [resData.store] : []);
        setStores(storeList);
        if (isStoreManager) {
            setLevel("STORE");
            if (storeList.length > 0) setFilterId(storeList[0].id);
        } else if (isRegionManager) setLevel("REGION");
    }).catch(err => console.error(err));
  }, [userRole, isStoreManager, isRegionManager]);

  useEffect(() => {
    if (session) {
      fetchHybridData();
      fetchRealizedSales();
      fetchPersonnelSales();
    }
  }, [level, filterId, session]);

  useEffect(() => {
    const targetStoreId = isStoreManager ? (myStoreId || filterId) : filterId;
    if (targetStoreId && targetStoreId !== "ALL") {
        const savedEmail = localStorage.getItem(`genlyo_mail_${targetStoreId}`);
        setReportEmail(savedEmail || "");
    } else setReportEmail("");
  }, [filterId, myStoreId, isStoreManager]);

  const fetchHybridData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/hybrid?level=${level}&filterId=${filterId}`);
      if (res.ok) {
        const result = await res.json();
        setData(prev => ({ ...prev, ...result }));
      }
    } catch (err) {} finally { setLoading(false); }
  };

  const fetchRealizedSales = async () => {
    try {
       const res = await fetch(`/api/sales?year=${currentYear}&month=${currentMonth}&_t=${Date.now()}`, { cache: 'no-store' });
       if (res.ok) {
          const result = await res.json();
          const salesArray = Array.isArray(result?.sales) ? result.sales : [];
          let actualStoreId = myStoreId;
          if (result.allowedStoreId) {
              setMyStoreId(result.allowedStoreId);
              actualStoreId = result.allowedStoreId;
          }

          let total = 0;
          if (isStoreManager || filterId === "ALL") total = salesArray.reduce((acc: number, curr: any) => acc + Number(curr.revenue), 0);
          else if (level === "STORE") total = salesArray.filter((s:any) => s.storeId === filterId).reduce((acc: number, curr: any) => acc + Number(curr.revenue), 0);
          else if (level === "REGION") total = salesArray.filter((s:any) => s.regionId === filterId).reduce((acc: number, curr: any) => acc + Number(curr.revenue), 0);
          setData(prev => ({ ...prev, hybridRealizedSales: total }));

          const targetStoreIdToday = isStoreManager ? (actualStoreId || filterId) : filterId;
          if (targetStoreIdToday && targetStoreIdToday !== "ALL") {
              const todaySale = salesArray.find((s: any) => new Date(s.date).getUTCDate() === currentDay && s.storeId === targetStoreIdToday);
              if (todaySale) setQuickRevenue(todaySale.revenue.toString());
              else setQuickRevenue("");
          } else {
              setQuickRevenue("");
          }
       }
    } catch (err) {}
  };

  const fetchPersonnelSales = async () => {
      const targetStoreId = isStoreManager ? (myStoreId || filterId) : filterId;
      if (!targetStoreId || targetStoreId === "ALL") { setPersonnelSales([]); return; }
      setLoadingPersonnel(true);
      try {
          const res = await fetch(`/api/personnel/monthly-data?year=${currentYear}&month=${currentMonth}&storeId=${targetStoreId}`);
          if (res.ok) {
              const result = await res.json();
              const filtered = (result.data || [])
                  .filter((p: any) => p.personnel?.title?.name !== "Mağaza Müdürü")
                  .sort((a: any, b: any) => b.ownRevenue - a.ownRevenue);
              setPersonnelSales(filtered);
          }
      } catch (err) { console.error(err); } finally { setLoadingPersonnel(false); }
  };

  const handleQuickSave = async () => {
    if (!quickRevenue || isNaN(parseFloat(quickRevenue.replace(/\./g, '').replace(',', '.')))) {
        alert("Lütfen geçerli bir tutar girin.");
        return;
    }
    const targetStoreId = isStoreManager ? (myStoreId || filterId) : filterId;
    if (!targetStoreId || targetStoreId === "ALL") {
        alert("Hızlı ciro girişi yapmak için yukarıdan tek bir mağaza seçmelisiniz.");
        return;
    }

    setIsSavingQuick(true);
    const cleanRevenue = parseFloat(quickRevenue.replace(/\./g, '').replace(',', '.'));
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ storeId: targetStoreId, year: currentYear, month: currentMonth, day: currentDay, revenue: cleanRevenue }])
      });
      const resData = await res.json();
      if (res.ok && resData.count > 0) { 
          alert("✅ Kaydedildi!"); 
          fetchRealizedSales(); 
      } else {
          alert("❌ Kaydedilemedi! Eşleşen Mağaza bulunamadı.");
      }
    } catch (err) {} finally { setIsSavingQuick(false); }
  };

  const handleSaveEmail = () => {
    const targetStoreId = isStoreManager ? (myStoreId || filterId) : filterId;
    if (!targetStoreId || targetStoreId === "ALL") { alert("Lütfen önce bir mağaza seçin."); return; }
    if (!reportEmail.includes("@")) { alert("Lütfen geçerli bir e-posta adresi girin."); return; }
    localStorage.setItem(`genlyo_mail_${targetStoreId}`, reportEmail);
    alert("✅ Raporlama mail adresi bu mağaza için cihazınıza kaydedildi!");
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(val || 0));

  const closingPercentage = data.currTarget > 0 ? (data.hybridCurrSales / data.currTarget) * 100 : 0;
  const realizedPercentage = data.currTarget > 0 ? (data.hybridRealizedSales / data.currTarget) * 100 : 0;

  const mailSubject = encodeURIComponent(`[${formattedDateString}] Tarihli Günleme Hk.`);
  const formattedRevenue = Number(quickRevenue || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
  const mailBody = encodeURIComponent(`Merhaba;\n${formattedDateString} tarihli ciromuz ${formattedRevenue} TL'dir.\nİyi çalışmalar.`);
  const owaLink = `https://mail.saatvesaat.com/owa/#path=/mail/action/compose&to=${encodeURIComponent(reportEmail)}&subject=${mailSubject}&body=${mailBody}`;

  const selectedStoreName = stores.find(s => s.id === (isStoreManager ? (myStoreId || filterId) : filterId))?.name || "Mağaza";

  const getAbbreviation = (title: string) => {
      if (!title) return "";
      if (title.includes("Satış Danışmanı")) return "SD";
      if (title.includes("Uzman")) return "Uzm";
      if (title.includes("Usta")) return "Usta";
      return title;
  };

  const generatedReportText = useMemo(() => {
      let text = `${selectedStoreName}\nHG: ${realizedPercentage.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nCiro: ${Math.round(data.hybridRealizedSales).toLocaleString('tr-TR')}\n`;
      personnelSales.forEach(p => {
          const ratio = data.hybridRealizedSales > 0 ? (p.ownRevenue / data.hybridRealizedSales) * 100 : 0;
          text += `${getAbbreviation(p.personnel?.title?.name)} ${p.personnel?.firstName}: ${ratio.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      });
      return text.trim();
  }, [selectedStoreName, realizedPercentage, data.hybridRealizedSales, personnelSales]);

  // QR Kod URL'si oluşturma
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generatedReportText)}`;

  const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      
      {/* ÜST BAŞLIK */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Hoş Geldiniz, <span className="text-indigo-600">{session?.user?.name}</span></h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Hibrit Karar Merkezi Aktif</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(isAdmin || (isRegionManager && level === "STORE")) && (
            <select value={filterId} onChange={e => setFilterId(e.target.value)} className="px-4 py-2.5 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-indigo-100">
              <option value="ALL">{level === "STORE" ? "Tüm Mağazalar" : "Tüm Bölgeler"}</option>
              {level === "STORE" ? stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>) : regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="space-y-8">
        
        {/* AY SONU KARTI */}
        <div className="bg-indigo-900 rounded-3xl p-8 md:p-10 border border-indigo-800 shadow-2xl relative overflow-hidden text-white flex flex-col md:flex-row gap-8 justify-between">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-700 rounded-full opacity-40 blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex-1">
            <h3 className="text-2xl font-black mb-6">Ay Sonu Kapanış Tahmini <span className="text-sm text-indigo-300 ml-2">({data.currMonthName})</span></h3>
            <div className="space-y-4 font-mono text-base font-bold text-indigo-200 max-w-sm">
                <div className="flex justify-between pb-3 border-b border-indigo-800/50"><span>Motor 1</span><span className="text-white">{formatMoney(data.m1CurrSales)}</span></div>
                <div className="flex justify-between pb-3 border-b border-indigo-800/50"><span>Motor 2</span><span className="text-white">{formatMoney(data.m2CurrSales)}</span></div>
            </div>
          </div>
          <div className="relative z-10 flex-1 flex flex-col justify-center items-end text-right border-t md:border-t-0 md:border-l border-indigo-800/50 pt-6 md:pt-0 md:pl-10">
             <p className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-2">Hibrit Kapanış Projeksiyonu</p>
             <h2 className="text-6xl lg:text-7xl font-black tracking-tight">{formatMoney(data.hybridCurrSales)}</h2>
             <div className="w-full mt-10">
                <div className="flex justify-between text-sm font-bold text-indigo-200 mb-3">
                    <span>Hedef: {formatMoney(data.currTarget)}</span>
                    <span className={realizedPercentage >= 100 ? 'text-emerald-400' : 'text-amber-400'}>%{((data.hybridCurrSales / data.currTarget) * 100).toFixed(1)} Başarı Tahmini</span>
                </div>
                <div className="w-full h-3 bg-indigo-950 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-1000 ${realizedPercentage >= 100 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${Math.min((data.hybridCurrSales / data.currTarget) * 100, 100)}%` }}></div></div>
             </div>
          </div>
        </div>

        {/* ORTA BÖLÜM: 4 KART BİRDEN EKRANDA (4 Kolonlu Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            
            {/* 1. GERÇEKLEŞEN */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl flex flex-col justify-between">
                <div><h3 className="text-xl font-black mb-2">Kümülatif Gerçekleşen</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Kesinleşen Satışlar</p>
                <h2 className="text-4xl xl:text-5xl font-black tracking-tight">{formatMoney(data.hybridRealizedSales)}</h2>
                <div className="w-full mt-8"><div className="flex justify-between text-[11px] font-bold mb-2"><span>Hedef: {formatMoney(data.currTarget)}</span><span>%{realizedPercentage.toFixed(1)}</span></div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${Math.min(realizedPercentage, 100)}%` }}></div></div></div></div>
            </div>

            {/* 2. CİRO GİRİŞ */}
            <div className="bg-slate-900 rounded-3xl p-8 shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10"><h3 className="text-xl font-black text-white mb-2">Hızlı Kasa Bildirimi</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Tarih: {formattedDateString}</p>
                <div className="flex flex-col gap-4">{filterId !== "ALL" ? (<><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₺</span>
                <input type="text" placeholder="Ciro..." value={quickRevenue} onChange={e => setQuickRevenue(e.target.value)} className="w-full pl-10 pr-4 py-4 rounded-xl bg-slate-800 text-white font-mono font-black outline-none focus:border-indigo-400"/></div>
                <button onClick={handleQuickSave} disabled={isSavingQuick} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-indigo-500 transition-all uppercase text-sm">{isSavingQuick ? "..." : "SİSTEME KAYDET"}</button></>) : (<div className="text-amber-400 text-center text-sm">Mağaza seçiniz.</div>))}</div></div>
            </div>

            {/* 3. OWA MAİL KARTI */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">Gün Sonu Bildirimi</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">OWA Mail Gönderimi</p>
                  <div className="flex flex-col gap-4">
                      {level === "STORE" && filterId !== "ALL" ? (
                          <>
                             <div className="flex items-center gap-2">
                                <input type="email" placeholder="Alıcı Mail Adresi..." value={reportEmail} onChange={(e) => setReportEmail(e.target.value)} className="flex-1 px-4 py-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold outline-none focus:border-blue-400 transition-colors text-sm" />
                                <button onClick={handleSaveEmail} className="bg-slate-800 text-white px-5 py-4 rounded-xl font-black shadow-md hover:bg-slate-700 transition-all text-xs uppercase tracking-wider">KAYDET</button>
                             </div>
                             <a href={reportEmail ? owaLink : '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => { if(!reportEmail) { e.preventDefault(); alert('Lütfen önce bir mail adresi kaydedin.'); } }} className={`w-full text-white px-6 py-4 rounded-xl font-black shadow-lg transition-all uppercase tracking-widest text-sm text-center flex items-center justify-center gap-2 ${reportEmail ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-200' : 'bg-slate-300 cursor-not-allowed'}`}>
                                <span>✉️ OWA İLE GÖNDER</span>
                             </a>
                          </>
                      ) : (
                          <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl text-center h-full flex items-center justify-center"><p className="text-slate-500 font-bold text-sm">Mail şablonu için <strong>Mağaza</strong> seçiniz.</p></div>
                      )}
                  </div>
                </div>
            </div>

            {/* 4. PERSONEL DAĞILIMI VE QR KOPYALAMA */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl flex flex-col relative overflow-hidden">
                <h3 className="text-xl font-black mb-2">Personel Dağılımı</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Paylaşıma Hazır Rapor</p>
                
                <div className="flex items-center gap-6 mb-4">
                    {/* SVG PASTA GRAFİK */}
                    <div className="relative w-16 h-16 flex-shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                            {personnelSales.length > 0 ? (
                                personnelSales.map((p, i) => {
                                    const total = personnelSales.reduce((acc, curr) => acc + curr.ownRevenue, 0);
                                    const percentage = total > 0 ? (p.ownRevenue / total) * 100 : 0;
                                    const offset = personnelSales.slice(0, i).reduce((acc, curr) => acc + (curr.ownRevenue / total) * 100, 0);
                                    return (
                                        <circle key={i} cx="18" cy="18" r="15.9" fill="transparent" stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth="3.5"
                                            strokeDasharray={`${percentage} ${100 - percentage}`} strokeDashoffset={-offset} className="transition-all duration-1000 ease-out" />
                                    );
                                })
                            ) : (
                                <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#f1f5f9" strokeWidth="3.5" />
                            )}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-slate-400 uppercase tracking-tighter">Ekip</div>
                    </div>

                    <div className="flex-1 space-y-1">
                        {personnelSales.slice(0, 3).map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] font-bold">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                                <span className="text-slate-600 truncate">{p.personnel?.firstName}</span>
                                <span className="ml-auto text-indigo-600">%{((p.ownRevenue / (data.hybridRealizedSales || 1)) * 100).toFixed(1)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* iOS & Android Uyumlu QR KODU */}
                <div className="mt-auto flex flex-col items-center justify-center pt-3 border-t border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-widest text-center">Kameradan Okutup Kopyalayın</p>
                    <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 object-contain rounded-lg shadow-sm border border-slate-100 p-1" />
                </div>
            </div>
        </div>

        {/* HEDEF NAVİGASYON */}
        <div className="w-full"><TargetNavigationCard /></div>

        {/* GELECEK AY PROJEKSİYONLARI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
                <h3 className="text-xl font-black text-slate-800 mb-6">Ciro Projeksiyonu <span className="text-sm font-bold text-slate-400 ml-2">({data.nextMonthName})</span></h3>
                <div className="space-y-4 font-mono text-base font-bold text-slate-700">
                    <div className="flex justify-between pb-3 border-b"><span>Motor 1</span><span>{formatMoney(data.m1Sales)}</span></div>
                    <div className="flex justify-between pb-3 border-b"><span>Motor 2</span><span>{formatMoney(data.m2Sales)}</span></div>
                    <div className="flex justify-between pt-3 text-xl text-indigo-700"><span className="font-black">Hibrit Tahmin</span><span className="font-black">{formatMoney(data.hybridSales)}</span></div>
                </div>
             </div>
             <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
                <h3 className="text-xl font-black text-slate-800 mb-6">Hedef Önerisi <span className="text-sm font-bold text-slate-400 ml-2">({data.nextMonthName})</span></h3>
                <div className="space-y-4 font-mono text-base font-bold text-slate-700">
                    <div className="flex justify-between pb-3 border-b"><span>Motor 1</span><span>{formatMoney(data.m1Target)}</span></div>
                    <div className="flex justify-between pb-3 border-b"><span>Motor 2</span><span>{formatMoney(data.m2Target)}</span></div>
                    <div className="flex justify-between pt-3 text-xl text-emerald-600"><span className="font-black">Hibrit Öneri</span><span className="font-black">{formatMoney(data.hybridTarget)}</span></div>
                </div>
             </div>
        </div>

      </div>
    </div>
  );
}