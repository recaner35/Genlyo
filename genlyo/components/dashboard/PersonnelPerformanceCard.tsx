"use client";

import { useMemo } from "react";

const PIE_COLORS = ["#6366f1", "#f65c7d", "#37abce", "#f59e0b", "#10b981", "#06b6d4"];

export default function PersonnelPerformanceCard({ 
    personnelSales, 
    hybridRealizedSales, 
    realizedPercentage, 
    selectedStoreName 
}: { 
    personnelSales: any[], 
    hybridRealizedSales: number, 
    realizedPercentage: number, 
    selectedStoreName: string 
}) {

    const getAbbreviation = (title: string) => {
        if (!title) return "";
        if (title.includes("Satış Danışmanı")) return "SD";
        if (title.includes("Uzman")) return "Uzm";
        if (title.includes("Usta")) return "Usta";
        return title;
    };

    const generatedReportText = useMemo(() => {
    let text = `${selectedStoreName}\nHG: ${realizedPercentage.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nCiro: ${Math.round(hybridRealizedSales).toLocaleString('tr-TR')}\n`;
    
    personnelSales.forEach(p => {
        // Veri yapısı artık düz olduğu için direkt p.ownRevenue ve p.firstName kullanıyoruz
        const ratio = hybridRealizedSales > 0 ? (p.ownRevenue / hybridRealizedSales) * 100 : 0;
        const name = p.personnel?.firstName || p.firstName; // Her iki duruma karşı koruma
        const title = p.personnel?.title?.name || p.title?.name;
        
        text += `${getAbbreviation(title)} ${name}: ${ratio.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    });
    return text.trim();
}, [selectedStoreName, realizedPercentage, hybridRealizedSales, personnelSales]);

    // QR Kod URL'si (iOS/Android Uyumlu)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generatedReportText)}`;
    
    return (
        <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-3xl p-6 border border-cyan-100 shadow-sm flex flex-col h-full relative overflow-hidden">
            <h3 className="text-base font-black text-cyan-900 mb-1">Personel Dağılımı</h3>
            <p className="text-[9px] font-bold text-cyan-600/70 uppercase tracking-widest mb-4">Paylaşıma Hazır Rapor</p>
            
            <div className="flex items-center gap-4 flex-1">
                <div className="relative w-12 h-12 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        {personnelSales.length > 0 ? (
                            personnelSales.map((p, i) => {
                                const total = personnelSales.reduce((acc, curr) => acc + curr.ownRevenue, 0);
                                const percentage = total > 0 ? (p.ownRevenue / total) * 100 : 0;
                                const offset = personnelSales.slice(0, i).reduce((acc, curr) => acc + (curr.ownRevenue / total) * 100, 0);
                                return (
                                    <circle key={i} cx="18" cy="18" r="15.9" fill="transparent" stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth="4"
                                        strokeDasharray={`${percentage} ${100 - percentage}`} strokeDashoffset={-offset} className="transition-all duration-1000 ease-out" />
                                );
                            })
                        ) : (
                            <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#cffafe" strokeWidth="4" />
                        )}
                    </svg>
                </div>

                <div className="flex-1 space-y-1 min-w-0">
                    {personnelSales.slice(0, 3).map((p, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[9px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                            <span className="text-cyan-900 truncate">{p.personnel?.firstName}</span>
                            <span className="ml-auto text-cyan-700">%{((p.ownRevenue / (hybridRealizedSales || 1)) * 100).toFixed(1)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex justify-between items-center pt-3 border-t border-cyan-200/50">
                <p className="text-[8px] font-black text-cyan-700/70 uppercase tracking-widest text-left w-20 leading-tight">Okutup<br/>Kopyala</p>
                <img src={qrCodeUrl} alt="QR Code" className="w-10 h-10 object-contain rounded shadow-sm border border-cyan-100" />
            </div>
        </div>
    );