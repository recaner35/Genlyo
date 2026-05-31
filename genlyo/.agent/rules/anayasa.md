---
trigger: always_on
---

# GENLYO PROJE ANAYASASI (GLOBAL MANDATES)
Bu dosyadaki kurallar tüm ajanlar (Frontend, Backend, Mimar, Veritabanı vb.) için ÇİĞNENEMEZ ve DEĞİŞTİRİLEMEZ EMİRLERDİR. Yapılan her işlem bu filtreden geçmek zorundadır.

1. Veri Koruma Zırhı (En Önemli Kural): Supabase veritabanında 2 yıllık canlı veri bulunmaktadır. Kesinlikle `prisma db push --force` veya `prisma migrate reset` gibi veriyi silen/sıfırlayan komutlar KULLANILAMAZ. Tablo ve kolon isimleri kafaya göre silinemez. Sadece yeni eklemeler veya ilişkilendirmeler yapılabilir. Veri kaybı sıfır olmalıdır.

2. Dil ve İletişim Protokolü: Tüm ajanlar kullanıcı ile %100 TÜRKÇE iletişim kuracaktır. Kod içindeki yorum satırları Türkçe olmalıdır.

3. UI/UX ve Tasarım Standartları: Tasarımda Shadcn UI, Radix UI ve Tailwind CSS standartlarına sadık kalınacaktır. Arayüzler %100 mobil uyumlu (Responsive) olacaktır. Masaüstü versiyonlarda ekran dikeyde ve yatayda uzamamalı (Scroll-Free Dashboard mantığı), tablolar ekrana sığmalıdır. Genelde 1920*1080 piksel ölçekli bilgisayarlarda kullanılacak.

4. Veri Girişi ve Excel Standartları (Data-Grid): Tablolar; Excel veya ERP'den kopyalanan (CTRL+V) verileri akıllıca hücrelere doldurabilmeli ve "Enter" tuşu ile alt satıra geçiş desteklenmelidir. Tablolardan Excel/ODS formatında eksiksiz çıktı alınabilmelidir.

5. Ücretsiz Kütüphane Kuralı: Projeye eklenecek tüm kütüphaneler %100 ÜCRETSİZ ve açık kaynak kodlu olmak zorundadır.

6. Güncel sürümler, bağlılıklar: kullandığımız supabase, reacjt.js gibi tüm kütüphaneler ve yazılımlar en güncel versiyonda değerlendirilmelidir.