"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import TargetNavigationCard from "@/components/dashboard/TargetNavigationCard";
import PersonnelPerformanceCard from "@/components/dashboard/PersonnelPerformanceCard";

// 🚀 YENİ OLUŞTURDUĞUMUZ MODÜLLERİ ÇAĞIRIYORUZ
import DashboardHero from "@/components/dashboard/DashboardHero";
import CumulativeCard from "@/components/dashboard/CumulativeCard";
import QuickSaveCard from "@/components/dashboard/QuickSaveCard";
import OwaMailCard from "@/components/dashboard/OwaMailCard";
import FutureProjections from "@/components/dashboard/FutureProjections";

export default function DashboardHomePage() {
  const { data: session } = useSession();
  
  const [level, setLevel] = useState("STORE"); 
  const [filterId, setFilterId] = useState("ALL");
  const [stores, setStores] = useState<any[]>([]);
  const [myStoreId, setMyStoreId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [personnelSales, setPersonnelSales] = useState<any[]>([]);
  const [quickRevenue, setQuickRevenue] = useState("");
  const [isSavingQuick, setIsSavingQuick] = useState(false);
  const [reportEmail, setReportEmail] = useState("");

  const [data, setData] = useState({ 
      currMonthName: "...", nextMonthName: "...",
      m1CurrSales: 0, m2CurrSales: 0, hybridCurrSales: 0, currTarget: 0,
      m1Sales: 0, m2Sales: 0, hybridSales: 0, 
      m1Target: 0, m2Target: 0, hybridTarget: 0,
      hybridRealizedSales: 0 
  });

  const userRole = session?.user?.role;
  const isStoreManager = userRole === "STORE_MANAGER";
  const isRegionManager = userRole === "REGION_MANAGER";
  const isAdmin = userRole === "ADMIN";

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const formattedDateString = `${String(currentDay).padStart(2, '0')}.${String(currentMonth).padStart(2, '0')}.${currentYear}`;

  const fetchPersonnelSales = async (targetId: string) => {
      try {
          const res = await fetch(`/api/store-performance?storeId=${targetId}&month=${currentMonth}&year=${currentYear}`);
          if (res.ok) {
              const result = await res.json();
              const combinedData = result.personnels.map((p: any) => {
                  const mData = result.monthlyData.find((md: any) => md.personnelId === p.id);
                  return { ...p, personnel: p, ownRevenue: mData?.ownRevenue || 0 };
              })
              .filter((p: any) => !p.title?.name?.toLowerCase().includes("müdür"))
              .sort((a: any, b: any) => b.ownRevenue - a.ownRevenue);
              setPersonnelSales(combinedData);
          }
      } catch (err) { console.error(err); }
  };

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
          if (result.allowedStoreId) setMyStoreId(result.allowedStoreId);

          let total = 0;
          if (isStoreManager || filterId === "ALL") total = salesArray.reduce((acc: number, curr: any) => acc + Number(curr.revenue), 0);
          else if (level === "STORE") total = salesArray.filter((s:any) => s.storeId === filterId).reduce((acc: number, curr: any) => acc + Number(curr.revenue), 0);
          else if (level === "REGION") total = salesArray.filter((s:any) => s.regionId === filterId).reduce((acc: number, curr: any) => acc + Number(curr.revenue), 0);
          
          setData(prev => ({ ...prev, hybridRealizedSales: total }));

          const targetStoreIdToday = isStoreManager ? (result.allowedStoreId || filterId) : filterId;
          if (targetStoreIdToday && targetStoreIdToday !== "ALL") {
              const todaySale = salesArray.find((s: any) => new Date(s.date).getUTCDate() === currentDay && s.storeId === targetStoreIdToday);
              setQuickRevenue(todaySale ? todaySale.revenue.toString() : "");
              fetchPersonnelSales(targetStoreIdToday);
          } else {
              setQuickRevenue("");
              setPersonnelSales([]);
          }
       }
    } catch (err) {}
  };

  useEffect(() => {
    fetch('/api/stores').then(res => res.json()).then(resData => {
        const storeList = Array.isArray(resData) ? resData : (resData.store ? [resData.store] : []);
        setStores(storeList);
        if (isStoreManager && storeList.length > 0) setFilterId(storeList[0].id);
        else if (isRegionManager) setLevel("REGION");
    });
  }, [isStoreManager, isRegionManager]);

  useEffect(() => {
    if (session) {
      fetchHybridData();
      fetchRealizedSales();
    }
  }, [level, filterId, session]);

  useEffect(() => {
    const targetStoreId = isStoreManager ? (myStoreId || filterId) : filterId;
    if (targetStoreId && targetStoreId !== "ALL") {
        setReportEmail(localStorage.getItem(`genlyo_mail_${targetStoreId}`) || "");
    } else {
        setReportEmail("");
    }
  }, [filterId, myStoreId, isStoreManager]);

  const handleQuickSave = async () => {
    if (!quickRevenue || isNaN(parseFloat(quickRevenue.replace(/\./g, '').replace(',', '.')))) {
        alert("Lütfen geçerli bir tutar girin."); return;
    }
    const targetStoreId = isStoreManager ? (myStoreId || filterId) : filterId;
    if (!targetStoreId || targetStoreId === "ALL") {
        alert("Hızlı ciro girişi yapmak için yukarıdan tek bir mağaza seçmelisiniz."); return;
    }
    setIsSavingQuick(true);
    try {
      const cleanRevenue = parseFloat(quickRevenue.replace(/\./g, '').replace(',', '.'));
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ storeId: targetStoreId, year: currentYear, month: currentMonth, day: currentDay, revenue: cleanRevenue }])
      });
      if (res.ok) { fetchRealizedSales(); alert("✅ Kaydedildi!"); }
    } catch (err) {} finally { setIsSavingQuick(false); }
  };

  const handleSaveEmail = () => {
    const targetStoreId = isStoreManager ? (myStoreId || filterId) : filterId;
    if (!targetStoreId || targetStoreId === "ALL") { alert("Lütfen önce bir mağaza seçin."); return; }
    if (!reportEmail.includes("@")) { alert("Lütfen geçerli bir e-posta adresi girin."); return; }
    localStorage.setItem(`genlyo_mail_${targetStoreId}`, reportEmail);
    alert("✅ Raporlama mail adresi bu mağaza için cihazınıza kaydedildi!");
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(Math.round(val || 0));
  const realizedPercentage = data.currTarget > 0 ? (data.hybridRealizedSales / data.currTarget) * 100 : 0;
  const closingPercentage = data.currTarget > 0 ? (data.hybridCurrSales / data.currTarget) * 100 : 0;

  const mailSubject = encodeURIComponent(`[${formattedDateString}] Tarihli Günleme Hk.`);
  const formattedRevenue = Number(quickRevenue || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
  const mailBody = encodeURIComponent(`Merhaba;\n${formattedDateString} tarihli ciromuz ${formattedRevenue} TL'dir.\nİyi çalışmalar.`);
  const owaLink = `https://mail.saatvesaat.com/owa/#path=/mail/action/compose&to=${encodeURIComponent(reportEmail)}&subject=${mailSubject}&body=${mailBody}`;

  const selectedStoreName = stores.find(s => s.id === (isStoreManager ? (myStoreId || filterId) : filterId))?.name || "Mağaza";
  const isStoreNotSelected = level !== "STORE" || filterId === "ALL";

  return (
    // p-10 yerine p-4 md:p-6, space-y-10 yerine space-y-5
    <div className="p-4 md:p-6 space-y-5 animate-in fade-in duration-700">
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
      
      {/* ÜST FİLTRE VE KARŞILAMA BÖLÜMÜ */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Hoş Geldiniz, <span className="text-indigo-600">{session?.user?.name || "Yönetici"}</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Hibrit Yapay Zeka Karar Merkezi Aktif</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {(isAdmin || (isRegionManager && level === "STORE")) && (
            <select value={filterId} onChange={e => setFilterId(e.target.value)} className="px-4 py-2.5 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-indigo-100">
              <option value="ALL">{level === "STORE" ? "Tüm Mağazalar" : "Tüm Bölgeler"}</option>
              {level === "STORE" ? stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>) : []}
            </select>
          )}

          {isAdmin && (
            <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner">
              {["STORE", "REGION", "TOTAL"].map((lvl) => (
                <button
                  key={lvl} onClick={() => { setLevel(lvl); setFilterId("ALL"); }}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${level === lvl ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {lvl === "STORE" ? "Mağaza" : lvl === "REGION" ? "Bölge" : "Genel"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 1. KAHRAMAN (HERO) KARTI */}
      <DashboardHero data={data} formatMoney={formatMoney} closingPercentage={closingPercentage} />

      {/* 2. BENTO GRID KARTLARI (4'LÜ YAPI) */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        <CumulativeCard hybridRealizedSales={data.hybridRealizedSales} realizedPercentage={realizedPercentage} formatMoney={formatMoney} />
        
        <QuickSaveCard 
          formattedDateString={formattedDateString} quickRevenue={quickRevenue} setQuickRevenue={setQuickRevenue} 
          handleQuickSave={handleQuickSave} isSavingQuick={isSavingQuick} disabled={isStoreNotSelected}
        />
        
        <OwaMailCard 
          reportEmail={reportEmail} setReportEmail={setReportEmail} owaLink={owaLink} 
          handleSaveEmail={handleSaveEmail} disabled={isStoreNotSelected}
        />
        
        <PersonnelPerformanceCard 
          personnelSales={personnelSales} hybridRealizedSales={data.hybridRealizedSales} 
          realizedPercentage={realizedPercentage} selectedStoreName={selectedStoreName} 
        />
      </section>

      <TargetNavigationCard />

      <FutureProjections data={data} formatMoney={formatMoney} />

    </div>
  );