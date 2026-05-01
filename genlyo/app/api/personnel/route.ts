// @ts-nocheck
import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

        const userRole = (session.user.role || "").toUpperCase();

        // 🚀 ŞEMA ÇÖZÜMÜ 1: Sisteme giren kullanıcının bilgilerini direkt User tablosundan alıyoruz
        let userStoreId = null;
        let userRegionId = null;

        const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { store: true }
        });

        if (dbUser) {
            userStoreId = dbUser.storeId;
            userRegionId = dbUser.store?.regionId || dbUser.regionId;
        }

        let baseWhere: any = {};

        // 🚀 ŞEMA ÇÖZÜMÜ 2: Personelleri "storeId" ile değil, "history" kayıtları üzerinden filtreliyoruz
        if (userRole === "ADMIN") {
            const { searchParams } = new URL(request.url);
            const filterStoreId = searchParams.get('storeId');
            if (filterStoreId && filterStoreId !== "ALL") {
                baseWhere = { history: { some: { storeId: filterStoreId } } };
            }
        } 
        else if (userRole === "STORE_MANAGER") {
            if (!userStoreId) return NextResponse.json([], { status: 200 }); 
            baseWhere = { history: { some: { storeId: userStoreId } } };
        } 
        else if (userRole === "REGION_MANAGER") {
            if (!userRegionId) return NextResponse.json([], { status: 200 });
            baseWhere = { history: { some: { store: { regionId: userRegionId } } } };
        } 
        else {
            return NextResponse.json([], { status: 200 });
        }

        const personnelList = await prisma.personnel.findMany({
            where: baseWhere,
            include: {
                user: { select: { id: true, name: true, email: true, role: true } },
                title: true,
                // 🚀 ŞEMA ÇÖZÜMÜ 3: Mağaza verisini "store" objesinden değil, en güncel history kaydından çekiyoruz
                history: {
                    orderBy: { startDate: 'desc' },
                    take: 1, // En güncel görev yerini al
                    include: {
                        store: { select: { id: true, name: true, region: { select: { id: true, name: true } } } },
                        region: { select: { id: true, name: true } }
                    }
                }
            },
            orderBy: { firstName: 'asc' }
        });

        // 🚀 MÜKEMMEL UX: Frontend (ön yüz) kodun bozulmasın diye, history'den gelen veriyi ana objeye yapıştırıyoruz
        const formattedList = personnelList.map(p => {
            const currentHistory = p.history && p.history.length > 0 ? p.history[0] : null;
            return {
                ...p,
                storeId: currentHistory?.storeId || null,
                store: currentHistory?.store || null,
                regionId: currentHistory?.regionId || null,
                region: currentHistory?.region || null
            };
        });

        return NextResponse.json(formattedList);

    } catch (error) {
        console.error("PERSONEL GET HATASI:", error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

export async function POST(request: Request) {
  let createdUserId = null;
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const body = await request.json();
    if (!body.firstName || !body.lastName || !body.titleName) return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });

    let titleRecord = await prisma.jobTitle.findFirst({ where: { name: body.titleName } });
    if (!titleRecord) titleRecord = await prisma.jobTitle.create({ data: { name: body.titleName } });

    let targetStoreId = body.storeId;
    const userRole = (session.user.role || "").toUpperCase();

    if (userRole === "STORE_MANAGER") {
        if (body.titleName === "Bölge Müdürü") return NextResponse.json({ error: "Yetkiniz yok." }, { status: 403 });
        
        const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (dbUser && dbUser.storeId) {
            targetStoreId = dbUser.storeId;
        }
    }

    let targetUserId = null;
    if (body.titleName === "Bölge Müdürü" && body.email && userRole === "ADMIN") {
      const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
      if (existingUser) return NextResponse.json({ error: "E-posta kullanımda." }, { status: 400 });

      const newUser = await prisma.user.create({
        data: { name: `${body.firstName} ${body.lastName}`, email: body.email, password: body.password || "123456", role: "REGION_MANAGER" }
      });
      createdUserId = newUser.id;
      targetUserId = newUser.id;
    }

    const createData: any = {
      firstName: body.firstName, lastName: body.lastName,
      title: { connect: { id: titleRecord.id } }
    };

    if (targetUserId) createData.user = { connect: { id: targetUserId } };
    
    // 🚀 ŞEMA ÇÖZÜMÜ 4: Personel tablosunda `store` diye bir şey yok. Direkt `history` üzerinden bağlıyoruz.
    if (body.titleName !== "Bölge Müdürü" && targetStoreId) {
      createData.history = { create: { storeId: targetStoreId, startDate: new Date() } };
    }

    const newPersonnel = await prisma.personnel.create({ data: createData });

    if (body.titleName === "Bölge Müdürü" && body.regionId && targetUserId && userRole === "ADMIN") {
       await prisma.region.update({
          where: { id: body.regionId },
          data: { manager: { connect: { id: targetUserId } } }
       });
    }

    return NextResponse.json({ success: true, personnel: newPersonnel });
  } catch (error: any) {
    if (createdUserId) await prisma.user.delete({ where: { id: createdUserId } }).catch(() => null);
    console.error("PERSONEL POST HATASI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}