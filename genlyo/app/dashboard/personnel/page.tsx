"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";

export default function PersonnelManagementPage() {
  // 🚀 KİMLİK VE ROL KONTROLÜ
  const { data: session } = useSession();
  const userRole = session?.user?.role || "STORE_MANAGER"; // Fallback
  const isAdmin = userRole === "ADMIN";
  const isRegionManager = userRole === "REGION_MANAGER";
  const isStoreManager = userRole === "STORE_MANAGER";

  const [personnel, setPersonnel] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "", firstName: "", lastName: "", titleName: "Satış Danışmanı", storeId: "", regionId: "", email: "", password: "", isActive: true
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [titleFilter, setTitleFilter] = useState("ALL");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [resPers, resStores, resRegions] = await Promise.all([
        fetch('/api/personnel', { cache: 'no-store' }), 
        fetch('/api/stores', { cache: 'no-store' }), 
        fetch('/api/regions', { cache: 'no-store' })
      ]);
      
      const p = await resPers.json();
      const s = await resStores.json();
      const r = await resRegions.json();

      setPersonnel(Array.isArray(p) ? p : []);
      
      const fetchedStores = Array.isArray(s) ? s : (s.store ? [s.store] : []);
      setStores(fetchedStores);
      setRegions(Array.isArray(r) ? r : []);

      if (isStoreManager && fetchedStores.length === 1) {
          setStoreFilter(fetchedStores[0].id);
      }

    } catch (err) {
        console.error(err);
    } finally { 
        setLoading(false); 
    }
  };

  const openEditModal = (person: any) => {
    const managedRegion = regions.find(r => r.managerId === person.user?.id);
    setFormData({
      id: person.id, 
      firstName: person.firstName, 
      lastName: person.lastName,
      titleName: person.title?.name || "Satış Danışmanı",
      storeId: person.storeId || "",
      regionId: managedRegion ? managedRegion.id : "",
      email: person.user?.email || "", 
      password: "", 
      isActive: person.isActive
    });
    setIsEditMode(true); setIsModalOpen(true);
  };

  const filteredData = useMemo(() => {
    let result = [...personnel];
    if (searchTerm) {
      const s = searchTerm.toLocaleLowerCase('tr-TR');
      result = result.filter(p => `${p.firstName} ${p.lastName}`.toLocaleLowerCase('tr-TR').includes(s));
    }
    if (titleFilter !== "ALL") result = result.filter(p => p.title?.name === titleFilter);
    if (storeFilter !== "ALL") result = result.filter(p => p.storeId === storeFilter);
    if (regionFilter !== "ALL") {
      result = result.filter(p => {
        const managedRegion = regions.find(r => r.managerId === p.user?.id);
        return p.store?.region?.name === regionFilter || managedRegion?.name === regionFilter;
      });
    }
    return result;
  }, [personnel, searchTerm, titleFilter, storeFilter, regionFilter, regions]);

  const baseTitles = ["Satış Danışmanı", "Uzman", "Usta", "Mağaza Müdürü"];
  const titlesList = isAdmin ? [...baseTitles, "Bölge Müdürü"] : baseTitles;

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="w-12 h-12 border-4 border-t-emerald-600 rounded-full animate-spin"></div></div>;

  return (
    <div className="p-6 md:p-10 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Personel Yönetimi</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Toplam <span className="font-bold text-emerald-600">{filteredData.length}</span> personel.</p>
        </div>
        <button onClick={() => { 
            const defaultStoreId = isStoreManager && stores.length === 1 ? stores[0].id : "";
            setFormData({id:"",firstName:"",lastName:"",titleName:"Satış Danışmanı",storeId: defaultStoreId,regionId:"",email:"",password:"",isActive:true}); 
            setIsEditMode(false); setIsModalOpen(true); 
        }} className="bg-emerald-600 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg hover:bg-emerald-700 transition-all">+ Yeni Personel</button>
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-2 mb-8">
        <div className="relative flex-1">
          <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
          <input type="text" placeholder="İsim ara..." className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-transparent text-sm font-bold outline-none" onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="w-px bg-slate-100 hidden xl:block my-2"></div>
        <select className="px-6 py-3.5 rounded-xl bg-transparent text-sm font-bold text-slate-600 outline-none hover:bg-slate-50" onChange={e => setTitleFilter(e.target.value)}>
          <option value="ALL">Tüm Ünvanlar</option>
          {titlesList.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        
        {!isStoreManager && (
            <>
                <div className="w-px bg-slate-100 hidden xl:block my-2"></div>
                {isAdmin && (
                    <select className="px-6 py-3.5 rounded-xl bg-transparent text-sm font-bold text-slate-600 outline-none hover:bg-slate-50" onChange={e => setRegionFilter(e.target.value)}>
                        <option value="ALL">Tüm Bölgeler</option>
                        {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                )}
            </>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
        {/* YANLIŞ YERDEKİ BUTONU BURADAN SİLDİK */}
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50/80 border-b border-slate-200">
            <tr>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">AD SOYAD</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">ÜNVAN</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">GÖREV YERİ / BÖLGESİ</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">İŞLEM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map(person => {
              const managedRegion = regions.find(r => r.managerId === person.user?.id);
              return (
                <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6 font-black text-slate-800">
                    {person.firstName} {person.lastName}
                    {person.user && <span className="ml-2 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] uppercase">Yetkili</span>}
                  </td>
                  <td className="p-6 font-bold text-emerald-600 text-sm">{person.title?.name}</td>
                  <td className="p-6">
                    {person.title?.name === "Bölge Müdürü" ? (
                      <span className="font-bold text-blue-600 text-sm">📍 {managedRegion?.name || "Bölge Atanmadı"} Bölgesi</span>
                    ) : (
                      <span className="font-medium text-slate-600 text-sm">{person.store?.name || "Merkez / Atanmadı"}</span>
                    )}
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => openEditModal(person)} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:border-emerald-500 hover:text-emerald-600 shadow-sm transition-all">Düzenle</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredData.length === 0 && (
           <div className="py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">Arama kriterinize uygun personel bulunamadı.</div>
        )}
      </div>

      {/* 🚀 SAĞDAN AÇILAN ÇEKMECE (DRAWER) VE KAPATMA BUTONU */}
      {isModalOpen && (
        <>
          {/* Karartılmış Arka Plan (Tıklayınca da Kapanır) */}
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] transition-opacity" onClick={() => setIsModalOpen(false)} />
          
          {/* Sağ Çekmece */}
          <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-[110] p-6 md:p-10 overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl">
            
            {/* 🚀 DOĞRU YERDEKİ ÇARPI (X) BUTONU */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 md:top-8 md:right-8 w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 rounded-full transition-all z-50 shadow-sm"
              title="Vazgeç ve Kapat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-black mb-8 pr-12">{isEditMode ? "Personeli Düzenle" : "Yeni Personel Kaydı"}</h2>
            
            <form className="space-y-6" onSubmit={async (e) => {
              e.preventDefault();
              const url = isEditMode ? `/api/personnel/${formData.id}` : '/api/personnel';
              const res = await fetch(url, { method: isEditMode ? 'PATCH' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(formData) });
              if(res.ok) { setIsModalOpen(false); fetchInitialData(); } else { const d = await res.json(); alert(d.error); }
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Ad" value={formData.firstName} className="p-4 bg-slate-50 rounded-xl font-bold border border-slate-200 outline-none focus:border-emerald-500 focus:bg-white transition-colors" onChange={e => setFormData({...formData, firstName: e.target.value})} required />
                <input type="text" placeholder="Soyad" value={formData.lastName} className="p-4 bg-slate-50 rounded-xl font-bold border border-slate-200 outline-none focus:border-emerald-500 focus:bg-white transition-colors" onChange={e => setFormData({...formData, lastName: e.target.value})} required />
              </div>
              
              <select value={formData.titleName} className="w-full p-4 bg-emerald-50 rounded-xl font-bold border border-emerald-100 text-emerald-700 outline-none focus:border-emerald-500 transition-colors" onChange={e => setFormData({...formData, titleName: e.target.value})}>
                {titlesList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              
              {formData.titleName === "Bölge Müdürü" ? (
                <select value={formData.regionId} className="w-full p-4 bg-blue-50 rounded-xl font-bold border border-blue-100 text-blue-700 outline-none focus:border-blue-500 transition-colors" onChange={e => setFormData({...formData, regionId: e.target.value})}>
                  <option value="">Bölge Seçin...</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              ) : (
                <select 
                  value={formData.storeId} 
                  disabled={isStoreManager} 
                  className={`w-full p-4 rounded-xl font-bold border outline-none transition-colors ${isStoreManager ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 focus:border-emerald-500 focus:bg-white'}`} 
                  onChange={e => setFormData({...formData, storeId: e.target.value})}
                >
                  <option value="">Mağaza Seçin...</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}

              {formData.titleName === "Bölge Müdürü" && isAdmin && (
                <input type="email" placeholder="E-posta (Sistem Girişi İçin)" value={formData.email} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-emerald-500 transition-colors" onChange={e => setFormData({...formData, email: e.target.value})} required />
              )}
              
              <div className="pt-4">
                 <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-emerald-600 transition-all shadow-lg hover:shadow-emerald-200">
                    {isEditMode ? "Değişiklikleri Kaydet" : "Sisteme Ekle"}
                 </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}