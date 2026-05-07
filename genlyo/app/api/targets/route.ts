// app/api/targets/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// GET Metodu (Değişmedi, sadece hiyerarşiyi koruyor)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const userRole = (session.user.role || "").toUpperCase();
    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id } });

    let storeWhere: any = {};
    if (userRole === "STORE_MANAGER") {
        storeWhere = { id: currentUser?.storeId };
    } else if (userRole === "REGION_MANAGER") {
        storeWhere = { regionId: currentUser?.regionId };
    }

    const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

    const [targets, salesData] = await Promise.all([
      prisma.target.findMany({
        where: { date: { gte: startDate, lte: endDate }, store: storeWhere },
        include: { store: { include: { region: true } } }
      }),
      prisma.salesFact.findMany({
        where: { date: { gte: startDate, lte: endDate }, store: storeWhere }
      })
    ]);

    const salesMap = new Map();
    salesData.forEach(s => {
      const month = s.date.getUTCMonth() + 1;
      const key = `${s.storeId}-${month}`;
      salesMap.set(key, (salesMap.get(key) || 0) + (Number(s.revenue) || 0));
    });

    return NextResponse.json(targets.map(t => {
      const m = t.date.getUTCMonth() + 1;
      const actual = salesMap.get(`${t.storeId}-${m}`) || 0;
      const amount = Number(t.targetAmount) || 0;
      return {
        id: t.id, month: m, year, store: t.store, amount, actual,
        realization: amount > 0 ? (actual / amount) * 100 : 0
      };
    }));
  } catch (error) { return NextResponse.json({ error: "Hata" }, { status: 500 }); }
}

// 🚀 POST Metodu: UUID Hataları Çözüldü ve TypeScript (undefined) Uyumu Sağlandı
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const userRole = (session.user.role || "").toUpperCase();
    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    const body = await request.json();

    for (const item of body) {
      if (userRole === "STORE_MANAGER" && item.storeId !== currentUser?.storeId) continue;

      const val = parseFloat(item.amount);
      if (isNaN(val)) continue;
      
      const year = parseInt(item.year);
      const month = parseInt(item.month);
      const safeDate = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
      const searchStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      const searchEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));

      const existing = await prisma.target.findFirst({
        where: { storeId: item.storeId, date: { gte: searchStart, lte: searchEnd } }
      });

      if (existing) {
        await prisma.target.update({ where: { id: existing.id }, data: { targetAmount: val, date: safeDate } });
      } else {
        const store = await prisma.store.findUnique({ where: { id: item.storeId } });
        // 🚀 DÜZELTME: null yerine TypeScript'in beklediği undefined kelimesi kullanıldı
        const safeRegionId = store?.regionId ? store.regionId : undefined;
        
        await prisma.target.create({ 
            data: { storeId: item.storeId, regionId: safeRegionId, date: safeDate, targetAmount: val } 
        });
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: any) { 
      return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}
