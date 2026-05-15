"use client";

import { useState } from "react";

export default function ChangePasswordPage() {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    // Basit doğrulama
    if (formData.newPassword !== formData.confirmPassword) {
      setStatus({ type: "error", message: "Yeni şifreler eşleşmiyor!" });
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setStatus({ type: "error", message: "Şifre en az 6 karakter olmalıdır." });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: "success", message: "Şifreniz başarıyla değiştirildi." });
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setStatus({ type: "error", message: data.error || "Bir hata oluştu." });
      }
    } catch (err) {
      setStatus({ type: "error", message: "Sunucu hatası oluştu." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-3xl">🔑</div>
          <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">Güvenlik <span className="text-blue-400">Merkezi</span></h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Hesap Şifrenizi Buradan Güncelleyin</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {status && (
            <div className={`p-4 rounded-xl font-bold text-xs text-center uppercase tracking-wide ${status.type === "success" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"}`}>
              {status.message}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Mevcut Şifre</label>
            <input
              type="password"
              required
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold"
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Yeni Şifre</label>
              <input
                type="password"
                required
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Yeni Şifre (Tekrar)</label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
          >
            {loading ? "GÜNCELLENİYOR..." : "ŞİFREYİ GÜNCELLE"}
          </button>
        </form>
      </div>
    </div>
  );
}
