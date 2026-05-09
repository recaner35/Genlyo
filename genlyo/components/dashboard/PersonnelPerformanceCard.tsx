"use client";

import { useMemo, useState } from "react";

const PIE_COLORS = ["#6366f1", "#f65c7d", "#37abce", "#f59e0b", "#10b981", "#06b6d4"];

export default function PersonnelPerformanceCard({ 
    personnelSales, 
    hybridRealizedSales, 
    realizedPercentage, 
    selectedStoreName 
}: { 
    personnelSales: any[]; 
    hybridRealizedSales: number; 
    realizedPercentage: number; 
    selectedStoreName: string; 
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

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
            const ratio = hybridRealizedSales > 0 ? (p.ownRevenue / hybridRealizedSales) * 100 : 0;
            const name = p.personnel?.firstName || p.firstName; 
            const title = p.personnel?.title?.name || p.title?.name;
            text += `${getAbbreviation(title)} ${name}: ${ratio.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        });
        return text.trim();
    }, [selectedStoreName, realizedPercentage, hybridRealizedSales, personnelSales]);

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(generatedReportText)}`;

    // Pano'ya (Clipboard) Kopyalama İşlemi
    const handleCopyText = async () => {
        try {
            await navigator.clipboard.writeText(generatedReportText);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Kopyalama başarısız", err);
        }
    };
    
    return (
        <>
            <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-[1.5rem] p-5 border border-cyan-100 shadow-sm flex flex-col justify-between h-full relative overflow-hidden group">
                <div>
                    <h3 className="text-base font-black text-cyan-900 mb-1">Personel Dağılımı</h3>
                    <p className="text-[9px] font-bold text-cyan-600/70 uppercase tracking-widest mb-4">Paylaşıma Hazır Rapor</p>
                    
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-14 h-14 flex-shrink-0">
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

                        <div className="flex-1 space-y-1.5 min-w-0">
                            {personnelSales.slice(0, 3).map((p, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                                    <span className="text-cyan-950 truncate">{p.personnel?.firstName || p.firstName}</span>
                                    <span className="ml-auto text-cyan-700">%{((p.ownRevenue / (hybridRealizedSales || 1)) * 100).toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-cyan-200/50">
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="w-full bg-cyan-600 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-cyan-700 transition-all shadow-md active:scale-95"
                    >
                        <span>📱 RAPORU PAYLAŞ</span>
                    </button>
                </div>
            </div>

            {/* 🔥 ŞOV KISMI: ETKİLEŞİMLİ MODAL (POP-UP) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-1.5">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <div className="text-center mb-6">
                            <h3 className="text-lg font-black text-slate-800">Personel Raporu</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Whatsapp & OWA İçin</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-center mb-6">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 object-contain rounded-xl shadow-sm" />
                        </div>

                        <button 
                            onClick={handleCopyText}
                            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${isCopied ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-200'}`}
                        >
                            {isCopied ? (
                                <><span>✅</span> KOPYALANDI!</>
                            ) : (
                                <><span>📝</span> METNİ KOPYALA</>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}