"use client";

import { useState } from "react";

export default function SalesUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setMessage("⚠️ Lütfen önce bir CSV dosyası seçin.");
      return;
    }

    setLoading(true);
    setMessage("⏳ Yükleniyor ve hesaplanıyor, lütfen bekleyin...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // İŞTE SİHİRLİ KISIM BURASI: İstek yeni satış API'mize gidiyor!
      const response = await fetch('/api/upload-targets', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage("✅ " + result.message);
      } else {
        setMessage("❌ Hata: " + result.error);
      }
    } catch (error) {
      setMessage("❌ Sunucuya bağlanırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-lg mx-auto mt-20 border rounded-xl shadow-lg bg-white text-gray-800">
      <h1 className="text-2xl font-bold mb-2">Satış Verisi Yükleyici</h1>
      <p className="text-sm text-gray-500 mb-6">Satış (Ciro) bilgilerini içeren CSV dosyanızı buradan yükleyin.</p>
      
      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      
      <button
        onClick={handleUpload}
        disabled={loading}
        className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-colors ${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "İşleniyor..." : "Satışları Yükle"}
      </button>

      {message && (
        <div className={`mt-6 p-4 rounded-lg font-medium ${message.includes('✅') ? 'bg-green-100 text-green-800' : message.includes('⏳') ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}
    </div>
  );
}