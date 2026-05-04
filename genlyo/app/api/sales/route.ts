// @ts-nocheck
import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || "2026");
    const month = parseInt(searchParams.get('month') || "1");

    // Mutlak UTC aralığı
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // 🚀 DÜZELTME 1: Oturumdaki email ile gerçek kullanıcıyı buluyoruz (Çünkü storeId burada)
    const currentUser = await prisma.user.findUnique({ 
        where: { email: session.user.email } 
    });

    let storeFilter = {};
    let allowedStoreId = null; // Ön yüze filtreleme için göndereceğiz

    if (currentUser?.role === "REGION_MANAGER") {
        storeFilter = { region: { managerId: currentUser.id } };
    } else if (currentUser?.role === "STORE_MANAGER") {
        // 🚀 DÜZELTME 2: Personnel tablosu yerine doğrudan User tablosundaki storeId'yi kullanıyoruz
        storeFilter = { id: currentUser.storeId };
        allowedStoreId = currentUser.storeId;
    }

    const sales = await prisma.salesFact.findMany({
      where: { 
        date: { gte: startDate, lte: endDate },
        store: storeFilter
      }
    });

    // 🚀 DÜZELTME 3: Sadece satışları değil, kullanıcının yetkili olduğu mağazayı da bildiriyoruz
    return NextResponse.json({ sales, allowedStoreId });
  } catch (error) {
    console.error("GET SATIŞ HATASI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!Array.isArray(body) || body.length === 0) return NextResponse.json({ error: "Veri yok" }, { status: 400 });

    let updatedCount = 0;

    for (const item of body) {
      // Mutlak UTC Tarih oluştur (Saat dilimi kaymasını önlemek için)
      const entryDate = new Date(Date.UTC(item.year, item.month - 1, item.day, 0, 0, 0, 0));

      let revenueValue = item.revenue;
      if (typeof revenueValue === 'string') {
        revenueValue = parseFloat(revenueValue.replace(/\./g, '').replace(',', '.')) || 0;
      } else {
        revenueValue = Number(revenueValue) || 0;
      }

      // Mağaza ve Bölge bilgisini doğrula
      const storeInfo = await prisma.store.findFirst({
        where: { OR: [{ id: item.storeId }, { code: item.storeId }] }
      });

      if (!storeInfo || !storeInfo.regionId) continue;

      // Takvim hesaplamaları
      const dayOfWeek = entryDate.getUTCDay();
      const calendarData = {
        date: entryDate,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isPayday: entryDate.getUTCDate() === 5
      };

      // 🚀 "GÜNCEL OLAN KAZANIR" MANTIĞI: Mevcut kaydı kontrol et
      const existing = await prisma.salesFact.findFirst({
        where: { storeId: storeInfo.id, date: entryDate }
      });

      if (existing) {
        // Varsa Üstüne Yaz (Update)
        await prisma.salesFact.update({
          where: { id: existing.id },
          data: { 
            revenue: revenueValue,
            calendar: {
                connectOrCreate: {
                    where: { date: entryDate },
                    create: calendarData
                }
            }
          }
        });
      } else {
        // Yoksa Yeni Oluştur (Create)
        await prisma.salesFact.create({
          data: {
            revenue: revenueValue,
            store: { connect: { id: storeInfo.id } },
            region: { connect: { id: storeInfo.regionId } },
            calendar: {
                connectOrCreate: {
                    where: { date: entryDate },
                    create: calendarData
                }
            }
          }
        });
      }
      updatedCount++;
    }

    return NextResponse.json({ success: true, count: updatedCount });
  } catch (error) {
    console.error("SATIŞ KAYIT HATASI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}