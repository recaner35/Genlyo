// @ts-nocheck
import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 🚀 HAFIZA ÖNBELLEĞİ: Mağazaları bir kez çekip burada tutacağız
let storeCache = null;

export async function POST(request: Request) {
  try {
    const { data } = await request.json();
    if (!data || data.length === 0) return NextResponse.json({ count: 0 });

    // Önbelleği doldur (Hız için kritik)
    if (!storeCache) {
      storeCache = await prisma.store.findMany({
        select: { id: true, name: true, regionId: true }
      });
    }

    let processedCount = 0;

    // İşlemleri toplu (transaction) değil, kontrollü loop ile yapıyoruz
    for (const row of data) {
      try {
        const dateStr = row["Tarih"];
        if (!dateStr) continue;

        const dateParts = dateStr.split('/');
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]);
        const year = parseInt(dateParts[2]);

        const entryDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        const revenueStr = row["Ciro"] ? row["Ciro"].toString() : "0";
        const revenueValue = parseFloat(revenueStr.replace(/\./g, '').replace(',', '.')) || 0;

        // Önbellekten mağazayı bul (Veritabanına gitmekten çok daha hızlı)
        const store = storeCache.find(s => s.name === row["Mağaza Adı"]);
        if (!store) continue;

        const dayOfWeek = entryDate.getUTCDay();
        const calendarData = {
          date: entryDate,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isPayday: entryDate.getUTCDate() === 5,
        };

        // Mevcut kaydı bul ve güncelle veya yeni oluştur
        const existing = await prisma.salesFact.findFirst({
          where: { storeId: store.id, date: entryDate },
          select: { id: true }
        });

        if (existing) {
          await prisma.salesFact.update({
            where: { id: existing.id },
            data: { revenue: revenueValue }
          });
        } else {
          await prisma.salesFact.create({
            data: {
              revenue: revenueValue,
              date: entryDate,
              store: { connect: { id: store.id } },
              region: { connect: { id: store.regionId } },
              calendar: {
                connectOrCreate: {
                  where: { date: entryDate },
                  create: calendarData
                }
              }
            }
          });
        }
        processedCount++;
      } catch (innerError) {
        console.error("Satır işleme hatası:", innerError);
      }
    }

    return NextResponse.json({ success: true, count: processedCount });
  } catch (error) {
    console.error("YÜKLEME GENEL HATASI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}