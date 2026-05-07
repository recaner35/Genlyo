"use client";

import { useMemo } from "react";

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

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
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl flex flex-col relative overflow-hidden h-full">
            <h3 className="text-xl font-black mb-2">Personel Dağılımı</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Paylaşıma Hazır Rapor</p>
            
            <div className="flex items-center gap-6 mb-4 flex-1">
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
                            <span className="ml-auto text-indigo-600">%{((p.ownRevenue / (hybridRealizedSales || 1)) * 100).toFixed(1)}</span>
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
    );
}