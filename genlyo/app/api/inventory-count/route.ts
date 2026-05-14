// app/api/inventory-count/route.ts
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

export const dynamic = 'force-dynamic';

// GET: Mağaza müdürünün en son kaydettiği sayım verilerini sayfaya getirir
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    // Kullanıcıyı bul ve mağaza ID'sini al
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || !user.storeId) {
      return NextResponse.json({ error: "Mağaza bulunamadı" }, { status: 404 });
    }

    const inventoryData = await prisma.inventoryCount.findMany({
      where: { storeId: user.storeId },
      orderBy: { brand: 'asc' }
    });

    return NextResponse.json(inventoryData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Mağaza müdürünün ekrandaki tablosunu veritabanına kaydeder
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || !user.storeId) {
      return NextResponse.json({ error: "Mağaza bulunamadı" }, { status: 404 });
    }

    const body = await request.json(); // Sayfadan gelen tablo dizisi

    // Transaction (Güvenli İşlem): Önce o mağazanın eski sayımını sil, sonra yenisini yaz.
    // Bu sayede "stokta hiç kalmamış" markalar veritabanında çöplük yaratmaz.
    await prisma.$transaction([
      prisma.inventoryCount.deleteMany({
        where: { storeId: user.storeId }
      }),
      prisma.inventoryCount.createMany({
        data: body.map((row: any) => ({
          storeId: user.storeId as string,
          brand: row.brand,
          stok: row.stok,
          teknik: row.teknik,
          oms: row.oms,
          disVitrin: row.disVitrin,
          icVitrin: row.icVitrin,
          depo: row.depo,
          description: row.description
        }))
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
