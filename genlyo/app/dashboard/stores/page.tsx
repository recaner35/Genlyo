"use client";

import { useEffect, useState, useMemo } from "react";

export default function StoresManagementPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [allRegions, setAllRegions] = useState<any[]>([]);
  const [allPersonnel, setAllPersonnel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [newStoreData, setNewStoreData] = useState({
    name: "", code: "", category: "A+", email: "", regionId: "", channelName: "", staff: [] as any[]
  });

  const [editStoreData, setEditStoreData] = useState({
    id: "", name: "", code: "", category: "A+", email: "", regionId: "", channelName: "", staff: [] as any[]
  });

  const [personnelSearch, setPersonnelSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [bulkRegionMenuOpen, setBulkRegionMenuOpen] = useState(false);
  const [bulkCategoryMenuOpen, setBulkCategoryMenuOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // 🚀 FİLTRE VE SIRALAMA STATE'LERİ (Kategori Eklendi)
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL"); // YENİ EKLENDİ
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'name', direction: 'asc' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resStores, resRegions, resPersonnel] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/regions'),
        fetch('/api/personnel')
      ]);

      const storesData = await resStores.json();
      const regionsData = await resRegions.json();
      const personnelData = await resPersonnel.json();

      if (storesData.error) throw new Error(`Mağaza Hatası: ${storesData.error}`);

      setStores(Array.isArray(storesData) ? storesData : []);
      setAllRegions(Array.isArray(regionsData) ? regionsData : []);
      setAllPersonnel(Array.isArray(personnelData) ? personnelData : []);
    } catch (err: any) {
      setError(err.message || "Bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // 🚀 DÜZELTME: Düzenle Butonu Hatası (Güvenli Veri Çekimi)
  const openEditPanel = async (id: string) => {
    try {
      const res = await fetch(`/api/stores/${id}`);
      const data = await res.json();
      
      // API 'store' objesi dönebilir veya direkt kendisini dönebilir
      const st = data.store || data; 
      
      if (res.ok && st && st.id) {
        setEditStoreData({
          id: st.id,
          name: st.name || "",
          code: st.code || "",
          category: st.category || "A+",
          email: st.email || "",
          regionId: st.regionId || "",
          channelName: st.region?.channel?.name || "",
          staff: st.personnelHistory?.map((h: any) => ({
             id: h.personnel?.id || `temp-${Math.random()}`,
             firstName: h.personnel?.firstName || "",
             lastName: h.personnel?.lastName || "",
             titleName: h.personnel?.title?.name || "Satış Danışmanı",
             isTransfer: false
          })) || []
        });
        setSelectedStoreId(id);
      } else {
        alert(data.error || "Detaylar yüklenemedi. API formatını kontrol edin.");
      }
    } catch (err) { 
      console.error(err);
      alert("Bağlantı hatası oluştu."); 
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/stores/${editStoreData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editStoreData)
      });
      if (res.ok) {
        setSelectedStoreId(null);
        fetchInitialData();
      } else alert("Güncelleme başarısız.");
    } catch (err) { alert("Hata oluştu."); }
  };

  // 🚀 TOPLU İŞLEM MOTORU (Hata yakalama güçlendirildi)
  const executeBulkAction = async (field: string, value: any) => {
    setIsBulkUpdating(true);
    try {
      const promises = selectedIds.map(async (id) => {
        let body: any = {};
        if (field === 'STATUS') body = { isActive: value };
        if (field === 'REGION') body = { regionId: value };
        if (field === 'CATEGORY') body = { category: value };
        
        const response = await fetch(`/api/stores/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error("API PATCH isteğini reddetti.");
        return response;
      });

      await Promise.all(promises);
      
      setSelectedIds([]);
      setBulkRegionMenuOpen(false);
      setBulkCategoryMenuOpen(false);
      fetchInitialData();
    } catch (err) {
      console.error(err);
      alert("Toplu işlem hatası! Lütfen /api/stores/[id] route'unun PATCH desteklediğinden emin olun.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // 🚀 DÜZELTME: TypeScript "Type is not assignable" Hataları Çözüldü
  const handleStaffAction = (action: string, isEditMode: boolean, payload?: any) => {
    if (isEditMode) {
      if (action === 'ADD') {
        const tempId = `new-${Date.now()}`;
        setEditStoreData({ ...editStoreData, staff: [...editStoreData.staff, { id: tempId, firstName: "", lastName: "", titleName: "Satış Danışmanı", isTransfer: false }] });
      } else if (action === 'TRANSFER') {
        if (editStoreData.staff.find(s => s.id === payload.id)) return;
        setEditStoreData({ ...editStoreData, staff: [...editStoreData.staff, { ...payload, titleName: payload.title?.name || "Satış Danışmanı", isTransfer: true }] });
        setIsSearchOpen(false);
        setPersonnelSearch("");
      } else if (action === 'REMOVE') {
        setEditStoreData({ ...editStoreData, staff: editStoreData.staff.filter(s => s.id !== payload) });
      }
    } else {
      if (action === 'ADD') {
        const tempId = `new-${Date.now()}`;
        setNewStoreData({ ...newStoreData, staff: [...newStoreData.staff, { id: tempId, firstName: "", lastName: "", titleName: "Satış Danışmanı", isTransfer: false }] });
      } else if (action === 'TRANSFER') {
        if (newStoreData.staff.find(s => s.id === payload.id)) return;
        setNewStoreData({ ...newStoreData, staff: [...newStoreData.staff, { ...payload, titleName: payload.title?.name || "Satış Danışmanı", isTransfer: true }] });
        setIsSearchOpen(false);
        setPersonnelSearch("");
      } else if (action === 'REMOVE') {
        setNewStoreData({ ...newStoreData, staff: newStoreData.staff.filter(s => s.id !== payload) });
      }
    }
  };

  const uniqueChannels = Array.from(new Set(allRegions.map(r => r.channel?.name))).filter(Boolean);
  
  const availableRegions = useMemo(() => {
    let filtered = stores;
    if (channelFilter !== "ALL") {
      filtered = stores.filter(s => s.region?.channel?.name === channelFilter);
    }
    return Array.from(new Set(filtered.map(s => s.region?.name))).filter(Boolean);
  }, [stores, channelFilter]);

  const filteredAndSortedStores = useMemo(() => {
    if (!Array.isArray(stores)) return [];
    
    let result = [...stores];
    
    if (searchTerm) {
      const s = searchTerm.toLocaleLowerCase('tr-TR');
      result = result.filter(st => 
        st.name?.toLocaleLowerCase('tr-TR').includes(s) || 
        st.code?.toLocaleLowerCase('tr-TR').includes(s)
      );
    }
    if (channelFilter !== "ALL") {
      result = result.filter(st => st.region?.channel?.name === channelFilter);
    }
    if (regionFilter !== "ALL") {
      result = result.filter(st => st.region?.name === regionFilter);
    }
    // 🚀 KATEGORİ FİLTRESİ UYGULANDI
    if (categoryFilter !== "ALL") {
      result = result.filter(st => st.category === categoryFilter);
    }
    if (statusFilter !== "ALL") {
      result = result.filter(st => statusFilter === "ACTIVE" ? st.isActive : !st.isActive);
    }
    
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key] || "";
        let bVal = b[sortConfig.key] || "";
        if (sortConfig.key === 'city') { aVal = a.city?.name || ""; bVal = b.city?.name || ""; }
        if (sortConfig.key === 'manager') { aVal = a.region?.manager?.name || ""; bVal = b.region?.manager?.name || ""; }
        if (sortConfig.key === 'category') { aVal = a.category || ""; bVal = b.category || ""; }
        return sortConfig.direction === 'asc' 
          ? String(aVal).localeCompare(String(bVal), 'tr-TR', { sensitivity: 'base' })
          : String(bVal).localeCompare(String(aVal), 'tr-TR', { sensitivity: 'base' });
      });
    }
    return result;
  }, [stores, searchTerm, channelFilter, regionFilter, categoryFilter, statusFilter, sortConfig]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="text-sm font-bold text-slate-400 tracking-[0.3em]">GENLYO YÜKLENİYOR</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-10 min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white p-10 rounded-3xl border border-red-100 max-w-xl w-full text-center shadow-2xl">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">!</div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Sistem Uyarısı</h2>
        <p className="text-slate-500 mb-8">{error}</p>
        <button onClick={fetchInitialData} className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-600 transition-all">Sistemi Yeniden Başlat</button>
      </div>
    </div>
  );

  const categories = ["A+", "A", "B", "C", "D", "E"];
  const isAllSelected = filteredAndSortedStores.length > 0 && selectedIds.length === filteredAndSortedStores.length;

  return (
    <div className="p-6 md:p-10 bg-slate-50/50 min-h-screen font-sans relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Mağaza Organizasyonu</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Toplam <span className="font-bold text-blue-600">{filteredAndSortedStores.length}</span> kayıt listeleniyor.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Yeni Kayıt Oluştur
        </button>
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-2 mb-8 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
          <input 
            type="text" placeholder="İsim veya kod ara..." 
            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-transparent text-sm font-medium text-slate-700 outline-none focus:bg-slate-50 transition-colors"
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="w-px bg-slate-100 hidden xl:block my-2"></div>
        <select 
          className="px-6 py-3.5 rounded-xl bg-slate-50 border border-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer focus:border-blue-200 transition-colors" 
          value={channelFilter}
          onChange={e => { setChannelFilter(e.target.value); setRegionFilter("ALL"); }}
        >
          <option value="ALL">Tüm Kanallar</option>
          {uniqueChannels.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
        </select>
        
        <div className="w-px bg-slate-100 hidden xl:block my-2"></div>
        <select 
          className="px-6 py-3.5 rounded-xl bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-50 transition-colors" 
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          disabled={availableRegions.length === 0}
        >
          <option value="ALL">Tüm Bölgeler</option>
          {availableRegions.map(r => <option key={r as string} value={r as string}>{r as string}</option>)}
        </select>

        {/* 🚀 KATEGORİ FİLTRESİ UI */}
        <div className="w-px bg-slate-100 hidden xl:block my-2"></div>
        <select 
          className="px-6 py-3.5 rounded-xl bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-50 transition-colors" 
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="ALL">Tüm Kategoriler</option>
          {categories.map(c => <option key={c} value={c}>Kategori {c}</option>)}
        </select>

        <div className="w-px bg-slate-100 hidden xl:block my-2"></div>
        <select className="px-6 py-3.5 rounded-xl bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-50 transition-colors" onChange={e => setStatusFilter(e.target.value)}>
          <option value="ALL">Tüm Durumlar</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Pasif</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-24">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="p-5 w-14 text-center">
                  <div className="flex items-center justify-center">
                    <input type="checkbox" checked={isAllSelected} onChange={(e) => setSelectedIds(e.target.checked ? filteredAndSortedStores.map(s => s.id) : [])} className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                  </div>
                </th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSortConfig({key: 'code', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>KOD</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSortConfig({key: 'name', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>BİLGİ</th>
                {/* 🚀 KATEGORİ SIRALAMASI EKLENDİ */}
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSortConfig({key: 'category', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>KATEGORİ</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSortConfig({key: 'city', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>KANAL & BÖLGE</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSortConfig({key: 'manager', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>YÖNETİCİ</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">DURUM</th>
                <th className="p-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">İŞLEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedStores.map(store => (
                <tr key={store.id} className={`transition-colors group ${selectedIds.includes(store.id) ? 'bg-blue-50/60' : 'hover:bg-slate-50/50'}`}>
                  <td className="p-5 text-center">
                    <div className="flex items-center justify-center">
                      <input type="checkbox" checked={selectedIds.includes(store.id)} onChange={() => toggleSelect(store.id)} className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                    </div>
                  </td>
                  <td className="p-5 font-mono text-sm font-medium text-slate-400">{store.code || "-"}</td>
                  <td className="p-5">
                    <span className="font-bold text-slate-800 block text-sm">{store.name}</span>
                    <span className="text-xs text-slate-400 font-medium">{store.city?.name || "Lokasyon Yok"}</span>
                  </td>
                  <td className="p-5">
                    <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs">{store.category || "STD"}</span>
                  </td>
                  <td className="p-5">
                    <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-600 font-bold text-[10px] mb-1 uppercase tracking-wider">
                      {store.region?.channel?.name || "Kanal Yok"}
                    </span>
                    <span className="block text-sm font-bold text-blue-600">{store.region?.name || "Bölge Yok"}</span>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600">
                        {store.region?.manager?.name ? store.region.manager.name[0] : "-"}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{store.region?.manager?.name || "Atanmadı"}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    {store.isActive ? (
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif</span>
                    ) : (
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-100"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Pasif</span>
                    )}
                  </td>
                  <td className="p-5 text-right">
                    <button onClick={() => openEditPanel(store.id)} className="bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-xs hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm">Düzenle</button>
                  </td>
                </tr>
              ))}
              {filteredAndSortedStores.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-16 text-center text-slate-400 font-medium">Seçili kriterlere uygun mağaza bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOPLU İŞLEM BARI */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 text-white px-6 py-4 rounded-3xl shadow-2xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-10 duration-300">
          <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
              {isBulkUpdating ? "..." : selectedIds.length}
            </div>
            <span className="text-sm font-bold text-slate-200 tracking-wide">Kayıt Seçildi</span>
          </div>
          <div className="flex items-center gap-2">
            
            <div className="relative">
              <button onClick={() => { setBulkRegionMenuOpen(!bulkRegionMenuOpen); setBulkCategoryMenuOpen(false); }} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                Bölge Aktar
              </button>
              {bulkRegionMenuOpen && (
                <div className="absolute bottom-full mb-3 left-0 w-64 bg-white rounded-2xl shadow-2xl p-4 border border-slate-200 text-slate-800 z-[60]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Yeni Bölge Seçin</p>
                  <select onChange={(e) => executeBulkAction('REGION', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none">
                    <option value="">Seçim Yapın...</option>
                    {allRegions.map(r => <option key={r.id} value={r.id}>{r.name} ({r.channel?.name})</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => { setBulkCategoryMenuOpen(!bulkCategoryMenuOpen); setBulkRegionMenuOpen(false); }} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                Kategori Seç
              </button>
              {bulkCategoryMenuOpen && (
                <div className="absolute bottom-full mb-3 left-0 w-48 bg-white rounded-2xl shadow-2xl p-4 border border-slate-200 text-slate-800 z-[60]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kategori Atayın</p>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map(c => (
                      <button key={c} onClick={() => executeBulkAction('CATEGORY', c)} className="p-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-xs font-bold border border-slate-200 transition-all">{c}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => executeBulkAction('STATUS', true)} className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 transition-colors">Aktife Al</button>
            <button onClick={() => executeBulkAction('STATUS', false)} className="px-4 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors">Pasife Al</button>
            
            <button onClick={() => { setSelectedIds([]); setBulkCategoryMenuOpen(false); setBulkRegionMenuOpen(false); }} className="ml-2 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">✕</button>
          </div>
        </div>
      )}

      {/* YENİ MAĞAZA MODALI */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="fixed inset-4 md:inset-10 flex items-center justify-center z-[110]">
            <div className="bg-white w-full max-w-5xl h-[90vh] md:h-auto md:max-h-[90vh] rounded-3xl shadow-2xl p-8 md:p-12 overflow-y-auto animate-in zoom-in-95 border border-slate-100">
              
              <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Yeni Mağaza Kurulumu</h2>
                  <p className="text-slate-500 text-sm mt-1">Sisteme yeni bir lokasyon ve kadro tanımlayın.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-500 transition-colors">✕</button>
              </div>

              <form className="space-y-10" onSubmit={(e) => { e.preventDefault(); alert("Kaydetme işlemi tetiklenecek!"); setIsModalOpen(false); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kısa Kod</label>
                    <input type="text" value={newStoreData.code} onChange={e => setNewStoreData({...newStoreData, code: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Örn: M.105" required />
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mağaza / Tesis Adı</label>
                    <input type="text" value={newStoreData.name} onChange={e => setNewStoreData({...newStoreData, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Örn: Bolu Highway" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bağlı Kanal</label>
                    <select value={newStoreData.channelName} onChange={e => setNewStoreData({...newStoreData, channelName: e.target.value, regionId: ""})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" required>
                      <option value="">Kanal Seçiniz...</option>
                      {uniqueChannels.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bölge Ataması</label>
                    <select value={newStoreData.regionId} onChange={e => setNewStoreData({...newStoreData, regionId: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" required disabled={!newStoreData.channelName}>
                      <option value="">Bölge Seçiniz...</option>
                      {allRegions.filter(r => r.channel?.name?.toLocaleLowerCase('tr-TR') === newStoreData.channelName?.toLocaleLowerCase('tr-TR')).map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.manager?.name || 'Müdür Yok'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kurumsal E-Posta</label>
                    <input type="email" value={newStoreData.email} onChange={e => setNewStoreData({...newStoreData, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="ornek@saatvesaat.com" required />
                  </div>
                  {newStoreData.channelName?.toLocaleLowerCase('tr-TR').includes("mağaza") && (
                    <div className="space-y-2 lg:col-span-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori</label>
                      <select value={newStoreData.category} onChange={e => setNewStoreData({...newStoreData, category: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">Kadro Yapılandırması</h3>
                      <p className="text-slate-500 text-xs">Mevcut personelleri transfer edin veya sıfırdan ekleyin.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="relative">
                        <button type="button" onClick={() => setIsSearchOpen(!isSearchOpen)} className="bg-white border border-slate-200 hover:border-blue-500 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm">⇄ Personel Transfer Et</button>
                        {isSearchOpen && (
                          <div className="absolute top-12 right-0 w-80 bg-white rounded-2xl shadow-xl p-3 text-slate-800 z-50 border border-slate-100">
                            <input autoFocus type="text" placeholder="İsim veya mağaza ara..." className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none mb-2 focus:border-blue-500" onChange={(e) => setPersonnelSearch(e.target.value)} />
                            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                              {allPersonnel.filter(p => `${p.firstName} ${p.lastName} ${p.store?.name}`.toLowerCase().includes(personnelSearch.toLowerCase())).slice(0, 5).map(p => (
                                <div key={p.id} onClick={() => handleStaffAction('TRANSFER', false, p)} className="p-3 hover:bg-blue-50 rounded-xl cursor-pointer transition-all border border-transparent">
                                  <p className="text-sm font-bold text-slate-800">{p.firstName} {p.lastName}</p>
                                  <p className="text-xs text-slate-500">{p.title?.name} • {p.store?.name || 'Mağazasız'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => handleStaffAction('ADD', false)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-blue-100">+ Yeni Personel Ekle</button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {newStoreData.staff.map((s) => (
                      <div key={s.id} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${s.isTransfer ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>{s.isTransfer ? '⇄' : '👤'}</div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input type="text" placeholder="Ad" value={s.firstName} onChange={(e) => { s.firstName = e.target.value; setNewStoreData({...newStoreData}); }} className="bg-transparent border-b border-slate-200 outline-none text-sm font-bold p-1 focus:border-blue-500" disabled={s.isTransfer} />
                          <input type="text" placeholder="Soyad" value={s.lastName} onChange={(e) => { s.lastName = e.target.value; setNewStoreData({...newStoreData}); }} className="bg-transparent border-b border-slate-200 outline-none text-sm font-bold p-1 focus:border-blue-500" disabled={s.isTransfer} />
                          <select value={s.titleName} onChange={(e) => { s.titleName = e.target.value; setNewStoreData({...newStoreData}); }} className="bg-transparent border-b border-slate-200 outline-none text-xs font-bold text-blue-600">
                            <option value="Mağaza Müdürü">Mağaza Müdürü</option><option value="Satış Danışmanı">Satış Danışmanı</option><option value="Uzman">Uzman</option><option value="Usta">Usta</option>
                          </select>
                        </div>
                        {s.isTransfer && (
                          <div className="hidden md:block px-4 border-l border-slate-100">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Eski Mağaza</p>
                            <p className="text-xs font-bold text-blue-600">{s.store?.name || "Merkez"}</p>
                          </div>
                        )}
                        <button type="button" onClick={() => handleStaffAction('REMOVE', false, s.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2">✕</button>
                      </div>
                    ))}
                    {newStoreData.staff.length === 0 && (
                      <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl"><p className="text-slate-400 font-medium text-sm">Kadro henüz planlanmadı.</p></div>
                    )}
                  </div>
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-600 transition-all text-sm tracking-wide">Tesis Verilerini Kaydet</button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* DÜZENLEME PANELİ (MODAL) */}
      {selectedStoreId && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] animate-in fade-in" onClick={() => setSelectedStoreId(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white z-[110] shadow-2xl p-8 md:p-12 overflow-y-auto animate-in slide-in-from-right border-l border-slate-200">
             
             <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-6">
               <div>
                 <h2 className="text-2xl font-black text-slate-800">Mağaza Konfigürasyonu</h2>
                 <p className="text-slate-500 text-sm mt-1">Seçili tesisin operasyonel verilerini güncelleyin.</p>
               </div>
               <button onClick={() => setSelectedStoreId(null)} className="w-10 h-10 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center text-slate-500 transition-colors">✕</button>
            </div>
            
            <form className="space-y-10" onSubmit={handleEditSubmit}>
                
                {/* 🚀 DÜZELTME: Kısa Kod alanı da Kilitlendi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kısa Kod <span className="text-[10px] text-red-400 normal-case">(Kilitli)</span></label>
                    <input type="text" value={editStoreData.code} disabled className="w-full p-4 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-slate-400 outline-none cursor-not-allowed" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mağaza / Tesis Adı <span className="text-[10px] text-red-400 normal-case">(Kilitli)</span></label>
                    <input type="text" value={editStoreData.name} disabled className="w-full p-4 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-400 outline-none cursor-not-allowed" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bağlı Kanal</label>
                    <select value={editStoreData.channelName} onChange={e => setEditStoreData({...editStoreData, channelName: e.target.value, regionId: ""})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-blue-500 transition-all" required>
                      <option value="">Kanal Seçiniz...</option>
                      {uniqueChannels.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bölge Ataması</label>
                    <select value={editStoreData.regionId} onChange={e => setEditStoreData({...editStoreData, regionId: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-blue-500 transition-all" required disabled={!editStoreData.channelName}>
                      <option value="">Bölge Seçiniz...</option>
                      {allRegions.filter(r => r.channel?.name?.toLocaleLowerCase('tr-TR') === editStoreData.channelName?.toLocaleLowerCase('tr-TR')).map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.manager?.name || 'Müdür Yok'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kurumsal E-Posta</label>
                    <input type="email" value={editStoreData.email} onChange={e => setEditStoreData({...editStoreData, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-blue-500 transition-all" />
                  </div>

                  {editStoreData.channelName?.toLocaleLowerCase('tr-TR').includes("mağaza") && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori</label>
                      <select value={editStoreData.category} onChange={e => setEditStoreData({...editStoreData, category: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-blue-600 outline-none focus:border-blue-500 transition-all">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">Mevcut Kadro</h3>
                    </div>
                    <div className="flex gap-3">
                       <div className="relative">
                        <button type="button" onClick={() => setIsSearchOpen(!isSearchOpen)} className="bg-white border border-slate-200 hover:border-blue-500 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm">⇄ Transfer Et</button>
                        {isSearchOpen && (
                          <div className="absolute top-12 right-0 w-80 bg-white rounded-2xl shadow-xl p-3 text-slate-800 z-50 border border-slate-100">
                            <input autoFocus type="text" placeholder="İsim ara..." className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none mb-2 focus:border-blue-500" onChange={(e) => setPersonnelSearch(e.target.value)} />
                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {allPersonnel.filter(p => `${p.firstName} ${p.lastName} ${p.store?.name}`.toLowerCase().includes(personnelSearch.toLowerCase())).slice(0, 5).map(p => (
                                <div key={p.id} onClick={() => handleStaffAction('TRANSFER', true, p)} className="p-3 hover:bg-blue-50 rounded-xl cursor-pointer transition-all border border-transparent">
                                  <p className="text-sm font-bold text-slate-800">{p.firstName} {p.lastName}</p>
                                  <p className="text-xs text-slate-500">{p.title?.name} • {p.store?.name || 'Mağazasız'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => handleStaffAction('ADD', true)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-blue-100">+ Ekle</button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {editStoreData.staff.map((s) => (
                      <div key={s.id} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${s.isTransfer ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>{s.isTransfer ? '⇄' : '👤'}</div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input type="text" placeholder="Ad" value={s.firstName} onChange={(e) => { s.firstName = e.target.value; setEditStoreData({...editStoreData}); }} className="bg-transparent border-b border-slate-200 outline-none text-sm font-bold p-1 focus:border-blue-500" disabled={s.isTransfer && !s.id.toString().includes('new')} />
                          <input type="text" placeholder="Soyad" value={s.lastName} onChange={(e) => { s.lastName = e.target.value; setEditStoreData({...editStoreData}); }} className="bg-transparent border-b border-slate-200 outline-none text-sm font-bold p-1 focus:border-blue-500" disabled={s.isTransfer && !s.id.toString().includes('new')} />
                          <select value={s.titleName} onChange={(e) => { s.titleName = e.target.value; setEditStoreData({...editStoreData}); }} className="bg-transparent border-b border-slate-200 outline-none text-xs font-bold text-blue-600">
                            <option value="Mağaza Müdürü">Mağaza Müdürü</option><option value="Satış Danışmanı">Satış Danışmanı</option><option value="Uzman">Uzman</option><option value="Usta">Usta</option>
                          </select>
                        </div>
                        <button type="button" onClick={() => handleStaffAction('REMOVE', true, s.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2">✕</button>
                      </div>
                    ))}
                    {editStoreData.staff.length === 0 && <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl"><p className="text-slate-400 font-medium text-sm">Mevcut personel yok.</p></div>}
                  </div>
                </div>

               <div className="pt-4">
                 <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-600 transition-all tracking-wide">
                    Sistem Verilerini Senkronize Et
                 </button>
               </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}