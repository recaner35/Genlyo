"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";

export default function StorePerformancePage() {
    const { data: session } = useSession();

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [storeCategory, setStoreCategory] = useState("A");
    const [personnels, setPersonnels] = useState<any[]>([]);
    const [rules, setRules] = useState<any>(null);

    const [storeHitRate, setStoreHitRate] = useState<number>(0);
    const [totalTarget, setTotalTarget] = useState<number>(0);
    const [totalRevenue, setTotalRevenue] = useState<number>(0);

    const [inputs, setInputs] = useState<any>({});

    const [brandSortOrder, setBrandSortOrder] = useState<"asc" | "desc">("asc");

    const storeId = session?.user?.storeId;

    useEffect(() => {
        if (storeId) fetchData();
    }, [storeId, selectedMonth, selectedYear]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/store-performance?storeId=${storeId}&month=${selectedMonth}&year=${selectedYear}`);
            if (res.ok) {
                const data = await res.json();
                setStoreCategory(data.storeCategory);
                setPersonnels(data.personnels);

                data.rules.productRules.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr-TR'));
                data.rules.penaltyRules.sort((a: any, b: any) => a.modelName.localeCompare(b.modelName, 'tr-TR'));
                setRules(data.rules);

                setStoreHitRate(data.storeHitRate);
                setTotalTarget(data.totalTarget);
                setTotalRevenue(data.totalRevenue);

                const initialInputs: any = {};
                data.personnels.forEach((p: any) => {
                    const existing = data.monthlyData.find((md: any) => md.personnelId === p.id);
                    initialInputs[p.id] = {
                        ownRevenue: existing?.ownRevenue || 0,
                        techServiceEarn: existing?.techServiceEarn || 0,
                        productData: existing?.productSalesData || {},
                        penaltyData: existing?.penaltySalesData || {}
                    };
                });
                setInputs(initialInputs);
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleInputChange = (personnelId: string, field: string, value: number, subKey?: string) => {
        setInputs((prev: any) => {
            const newInputs = { ...prev };
            if (!newInputs[personnelId]) newInputs[personnelId] = { productData: {}, penaltyData: {} };

            if (subKey) newInputs[personnelId][field][subKey] = isNaN(value) ? 0 : value;
            else newInputs[personnelId][field] = isNaN(value) ? 0 : value;

            return newInputs;
        });
    };

    const sortedPersonnels = useMemo(() => {
        if (!personnels) return [];
        return [...personnels].sort((a, b) => {
            const isManagerA = a.title?.name?.toLowerCase().includes("müdür");
            const isManagerB = b.title?.name?.toLowerCase().includes("müdür");

            if (isManagerA && !isManagerB) return 1;
            if (!isManagerA && isManagerB) return -1;

            const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
            const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
            return nameA.localeCompare(nameB, 'tr-TR');
        });
    }, [personnels]);

    const sortedProductRules = useMemo(() => {
        if (!rules?.productRules) return [];
        return [...rules.productRules].sort((a: any, b: any) => {
            const cmp = a.name.localeCompare(b.name, 'tr-TR');
            return brandSortOrder === "asc" ? cmp : -cmp;
        });
    }, [rules, brandSortOrder]);

    const sortedPenaltyRules = useMemo(() => {
        if (!rules?.penaltyRules) return [];
        return [...rules.penaltyRules].sort((a: any, b: any) => {
            const cmp = a.modelName.localeCompare(b.modelName, 'tr-TR');
            return brandSortOrder === "asc" ? cmp : -cmp;
        });
    }, [rules, brandSortOrder]);

    // ==========================================
    // 🚀 ERP KOPYALA-YAPIŞTIR MOTORU (ANA CİRO İÇİN)
    // ==========================================
    const handleSmartPaste = (e: any) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('Text');
        const rows = pasteData.split(/\r?\n/).filter((r: string) => r.trim() !== '');

        if (rows.length === 0) {
            alert("Kopyalanan veri bulunamadı.");
            return;
        }

        let matchCount = 0;
        const newInputs = { ...inputs };

        rows.forEach((row: string) => {
            const cols = row.split('\t');
            const nameIndex = 3;
            const amountIndex = 10;

            if (cols.length > amountIndex) {
                const rawName = cols[nameIndex]?.trim().toLowerCase() || "";
                const rawAmount = cols[amountIndex]?.trim() || "";

                const matchedPerson = personnels.find(p => {
                    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
                    return rawName === fullName || rawName.includes(fullName) || fullName.includes(rawName);
                });

                if (matchedPerson) {
                    const cleanAmount = parseFloat(rawAmount.replace(/\./g, '').replace(',', '.'));

                    if (!isNaN(cleanAmount)) {
                        if (!newInputs[matchedPerson.id]) newInputs[matchedPerson.id] = { productData: {}, penaltyData: {} };
                        newInputs[matchedPerson.id].ownRevenue = cleanAmount;
                        matchCount++;
                    }
                }
            }
        });

        setInputs(newInputs);
        if (matchCount > 0) alert(`✅ ${matchCount} personelin ana cirosu başarıyla eşleştirildi.`);
    };

    // ==========================================
    // 🧠 CANLI HESAPLAMA MOTORU
    // ==========================================
    const calculations = useMemo(() => {
        if (!rules || personnels.length === 0) {
            return { results: {}, maxPenaltyPercent: 0, storeTotalPenaltySales: {} };
        }

        const results: any = {};
        let storeTotalPenaltySales: any = {};

        rules.penaltyRules.forEach((pr: any) => { storeTotalPenaltySales[pr.modelName] = 0; });
        personnels.forEach(p => {
            const pData = inputs[p.id] || {};
            rules.penaltyRules.forEach((pr: any) => {
                storeTotalPenaltySales[pr.modelName] += (pData.penaltyData?.[pr.modelName] || 0);
            });
        });

        let applicablePenalties: number[] = [0];
        rules.penaltyRules.forEach((pr: any) => {
            if (storeTotalPenaltySales[pr.modelName] === 0) applicablePenalties.push(pr.penaltyPercent);
        });
        const maxPenaltyPercent = Math.max(...applicablePenalties);

        personnels.forEach(p => {
            const pData = inputs[p.id] || { ownRevenue: 0, techServiceEarn: 0, productData: {}, penaltyData: {} };
            const title = p.title?.name || "";
            const isManager = title.toLowerCase().includes("müdür");

            const titleReward = rules.titleRewards?.find((tr: any) => tr.titleName === title);
            const baseSalary = titleReward?.baseSalary || 0;
            const travelAllowance = titleReward?.travelAllowance || 0;

            let revenueBonus = 0;
            const applicableRevRules = rules.revenueRules.filter((r: any) => r.titleName === title && r.storeCategory === storeCategory && storeHitRate >= r.minTargetHitRate);
            if (applicableRevRules.length > 0) {
                const bestRule = applicableRevRules.reduce((prev: any, current: any) => (prev.minTargetHitRate > current.minTargetHitRate) ? prev : current);

                // Müdürler toplam mağaza cirosundan, diğer personel kendi cirosundan prim alır
                const revenueBase = isManager ? totalRevenue : pData.ownRevenue;
                // Tablolarda 0.75 gibi girilen oranların yüzdelik karşılığı (0.0075) olması için 100'e bölüyoruz
                revenueBonus = revenueBase * (bestRule.multiplier / 100);
            }

            let rawBrandBonus = 0;
            let specialBonus = 0;

            rules.productRules.forEach((pr: any) => {
                const val = pData.productData[pr.name] || 0;
                if (val > 0) {
                    let earned = 0;
                    if (pr.calcType === "FIXED") earned = val * pr.value;
                    if (pr.calcType === "PERCENTAGE") earned = val * (pr.value / 100);

                    if (pr.isConditional && storeHitRate < 95) earned = earned * 0.5;

                    if (pr.isBrand) rawBrandBonus += earned;
                    else specialBonus += earned;
                }
            });

            const finalBrandBonus = rawBrandBonus * (1 - (maxPenaltyPercent / 100));

            let milestoneBonus = 0;
            const applicableMileRules = rules.milestoneRules.filter((r: any) => r.storeCategory === storeCategory && r.isForManager === isManager && storeHitRate >= r.minTargetHitRate);
            if (applicableMileRules.length > 0) {
                const bestMileRule = applicableMileRules.reduce((prev: any, current: any) => (prev.minTargetHitRate > current.minTargetHitRate) ? prev : current);
                milestoneBonus = bestMileRule.rewardAmount;
            }

            const totalBonus = revenueBonus + finalBrandBonus + specialBonus + milestoneBonus + pData.techServiceEarn;
            const totalEarnings = baseSalary + travelAllowance + totalBonus;

            results[p.id] = {
                baseSalary, travelAllowance,
                revenueBonus, rawBrandBonus, finalBrandBonus, specialBonus, milestoneBonus, techServiceEarn: pData.techServiceEarn,
                totalBonus, totalEarnings
            };
        });

        return { results, maxPenaltyPercent, storeTotalPenaltySales };
    }, [inputs, rules, personnels, storeCategory, storeHitRate, totalRevenue]);

    // ==========================================
    // 💾 KAYDETME İŞLEMİ
    // ==========================================
    const savePerformance = async () => {
        setSaving(true);
        const payload = personnels.map(p => ({
            personnelId: p.id,
            ownRevenue: inputs[p.id]?.ownRevenue || 0,
            targetHitRate: storeHitRate,
            techServiceEarn: inputs[p.id]?.techServiceEarn || 0,
            productSalesData: inputs[p.id]?.productData || {},
            penaltySalesData: inputs[p.id]?.penaltyData || {},
            baseSalary: calculations.results[p.id].baseSalary,
            travelAllowance: calculations.results[p.id].travelAllowance,
            calculatedRevenueBonus: calculations.results[p.id].revenueBonus,
            calculatedBrandBonus: calculations.results[p.id].finalBrandBonus,
            calculatedMilestoneBonus: calculations.results[p.id].milestoneBonus,
            calculatedSpecialBonus: calculations.results[p.id].specialBonus,
            totalEarnings: calculations.results[p.id].totalEarnings
        }));

        try {
            const res = await fetch('/api/store-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId, month: selectedMonth, year: selectedYear, data: payload })
            });
            if (res.ok) alert("✅ Veriler başarıyla kaydedildi!");
            else alert("❌ Kayıt sırasında hata oluştu.");
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    if (!storeId) return <div className="p-10 text-center font-bold text-slate-500">Bu ekranı görüntülemek için bir mağazaya atanmış olmanız gerekmektedir.</div>;

    return (
        <div className="p-6 md:p-10 bg-slate-50/50 min-h-screen font-sans">

            {/* ÜST BİLGİ VE FİLTRELER */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mağaza <span className="text-indigo-600">Performans ve Kazanç</span> Paneli</h1>
                    <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Mağaza Sınıfı: <span className="text-indigo-600 mr-4">{storeCategory}</span></p>
                </div>
                <div className="flex gap-4 items-center">
                    <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="p-3 bg-slate-50 font-bold text-slate-700 rounded-xl border border-slate-200 outline-none focus:border-indigo-500">
                        {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}. Ay</option>)}
                    </select>
                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="p-3 bg-slate-50 font-bold text-slate-700 rounded-xl border border-slate-200 outline-none focus:border-indigo-500">
                        {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y} Yılı</option>)}
                    </select>
                    <button onClick={savePerformance} disabled={saving} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all">{saving ? "KAYDEDİLİYOR..." : "VERİLERİ KAYDET"}</button>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
            ) : (
                <div className="space-y-6">

                    {/* 🚀 ERP KOPYALA YAPIŞTIR ALANI (ANA CİRO İÇİN) */}
                    <div
                        className="bg-indigo-50/50 border-2 border-dashed border-indigo-300 rounded-3xl p-6 text-center hover:bg-indigo-50 transition-colors cursor-text relative overflow-hidden group"
                        title="Ana Ciro Tablosunu Buraya Yapıştırın"
                    >
                        <input type="text" className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" onPaste={handleSmartPaste} />
                        <div className="text-indigo-600 mb-2">
                            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <h3 className="text-lg font-black text-indigo-900 group-hover:text-indigo-700 transition-colors">1. ANA CİRO TABLOSU: Buraya Tıkla ve Yapıştır (CTRL+V)</h3>
                        <p className="text-sm font-bold text-indigo-700/70 mt-1">Sistem isimleri eşleştirip Ciro sütununu aşağıdaki 1. Tabloya otomatik dolduracaktır.</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl flex-1 flex items-center justify-between">
                            <div>
                                <h4 className="text-slate-300 font-black text-sm uppercase tracking-widest">Mağaza Hedef Gerçekleşme</h4>
                                <p className="text-xs text-slate-400 font-bold mt-1">Hedef: ₺{totalTarget.toLocaleString('tr-TR')} / Ciro: ₺{totalRevenue.toLocaleString('tr-TR')}</p>
                            </div>
                            <div className="text-3xl font-black text-white">
                                %{storeHitRate.toFixed(1)}
                            </div>
                        </div>

                        {calculations.maxPenaltyPercent > 0 && (
                            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex-1 flex items-center gap-4">
                                <span className="text-3xl">⚠️</span>
                                <div>
                                    <h4 className="text-red-800 font-black text-sm uppercase tracking-widest">Mağaza Bazlı Ceza Uygulanıyor</h4>
                                    <p className="text-xs text-red-700 font-bold mt-1">Zorunlu ürün satışı eksik olduğu için, marka primlerinden <strong>%{calculations.maxPenaltyPercent}</strong> kesinti yapılmaktadır.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* TABLO 1: YATAY ÖZET VE CİRO TABLOSU */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 p-4 border-b border-slate-200">
                            <h3 className="font-black text-slate-800 tracking-tight">1. Genel Performans ve Hakediş Tablosu</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="p-4 sticky left-0 bg-slate-900 z-10">Personel</th>
                                        <th className="p-4 text-center bg-indigo-900/80">Ciro (TL)</th>
                                        <th className="p-4 text-right">Ciro Primi</th>
                                        <th className="p-4 text-right">Marka Teşvik</th>
                                        <th className="p-4 text-right">İlave Teşvik</th>
                                        <th className="p-4 text-center bg-indigo-900/80">T. Servis (TL)</th>
                                        <th className="p-4 text-right text-indigo-300">Toplam Prim</th>
                                        <th className="p-4 text-right text-slate-300">Maaş</th>
                                        <th className="p-4 text-right text-slate-300">Yol Ücreti</th>
                                        <th className="p-4 text-right bg-emerald-900/80">TOPLAM</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sortedPersonnels.length === 0 ? (
                                        <tr><td colSpan={10} className="p-8 text-center text-slate-500 font-bold">Mağazaya kayıtlı personel bulunamadı.</td></tr>
                                    ) : (
                                        sortedPersonnels.map(p => {
                                            const pData = inputs[p.id] || {};
                                            const calc = calculations.results[p.id] || {};
                                            return (
                                                <tr key={p.id} className="hover:bg-slate-50/50">
                                                    <td className="p-3 sticky left-0 bg-white border-r border-slate-200 z-10">
                                                        <p className="font-black text-slate-800 text-sm">{p.firstName} {p.lastName}</p>
                                                        <p className="font-bold text-slate-400 text-[10px] uppercase">{p.title?.name}</p>
                                                    </td>

                                                    <td className="p-2 bg-indigo-50/30">
                                                        <input
                                                            type="text"
                                                            value={pData.ownRevenue ? pData.ownRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : ""}
                                                            onChange={e => {
                                                                const cleanStr = e.target.value.replace(/\./g, '').replace(',', '.');
                                                                handleInputChange(p.id, 'ownRevenue', parseFloat(cleanStr));
                                                            }}
                                                            className="w-28 p-2 text-center rounded bg-white border border-indigo-100 outline-none focus:border-indigo-500 font-black text-indigo-700 text-sm"
                                                            placeholder="0"
                                                        />
                                                    </td>

                                                    <td className="p-3 text-right font-bold text-slate-600">₺{calc.revenueBonus?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                                                    <td className="p-3 text-right font-bold text-emerald-600">₺{(calc.finalBrandBonus + calc.specialBonus)?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                                                    <td className="p-3 text-right font-bold text-purple-600">₺{calc.milestoneBonus?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>

                                                    <td className="p-2 bg-indigo-50/30">
                                                        <input
                                                            type="text"
                                                            value={pData.techServiceEarn ? pData.techServiceEarn.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : ""}
                                                            onChange={e => {
                                                                const cleanStr = e.target.value.replace(/\./g, '').replace(',', '.');
                                                                handleInputChange(p.id, 'techServiceEarn', parseFloat(cleanStr));
                                                            }}
                                                            className="w-24 p-2 text-center rounded bg-white border border-indigo-100 outline-none focus:border-indigo-500 font-bold text-slate-700 text-sm"
                                                            placeholder="0"
                                                        />
                                                    </td>

                                                    <td className="p-3 text-right font-black text-indigo-600 bg-indigo-50/30">₺{calc.totalBonus?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                                                    <td className="p-3 text-right font-bold text-slate-500">₺{calc.baseSalary?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                                                    <td className="p-3 text-right font-bold text-slate-500">₺{calc.travelAllowance?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>

                                                    <td className="p-3 text-right font-black text-emerald-700 bg-emerald-50/30 text-lg">₺{calc.totalEarnings?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* TABLO 2: DİKEY MARKA VE CEZA MATRİSİ */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex justify-between items-center">
                            <h3 className="font-black text-emerald-800 tracking-tight">2. Marka, Özel Ürün ve Ceza Matrisi <span className="text-xs font-bold text-emerald-600 ml-2">(Manuel giriş içindir)</span></h3>

                            <button
                                onClick={() => setBrandSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                                className="flex items-center gap-1 text-xs font-black bg-emerald-200/50 text-emerald-800 px-4 py-2 rounded-xl hover:bg-emerald-200 transition-colors shadow-sm"
                            >
                                Sıralama: {brandSortOrder === "asc" ? "A'dan Z'ye ⬇️" : "Z'den A'ya ⬆️"}
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-center whitespace-nowrap">
                                <thead className="bg-emerald-800 text-white text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="p-4 sticky left-0 bg-emerald-900 z-10 text-left">Ürün / Marka Listesi</th>
                                        {sortedPersonnels.map(p => (
                                            <th key={p.id} className="p-4 border-l border-emerald-700/50">{p.firstName} {p.lastName}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {/* MARKALAR VE ÖZEL ÜRÜNLER */}
                                    {sortedProductRules.map((pr: any) => (
                                        <tr key={pr.id} className="hover:bg-slate-50/50">
                                            <td className="p-3 sticky left-0 bg-white border-r border-slate-200 z-10 text-left">
                                                <p className="font-black text-slate-800 text-sm">{pr.name}</p>
                                                <p className="font-bold text-emerald-600 text-[10px] uppercase">{pr.calcType === "PERCENTAGE" ? "Satış Tutarı (TL)" : "Satış Adedi"}</p>
                                            </td>
                                            {sortedPersonnels.map(p => {
                                                const pData = inputs[p.id] || {};
                                                return (
                                                    <td key={p.id} className="p-2 border-l border-slate-100">
                                                        <input
                                                            type="text"
                                                            value={pData.productData?.[pr.name] ? pData.productData[pr.name].toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : ""}
                                                            onChange={e => {
                                                                const cleanStr = e.target.value.replace(/\./g, '').replace(',', '.');
                                                                handleInputChange(p.id, 'productData', parseFloat(cleanStr), pr.name);
                                                            }}
                                                            className="w-full min-w-[80px] p-2 text-center rounded bg-slate-50 border border-slate-200 outline-none focus:border-emerald-500 font-bold text-emerald-700 text-sm"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}

                                    {/* CEZALI ÜRÜNLER */}
                                    {sortedPenaltyRules.map((pr: any) => (
                                        <tr key={pr.id} className="hover:bg-red-50/30">
                                            <td className="p-3 sticky left-0 bg-white border-r border-slate-200 z-10 text-left">
                                                <p className="font-black text-red-800 text-sm">{pr.modelName}</p>
                                                <p className="font-bold text-red-500 text-[10px] uppercase">Zorunlu Satış (Adet)</p>
                                            </td>
                                            {sortedPersonnels.map(p => {
                                                const pData = inputs[p.id] || {};
                                                return (
                                                    <td key={p.id} className="p-2 border-l border-slate-100">
                                                        <input
                                                            type="text"
                                                            value={pData.penaltyData?.[pr.modelName] ? pData.penaltyData[pr.modelName].toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : ""}
                                                            onChange={e => {
                                                                const cleanStr = e.target.value.replace(/\./g, '').replace(',', '.');
                                                                handleInputChange(p.id, 'penaltyData', parseFloat(cleanStr), pr.modelName);
                                                            }}
                                                            className="w-full min-w-[80px] p-2 text-center rounded bg-white border border-red-200 outline-none focus:border-red-500 font-bold text-red-700 text-sm"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}