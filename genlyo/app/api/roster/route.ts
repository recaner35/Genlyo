import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// GET: Seçilen haftanın shiftini getirir
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    if (!date) return NextResponse.json({ error: "Tarih gerekli" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || !user.storeId) return NextResponse.json({ error: "Mağaza bulunamadı" }, { status: 404 });

    // Terminal/Vercel bypass: Raw SQL kullanarak doğrudan tabloya bağlanıyoruz
    const schedule: any = await prisma.$queryRaw`
      SELECT "data", "config" FROM "WeeklySchedule" 
      WHERE "storeId" = ${user.storeId} 
      AND "weekStartDate" = ${new Date(date)}
    `;

    if (schedule && schedule.length > 0) {
      return NextResponse.json({ data: schedule[0].data, config: schedule[0].config });
    }
    return NextResponse.json({ data: null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Ekranda hazırlanan shifti veritabanına kaydeder
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const body = await request.json();
    const { weekStart, data, config } = body;

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || !user.storeId) return NextResponse.json({ error: "Mağaza bulunamadı" }, { status: 404 });

    await prisma.$executeRaw`
      INSERT INTO "WeeklySchedule" ("storeId", "weekStartDate", "data", "config", "updatedAt")
      VALUES (${user.storeId}, ${new Date(weekStart)}, ${data}::jsonb, ${config}::jsonb, NOW())
      ON CONFLICT ("storeId", "weekStartDate")
      DO UPDATE SET "data" = EXCLUDED."data", "config" = EXCLUDED."config", "updatedAt" = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
