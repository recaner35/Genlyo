"use client";

import { useEffect, useState, useMemo } from "react";

export default function ChannelsManagementPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    id: "", name: ""
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'name', direction: 'asc' });

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/channels');
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      setChannels(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setFormData({ id: "", name: "" });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (channel: any) => {
    setFormData({ id: channel.id, name: channel.name });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditMode ? `/api/channels/${formData.id}` : '/api/channels';
      const method = isEditMode ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name })
      });
      
      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchChannels();
      } else {
        alert(data.error || "İşlem başarısız.");
      }
    } catch (err) { alert("Sistemsel bir hata oluştu."); }
  };

  const executeDelete = async (idToProcess?: string) => {
    const idsToDelete = idToProcess ? [idToProcess] : selectedIds;
    
    if (!confirm(`${idsToDelete.length} adet kanalı kalıcı olarak silmek istediğinize emin misiniz?`)) return;

    try {
      const promises = idsToDelete.map(async (id) => {
        const response = await fetch(`/api/channels/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Silme reddedildi.");
        return response;
      });

      await Promise.all(promises);
      setSelectedIds([]);
      fetchChannels();
    } catch (err: any) {
      alert(err.message || "Kanal silinirken hata oluştu.");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredAndSortedChannels = useMemo(() => {
    if (!Array.isArray(channels)) return [];
    
    let result = [...channels];
    
    if (searchTerm) {
      const s = searchTerm.toLocaleLowerCase('tr-TR');
      result = result.filter(ch => ch.name?.toLocaleLowerCase('tr-TR').includes(s));
    }
    
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = sortConfig.key === 'regions' ? (a.regions?.length || 0) : (a[sortConfig.key] || "");
        let bVal = sortConfig.key === 'regions' ? (b.regions?.length || 0) : (b[sortConfig.key] || "");
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
           return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return sortConfig.direction === 'asc' 
          ? String(aVal).localeCompare(String(bVal), 'tr-TR', { sensitivity: 'base' })
          : String(bVal).localeCompare(String(aVal), 'tr-TR', { sensitivity: 'base' });
      });
    }
    return result;
  }, [channels, searchTerm, sortConfig]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="text-sm font-bold text-slate-400 tracking-[0.3em]">KANALLAR YÜKLENİYOR</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-10 min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white p-10 rounded-3xl border border-red-100 max-w-xl w-full text-center shadow-2xl">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">!</div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Sistem Uyarısı</h2>
        <p className="text-slate-500 mb-8">{error}</p>
        <button onClick={fetchChannels} className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-600 transition-all">Sistemi Yeniden Başlat</button>
      </div>
    </div>
  );

  const isAllSelected = filteredAndSortedChannels.length > 0 && selectedIds.length === filteredAndSortedChannels.length;

  return (
    <div className="p-6 md:p-10 bg-slate-50/50 min-h-screen font-sans relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Kanal Yönetimi</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Toplam <span className="font-bold text-indigo-600">{filteredAndSortedChannels.length}</span> ana satış kanalı listeleniyor.</p>
        </div>
        <button onClick={openNewModal} className="bg-indigo-600 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Yeni Kanal Kur
        </button>
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 mb-8">
        <div className="relative flex-1">
          <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
          <input 
            type="text" placeholder="Kanal ara..." 
            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-transparent text-sm font-medium text-slate-700 outline-none focus:bg-slate-50 transition-colors"
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-24">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="p-5 w-14 text-center">
                  <div className="flex items-center justify-center">
                    <input type="checkbox" checked={isAllSelected} onChange={(e) => setSelectedIds(e.target.checked ? filteredAndSortedChannels.map(s => s.id) : [])} className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer" />
                  </div>
                </th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setSortConfig({key: 'id', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>SİSTEM ID</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setSortConfig({key: 'name', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>KANAL ADI</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setSortConfig({key: 'regions', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>BAĞLI BÖLGELER</th>
                <th className="p-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">İŞLEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedChannels.map(channel => (
                <tr key={channel.id} className={`transition-colors group ${selectedIds.includes(channel.id) ? 'bg-indigo-50/60' : 'hover:bg-slate-50/50'}`}>
                  <td className="p-5 text-center">
                    <div className="flex items-center justify-center">
                      <input type="checkbox" checked={selectedIds.includes(channel.id)} onChange={() => toggleSelect(channel.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer" />
                    </div>
                  </td>
                  <td className="p-5 font-mono text-xs font-medium text-slate-400">{(channel.id).split('-')[0]}...</td>
                  <td className="p-5">
                    <span className="font-black text-slate-800 block text-base">{channel.name}</span>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                       <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{channel.regions?.length || 0}</span>
                       <span className="text-xs font-medium text-slate-500">Bölge Kayıtlı</span>
                    </div>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(channel)} className="bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-xs hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm">Düzenle</button>
                        <button onClick={() => executeDelete(channel.id)} className="bg-white border border-red-100 text-red-500 font-semibold px-4 py-2 rounded-xl text-xs hover:bg-red-50 transition-all shadow-sm">Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAndSortedChannels.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-400 font-medium">Kanal bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 text-white px-6 py-4 rounded-3xl shadow-2xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-10 duration-300">
          <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
            <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-sm">{selectedIds.length}</div>
            <span className="text-sm font-bold text-slate-200 tracking-wide">Kanal Seçildi</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => executeDelete()} className="px-4 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors">Seçilenleri Sil</button>
            <button onClick={() => setSelectedIds([])} className="ml-2 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">✕</button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-[110] shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right border-l border-slate-200">
             <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
               <div>
                 <h2 className="text-xl font-black text-slate-800">{isEditMode ? "Kanalı Düzenle" : "Yeni Kanal Kur"}</h2>
                 <p className="text-slate-500 text-sm mt-1">Sisteme yeni bir üst yapı organizasyonu ekleyin.</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-500 transition-colors">✕</button>
            </div>
            
            <form className="space-y-6" onSubmit={handleSave}>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Kanal Adı</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="Örn: Mağaza, E-Ticaret, Toptan" required />
               </div>
               
               <div className="pt-8">
                 <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-600 transition-all tracking-wide">
                    {isEditMode ? "Değişiklikleri Kaydet" : "Kanalı Sisteme Ekle"}
                 </button>
               </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}