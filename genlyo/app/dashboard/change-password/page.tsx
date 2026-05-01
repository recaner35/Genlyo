export default function ChangePasswordPage() {
  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-100 mt-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Şifre Değiştir</h1>
        <p className="text-slate-500 text-sm mb-6">
          Güvenliğiniz için lütfen yeni şifrenizi belirleyin.
        </p>
        {/* Form Alanları (Altyapısı bir sonraki adımda kurulacak) */}
        <div className="space-y-4">
          <input type="password" placeholder="Mevcut Şifre" className="w-full px-4 py-3 rounded-lg border border-slate-300 outline-none" disabled />
          <input type="password" placeholder="Yeni Şifre" className="w-full px-4 py-3 rounded-lg border border-slate-300 outline-none" disabled />
          <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg opacity-50 cursor-not-allowed">
            Şifreyi Güncelle (Yakında)
          </button>
        </div>
      </div>
    </div>
  );
}