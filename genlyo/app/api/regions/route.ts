// @ts-nocheck
import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const regions = await prisma.region.findMany({
      include: { 
        manager: true,
        channel: true,
        stores: true
      },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(regions);
  } catch (error: any) {
    console.error("REGION API GET ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.channelId) {
      return NextResponse.json({ error: "Bölge adı ve Kanal zorunludur." }, { status: 400 });
    }

    const createData: any = {
      name: body.name,
      channel: { connect: { id: body.channelId } }
    };

    // 🚀 AKILLI MÜDÜR ATAMA MOTORU (Yeni Kayıt İçin)
    if (body.managerId) {
        const person = await prisma.personnel.findUnique({
           where: { id: body.managerId },
           include: { user: true }
        });

        let targetUserId = body.managerId;
        if (person) {
            if (person.user && person.user.id) {
                targetUserId = person.user.id;
            } else {
                return NextResponse.json({ error: "Seçilen personelin sisteme giriş yetkisi (User hesabı) bulunmuyor. Lütfen kullanıcı hesabı atanmış bir yetkili seçin." }, { status: 400 });
            }
        }
        createData.manager = { connect: { id: targetUserId } };
    }

    const newRegion = await prisma.region.create({
      data: createData
    });
    return NextResponse.json({ success: true, region: newRegion });
  } catch (error: any) {
    console.error("REGION API POST ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}