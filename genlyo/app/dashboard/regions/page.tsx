"use client";

import { useEffect, useState, useMemo } from "react";

export default function RegionsManagementPage() {
  const [regions, setRegions] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [allStores, setAllStores] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [newRegionData, setNewRegionData] = useState({ name: "", channelId: "", managerId: "" });
  
  const [editRegionData, setEditRegionData] = useState({
    id: "", name: "", channelId: "", managerId: "", stores: [] as any[]
  });

  const [storeSearch, setStoreSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'name', direction: 'asc' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [resReg, resChan, resPers, resStores] = await Promise.all([
        fetch('/api/regions'), fetch('/api/channels'), fetch('/api/personnel'), fetch('/api/stores')
      ]);

      setRegions(await resReg.json());
      setChannels(await resChan.json());
      setPersonnel(await resPers.json());
      
      const storesData = await resStores.json();
      setAllStores(Array.isArray(storesData) ? storesData : (storesData.store ? [storesData.store] : []));
    } catch (err: any) {
      setError("Bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRegionData)
      });
      if (res.ok) {
        setIsNewModalOpen(false);
        fetchInitialData();
      } else alert("Kayıt başarısız.");
    } catch (err) { alert("Hata oluştu."); }
  };

  const openEditPanel = (region: any) => {
    setEditRegionData({
      id: region.id,
      name: region.name,
      channelId: region.channelId || "",
      managerId: region.managerId || "", // Burası veritabanındaki User ID'dir
      stores: region.stores?.map((s: any) => ({ ...s, isTransfer: false })) || []
    });
    setIsEditPanelOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/regions/${editRegionData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editRegionData)
      });
      if (res.ok) {
        setIsEditPanelOpen(false);
        fetchInitialData();
      } else alert("Güncelleme başarısız.");
    } catch (err) { alert("Hata oluştu."); }
  };

  const executeDelete = async (idToProcess?: string) => {
    const idsToDelete = idToProcess ? [idToProcess] : selectedIds;
    if (!confirm(`${idsToDelete.length} adet bölgeyi silmek istediğinize emin misiniz?`)) return;

    try {
      await Promise.all(idsToDelete.map(id => fetch(`/api/regions/${id}`, { method: 'DELETE' })));
      setSelectedIds([]);
      fetchInitialData();
    } catch (err) { alert("Hata oluştu."); }
  };

  const handleStoreAction = (action: string, payload?: any) => {
    if (action === 'TRANSFER') {
      if (editRegionData.stores.find(s => s.id === payload.id)) return;
      setEditRegionData({ ...editRegionData, stores: [...editRegionData.stores, { ...payload, isTransfer: true }] });
      setIsSearchOpen(false);
      setStoreSearch("");
    } else if (action === 'REMOVE') {
      setEditRegionData({ ...editRegionData, stores: editRegionData.stores.filter(s => s.id !== payload) });
    }
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const filteredRegions = useMemo(() => {
    if (!Array.isArray(regions)) return [];
    let result = [...regions];
    if (searchTerm) result = result.filter(r => r.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (channelFilter !== "ALL") result = result.filter(r => r.channel?.name === channelFilter);
    return result;
  }, [regions, searchTerm, channelFilter]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  return (
    <div className="p-6 md:p-10 bg-slate-50/50 min-h-screen font-sans relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Bölge Yönetimi</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Toplam <span className="font-bold text-indigo-600">{filteredRegions.length}</span> bölge listeleniyor.</p>
        </div>
        <button onClick={() => setIsNewModalOpen(true)} className="bg-indigo-600 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
          + Yeni Bölge Kur
        </button>
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-2 mb-8">
        <div className="relative flex-1">
          <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
          <input type="text" placeholder="Bölge ara..." className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-transparent text-sm font-medium outline-none focus:bg-slate-50 transition-colors" onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="w-px bg-slate-100 hidden xl:block my-2"></div>
        <select className="px-6 py-3.5 rounded-xl bg-slate-50 border border-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer focus:border-indigo-200" value={channelFilter} onChange={e => setChannelFilter(e.target.value)}>
          <option value="ALL">Tüm Kanallar</option>
          {channels.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-24">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/80 border-b border-slate-200">
            <tr>
              <th className="p-5 w-14 text-center"><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? filteredRegions.map(r => r.id) : [])} className="rounded border-slate-300 text-indigo-600" /></th>
              <th className="p-5 text-xs font-bold text-slate-500 uppercase">BÖLGE ADI</th>
              <th className="p-5 text-xs font-bold text-slate-500 uppercase">KANAL</th>
              <th className="p-5 text-xs font-bold text-slate-500 uppercase">BÖLGE MÜDÜRÜ</th>
              <th className="p-5 text-xs font-bold text-slate-500 uppercase">MAĞAZA SAYISI</th>
              <th className="p-5 text-right text-xs font-bold text-slate-500 uppercase">İŞLEM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRegions.map(region => (
              <tr key={region.id} className="hover:bg-slate-50/50">
                <td className="p-5 text-center"><input type="checkbox" checked={selectedIds.includes(region.id)} onChange={() => toggleSelect(region.id)} className="rounded border-slate-300 text-indigo-600" /></td>
                <td className="p-5 font-black text-slate-800 text-base">{region.name}</td>
                <td className="p-5"><span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs uppercase">{region.channel?.name || "-"}</span></td>
                <td className="p-5 font-medium text-slate-700">{region.manager?.name || region.manager?.firstName || "Atanmadı"}</td>
                <td className="p-5 font-bold text-indigo-600">{region.stores?.length || 0} Tesis</td>
                <td className="p-5 text-right">
                  <button onClick={() => openEditPanel(region)} className="bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-xs hover:border-indigo-500 hover:text-indigo-600 shadow-sm mr-2">Düzenle</button>
                  <button onClick={() => executeDelete(region.id)} className="bg-white border border-red-100 text-red-500 font-semibold px-4 py-2 rounded-xl text-xs hover:bg-red-50 shadow-sm">Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isNewModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" onClick={() => setIsNewModalOpen(false)} />
          <div className="fixed inset-4 md:inset-10 flex items-center justify-center z-[110]">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                <h2 className="text-2xl font-black text-slate-800">Yeni Bölge Kur</h2>
                <button onClick={() => setIsNewModalOpen(false)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-500">✕</button>
              </div>
              <form className="space-y-6" onSubmit={handleNewSubmit}>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Bölge Adı</label>
                  <input type="text" value={newRegionData.name} onChange={e => setNewRegionData({...newRegionData, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Bağlı Kanal</label>
                  <select value={newRegionData.channelId} onChange={e => setNewRegionData({...newRegionData, channelId: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-indigo-500" required>
                    <option value="">Seçiniz...</option>
                    {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Bölge Müdürü (Sadece Kullanıcı Yetkisi Olanlar)</label>
                  <select value={newRegionData.managerId} onChange={e => setNewRegionData({...newRegionData, managerId: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-indigo-500">
                    <option value="">Atanmadı</option>
                    {/* SADECE USER ID'Sİ OLAN PERSONELLERİ LİSTELE VE DOĞRU ID'Yİ GÖNDER */}
                    {personnel.filter(p => p.userId || p.user?.id).map(p => (
                      <option key={p.id} value={p.userId || p.user?.id}>{p.firstName} {p.lastName}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-600 transition-all">Sisteme Kaydet</button>
              </form>
            </div>
          </div>
        </>
      )}

      {isEditPanelOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]" onClick={() => setIsEditPanelOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white z-[110] shadow-2xl p-8 md:p-12 overflow-y-auto animate-in slide-in-from-right border-l border-slate-200">
             <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-6">
               <div>
                 <h2 className="text-2xl font-black text-slate-800">Bölge Konfigürasyonu</h2>
                 <p className="text-slate-500 text-sm mt-1">Bölgeyi ve ona bağlı mağaza ağını yönetin.</p>
               </div>
               <button onClick={() => setIsEditPanelOpen(false)} className="w-10 h-10 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center text-slate-500">✕</button>
            </div>
            
            <form className="space-y-10" onSubmit={handleEditSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Bölge Adı</label>
                    <input type="text" value={editRegionData.name} onChange={e => setEditRegionData({...editRegionData, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Kanal</label>
                    <select value={editRegionData.channelId} onChange={e => setEditRegionData({...editRegionData, channelId: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-indigo-500" required>
                      {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Bölge Müdürü (Sadece Kullanıcı Yetkisi Olanlar)</label>
                    <select value={editRegionData.managerId} onChange={e => setEditRegionData({...editRegionData, managerId: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-indigo-500">
                      <option value="">Atanmadı</option>
                      {/* SADECE USER ID'Sİ OLAN PERSONELLERİ LİSTELE VE DOĞRU ID'Yİ GÖNDER */}
                      {personnel.filter(p => p.userId || p.user?.id).map(p => (
                        <option key={p.id} value={p.userId || p.user?.id}>{p.firstName} {p.lastName} - {p.title?.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative overflow-visible">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">Bağlı Mağazalar (Tesisler)</h3>
                    </div>
                    <div className="relative">
                      <button type="button" onClick={() => setIsSearchOpen(!isSearchOpen)} className="bg-white border border-slate-200 hover:border-indigo-500 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm">
                        ⇄ Mağaza Transfer Et
                      </button>
                      {isSearchOpen && (
                        <div className="absolute top-12 right-0 w-80 bg-white rounded-2xl shadow-xl p-3 text-slate-800 z-50 border border-slate-100">
                          <input autoFocus type="text" placeholder="Mağaza ara..." className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none mb-2 focus:border-indigo-500" onChange={(e) => setStoreSearch(e.target.value)} />
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {allStores.filter(s => s.name?.toLowerCase().includes(storeSearch.toLowerCase())).slice(0, 5).map(s => (
                              <div key={s.id} onClick={() => handleStoreAction('TRANSFER', s)} className="p-3 hover:bg-indigo-50 rounded-xl cursor-pointer border border-transparent">
                                <p className="text-sm font-bold text-slate-800">{s.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{s.code} • {s.region?.name || "Bölgesiz"}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {editRegionData.stores.map((s) => (
                      <div key={s.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${s.isTransfer ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                            {s.isTransfer ? '⇄' : '🏪'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{s.name}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{s.code} {s.isTransfer && <span className="text-indigo-500 font-bold ml-2">(Yeni Aktarıldı)</span>}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => handleStoreAction('REMOVE', s.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 font-bold">Kaldır</button>
                      </div>
                    ))}
                    {editRegionData.stores.length === 0 && <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl"><p className="text-slate-400 font-medium text-sm">Bu bölgeye bağlı mağaza yok.</p></div>}
                  </div>
                </div>

               <div className="pt-4">
                 <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-600 transition-all tracking-wide">
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