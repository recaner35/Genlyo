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

// TÜRKÇE AY SÖZLÜĞÜ (Javascript ayları 0'dan başlar: 0=Ocak, 1=Şubat...)
const monthMap: Record<string, number> = {
  'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'haziran': 5,
  'temmuz': 6, 'ağustos': 7, 'eylül': 8, 'ekim': 9, 'kasım': 10, 'aralık': 11
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Dosya yok' }, { status: 400 });

    const text = (await file.text()).replace(/^\uFEFF/, '');
    const parsedData = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows = parsedData.data as any[];

    // 1. MAĞAZALARI HAFIZAYA AL
    const allStores = await prisma.store.findMany({
      select: { id: true, name: true, regionId: true }
    });
    const storeMap = new Map(allStores.map(s => [s.name.trim().toLowerCase(), s]));

    // 2. TARİHLERİ OLUŞTUR VE TAKVİMİ (CalendarDimension) KONTROL ET
    const calendarMap = new Map<string, Date>();
    
    rows.forEach(row => {
      const yearStr = row['Yıl']?.trim();
      const monthStr = row['Ay']?.trim().toLowerCase();
      
      if (yearStr && monthStr && monthMap[monthStr] !== undefined) {
        // Hedefi o ayın 1. gününe atıyoruz
        const year = parseInt(yearStr);
        const monthIndex = monthMap[monthStr];
        const dateObj = new Date(Date.UTC(year, monthIndex, 1));
        calendarMap.set(`${year}-${monthStr}`, dateObj);
      }
    });

    // Takvimde olmayan günleri "Ayın 1'i" olarak takvime ekle
    const existingDates = await prisma.calendarDimension.findMany({
        where: { date: { in: Array.from(calendarMap.values()) } },
        select: { date: true }
    });
    const existingDateTimes = new Set(existingDates.map(d => d.date.getTime()));

    const missingDates = [];
    for (const dateObj of calendarMap.values()) {
        if (!existingDateTimes.has(dateObj.getTime())) {
            const dayOfWeek = dateObj.getUTCDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            missingDates.push({
                date: dateObj,
                isWeekend: isWeekend,
                isPayday: false, // Ayın 1'i maaş günü mü? İsteğe bağlı değişebilir :)
                impactWeight: 1.0
            });
            existingDateTimes.add(dateObj.getTime()); // Aynı tarihi iki kez eklememek için
        }
    }
    if (missingDates.length > 0) {
        await prisma.calendarDimension.createMany({ data: missingDates, skipDuplicates: true });
    }

    // 3. HEDEFLERİ PARALEL VE GÜVENLİ ŞEKİLDE İŞLE (Mükerrerlik Koruması)
    let processedCount = 0;
    const chunkSize = 50;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      
      await Promise.all(chunk.map(async (row) => {
        const storeName = row['Mağaza Adı']?.trim();
        const yearStr = row['Yıl']?.trim();
        const monthStr = row['Ay']?.trim().toLowerCase();
        let targetStr = row['Hedef']?.trim();

        if (!storeName || !yearStr || !monthStr || !targetStr) return;

        const store = storeMap.get(storeName.toLowerCase());
        const dateObj = calendarMap.get(`${yearStr}-${monthStr}`);

        if (store && dateObj) {
          // Hedef rakamındaki olası Türkçe formatları temizle (Örn: 2.000.000,50 -> 2000000.50)
          targetStr = targetStr.replace(/\./g, '').replace(',', '.');
          const targetAmount = parseFloat(targetStr);

          if (!isNaN(targetAmount)) {
            // Önce bu mağazanın bu ay için hedefi var mı bakıyoruz
            const existingTarget = await prisma.target.findFirst({
              where: { storeId: store.id, date: dateObj }
            });

            if (existingTarget) {
              // Varsa GÜNCELLE
              await prisma.target.update({
                where: { id: existingTarget.id },
                data: { targetAmount: targetAmount }
              });
            } else {
              // Yoksa YENİ EKLE
              await prisma.target.create({
                data: {
                  date: dateObj,
                  storeId: store.id,
                  regionId: store.regionId,
                  targetAmount: targetAmount
                }
              });
            }
            processedCount++;
          }
        }
      }));
    }

    return NextResponse.json({ success: true, message: `Başarılı! ${processedCount} adet hedef sisteme işlendi (Eski hedefler güncellendi).` });

  } catch (error: any) {
    console.error("HEDEF YÜKLEME HATASI:", error);
    return NextResponse.json({ error: `Hata: ${error.message}` }, { status: 500 });
  }
}