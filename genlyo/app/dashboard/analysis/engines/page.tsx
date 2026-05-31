"use client";

import EngineCard from '@/components/dashboard/EngineCard';

export default function EnginesPage() {
  const motor2DOW = [1.15, 0.9, 0.9, 0.9, 0.9, 1.1, 1.25];
  const motor2Seasonal = [
    { label: 'Ramazan Bayramı Ayı', value: 1.08 },
    { label: 'Kurban Bayramı Ayı', value: 1.05 },
    { label: 'Ramazan (genel)', value: 0.93 },
    { label: 'Yaz İndirim Sezonu', value: 1.05 },
    { label: '11.11/Black Friday Sezonu', value: 1.10 }
  ];

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EngineCard
          title="Motor 1 — İstatistiksel Kapanış Motoru"
          subtitle="Hedef önerisi ve dönemsel kapanış tahmini"
          bullets={[
            'Geçmiş yıl ve önceki aya göre blended-growth yöntemi kullanır.',
            'Aylık hedefler, yıllık trendler ve momentum ile harmanlanır.',
            'EOM (month-end) tahmini için gün bazlı ortalama ve kalan gün çarpanı kullanılır.'
          ]}
          multipliers={[{ label: 'Momentum güven aralığı', value: '0.85 - 1.50 (clamped)' }]}
          explanation={'Motor 1, veritabanındaki gerçekleşen ciro ve hedefleri kullanarak istatistiksel olarak gelecek ay hedefini önerir. Öncelik: hedef veritabanı → geçmiş hedefler → bilanço temelli tahmin.'}
        />

        <EngineCard
          title="Motor 2 — Bağlamsal ML Satış Tahmini"
          subtitle="Gün bazlı tahmin, bayram/özel gün çarpanları ve ivme düzeltmesi"
          bullets={['Hafta içi/hafta sonu day-of-week ağırlıkları uygulanır.', 'Özel gün takvimi (sabit + hicri) ve arefe(-1,+1) etiketleri dikkate alınır.', 'Son 30 günlük hata ile bias düzeltmesi ve active momentum kullanılır.']}
          multipliers={[
            { label: 'DOW çarpanları (Pazar→Cumartesi)', value: motor2DOW },
            ...motor2Seasonal
          ]}
          explanation={'Motor 2, geçmiş günlük verilerle öğrenen bir modeldir. Özel günlerde çarpanlar (intensity) uygulanır; birden fazla özel gün varsa hepsinin etiketleri API tarafından döndürülür ve ön yüzde listelenir. Aktif ivme (mtd actual / mtd predicted) kalan gün tahminlerine uygulanır.'}
        />
      </div>

      <div className="max-w-7xl mx-auto mt-8">
        <div className="bg-white rounded-2xl p-6 border shadow-sm">
          <h3 className="text-lg font-black mb-2">Nasıl Özetlenir?</h3>
          <p className="text-sm text-slate-600">Her iki motor da farklı amaçlar için tasarlandı: Motor 1 daha çok hedef önerisi ve kapanış bazlı istatistiksel tahmin, Motor 2 ise gün bazlı satış tahmini ve bağlamsal (özel gün, hafta sonu, ivme) düzeltmeler içerir. Motor 2 özel günleri API üzerinden birden çok etiketle döner; frontend bu etiketleri ayrı rozetler halinde gösterir.</p>
        </div>
      </div>
    </div>
  );
}
