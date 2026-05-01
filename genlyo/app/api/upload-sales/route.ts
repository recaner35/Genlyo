import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import Papa from 'papaparse';

// BAĞLANTI AYARLARI
const connectionString = process.env.DATABASE_URL as string;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Dosya yok' }, { status: 400 });

    const text = (await file.text()).replace(/^\uFEFF/, '');
    const parsedData = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows = parsedData.data as any[];

    // 1. MAĞAZALARI HAFIZAYA AL (Saniyeler içinde bölgeyi bulmak için)
    const allStores = await prisma.store.findMany({
      select: { id: true, name: true, regionId: true }
    });
    const storeMap = new Map(allStores.map(s => [s.name.trim().toLowerCase(), s]));

    // 2. AKILLI TAKVİM KONTROLÜ (Tarihleri düzenle ve yoksa oluştur)
    const uniqueDateStrs = [...new Set(rows.map(r => r['Tarih']?.trim()).filter(Boolean))];
    const calendarMap = new Map();

    uniqueDateStrs.forEach(dateStr => {
       // "01/02/2024" formatını parçala -> [01, 02, 2024]
       const [day, month, year] = dateStr.split('/');
       if (day && month && year) {
           // UTC kullanarak saat farkından dolayı gün atlamasını engelliyoruz
           const dateObj = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
           calendarMap.set(dateStr, dateObj);
       }
    });

    // Veritabanında zaten var olan günleri çek
    const existingDates = await prisma.calendarDimension.findMany({
        where: { date: { in: Array.from(calendarMap.values()) } },
        select: { date: true }
    });
    const existingDateTimes = new Set(existingDates.map(d => d.date.getTime()));

    // Takvimde olmayan günleri "Hafta sonu mu?" kontrolüyle ekle
    const missingDates = [];
    for (const [dateStr, dateObj] of calendarMap.entries()) {
        if (!existingDateTimes.has(dateObj.getTime())) {
            const dayOfWeek = dateObj.getUTCDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 Pazar, 6 Cumartesi
            missingDates.push({
                date: dateObj,
                isWeekend: isWeekend,
                isPayday: false,
                impactWeight: 1.0
            });
        }
    }
    if (missingDates.length > 0) {
        await prisma.calendarDimension.createMany({ data: missingDates, skipDuplicates: true });
    }

    // 3. SATIŞLARI HAZIRLA (Format Dönüşümleri)
    const salesData: any[] = [];
    let validCount = 0;

    for (const row of rows) {
        const dateStr = row['Tarih']?.trim();
        const storeName = row['Mağaza Adı']?.trim();
        const ciroStr = row['Ciro']?.trim();

        if (!dateStr || !storeName || !ciroStr) continue;

        const store = storeMap.get(storeName.toLowerCase());
        const dateObj = calendarMap.get(dateStr);

        if (store && dateObj) {
            // Ciro temizliği: 18.969,16 -> Noktaları sil (18969,16) -> Virgülü noktaya çevir (18969.16)
            let cleanCiro = ciroStr.replace(/\./g, '');
            cleanCiro = cleanCiro.replace(',', '.');
            const revenue = parseFloat(cleanCiro);

            if (!isNaN(revenue)) {
                salesData.push({
                    date: dateObj,
                    storeId: store.id,
                    regionId: store.regionId, // Bölgeyi kendisi otomatik bağlıyor!
                    revenue: revenue
                });
                validCount++;
            }
        }
    }

    // 4. SATIŞLARI VERİTABANINA YÜKLE (createMany ile 10 binlerce satır 1 saniyede yüklenir)
    if (salesData.length > 0) {
        await prisma.salesFact.createMany({
            data: salesData,
            skipDuplicates: true
        });
    }

    return NextResponse.json({ success: true, message: `Başarılı! ${validCount} adet satış kaydı, Akıllı Takvim ve Bölgelerle eşleştirilerek sisteme işlendi.` });

  } catch (error: any) {
    console.error("SATIŞ YÜKLEME HATASI:", error);
    return NextResponse.json({ error: `Hata: ${error.message}` }, { status: 500 });
  }
}