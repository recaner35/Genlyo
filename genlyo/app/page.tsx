'use client';

import { useState } from 'react';

export default function BatchUploadDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('Bekleniyor');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('Dosya seçildi, yüklemeye hazır.');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('Hiyerarşi çözümleniyor ve veritabanına işleniyor... Lütfen bekleyin.');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setStatus(`✅ Başarılı! ${result.message}`); 
      } else {
        setStatus(`❌ Hata: ${result.error}`);
      }
    } catch (error) {
      setStatus('❌ Sunucuya bağlanırken bir hata oluştu.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      <header className="mb-10 border-b border-gray-800 pb-5">
        <h1 className="text-3xl font-bold text-white tracking-tight">Genlyo BI & Karar Destek Sistemi</h1>
        <p className="text-gray-400 mt-2">Makine Öğrenimi ve Satış Tahminleme Merkezi</p>
      </header>

      <main className="max-w-4xl mx-auto mt-16">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-purple-600 w-2 h-6 rounded mr-3"></span>
            Master Hiyerarşi Yükleme (Mağazalar & Bölgeler)
          </h2>
          
          <div className="bg-gray-800 p-4 rounded-lg mb-8 border border-gray-700">
             <p className="text-sm text-gray-300 mb-2">
               Sistemin ana iskeletini kurmak için aşağıdaki başlıkları (İngilizce) içeren bir CSV dosyası yükleyin. Sistem Kanal, Bölge ve İl hiyerarşisini otomatik algılayıp mağazaları bağlayacaktır:
             </p>
             <code className="bg-black p-2 rounded text-green-400 text-xs block overflow-x-auto">Bölgeler,Bölge Müdürü,İl,Mağaza</code>
          </div>

          <div className="border-2 border-dashed border-gray-700 rounded-xl p-10 text-center hover:bg-gray-800 transition-colors">
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2.5 file:px-6
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-purple-600 file:text-white
                hover:file:bg-purple-500 cursor-pointer"
            />
          </div>

          <div className="mt-8 flex items-center justify-between bg-gray-950 p-4 rounded-lg border border-gray-800">
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-3 ${status.includes('Başarılı') ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
              <span className="text-sm font-medium text-gray-300">Durum: {status}</span>
            </div>
            
            <button 
              onClick={handleUpload}
              disabled={!file || status.includes('işleniyor')}
              className="bg-white text-black px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hiyerarşiyi Kur ve Yükle
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}