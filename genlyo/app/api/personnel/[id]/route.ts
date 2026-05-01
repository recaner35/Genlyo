// @ts-nocheck
import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================================================
// 🔍 1. PERSONEL LİSTELEME (GET) - HİYERARŞİK DUVAR
// ============================================================================
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

        // Sisteme giren kullanıcının kendi personel/mağaza/bölge bilgisini bul
        const currentUser = await prisma.personnel.findFirst({
            where: { userId: session.user.id },
            include: { store: true }
        });

        // 🛡️ İŞTE BURASI DUVAR: Kim neyi görebilir?
        let baseWhere: any = {};

        if (session.user.role === "STORE_MANAGER") {
            // Mağaza Müdürü SADECE kendi mağazasındaki personelleri görebilir
            if (!currentUser?.storeId) return NextResponse.json([], { status: 200 }); 
            baseWhere = { storeId: currentUser.storeId };
            
        } else if (session.user.role === "REGION_MANAGER") {
            // Bölge Müdürü SADECE kendi bölgesine bağlı mağazaların personellerini görebilir
            if (!currentUser?.store?.regionId) return NextResponse.json([], { status: 200 });
            baseWhere = { store: { regionId: currentUser.store.regionId } };
            
        } else if (session.user.role === "ADMIN") {
            // Admin her şeyi görür. Eğer arayüzden spesifik bir filtre geldiyse onu uygula.
            const { searchParams } = new URL(request.url);
            const filterStoreId = searchParams.get('storeId');
            if (filterStoreId && filterStoreId !== "ALL") {
                baseWhere = { storeId: filterStoreId };
            }
        }

        // Duvara (baseWhere) uygun olarak personelleri çek
        const personnelList = await prisma.personnel.findMany({
            where: baseWhere,
            include: {
                user: { select: { id: true, name: true, email: true, role: true } },
                store: { select: { id: true, name: true, region: { select: { id: true, name: true } } } },
                title: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(personnelList);

    } catch (error) {
        console.error("PERSONEL GET HATASI:", error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

// ============================================================================
// 💾 2. YENİ PERSONEL EKLEME (POST) - GÜVENLİ KAYIT
// ============================================================================
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

        const body = await request.json();
        
        // Sisteme giren yöneticinin kendi bilgisini al
        const currentUser = await prisma.personnel.findFirst({ where: { userId: session.user.id } });

        // 🛡️ YETKİ KONTROLÜ: Mağaza Müdürü başka mağazaya adam ekleyemez!
        let targetStoreId = body.storeId;

        if (session.user.role === "STORE_MANAGER") {
            if (body.titleName === "Bölge Müdürü") {
                return NextResponse.json({ error: "Bölge Müdürü atama yetkiniz yok!" }, { status: 403 });
            }
            // Mağaza müdürü formda ne gönderirse göndersin, sistem onu kendi mağazasına kilitler
            targetStoreId = currentUser?.storeId;
        }

        // Ünvan kontrolü/yaratma
        let titleRecord = await prisma.jobTitle.findFirst({ where: { name: body.titleName } });
        if (!titleRecord) {
            titleRecord = await prisma.jobTitle.create({ data: { name: body.titleName } });
        }

        const personnelData: any = {
            firstName: body.firstName,
            lastName: body.lastName,
            isActive: body.isActive ?? true,
            title: { connect: { id: titleRecord.id } }
        };

        if (targetStoreId) {
            personnelData.store = { connect: { id: targetStoreId } };
        }

        let targetUserId = null;

        // Bölge Müdürü ise User hesabı yarat
        if (body.titleName === "Bölge Müdürü" && body.email && session.user.role === "ADMIN") {
            const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
            if (existingUser) return NextResponse.json({ error: "Bu e-posta kullanımda." }, { status: 400 });

            const newUser = await prisma.user.create({
                data: {
                    name: `${body.firstName} ${body.lastName}`,
                    email: body.email,
                    password: body.password || "123456",
                    role: "REGION_MANAGER"
                }
            });
            targetUserId = newUser.id;
            personnelData.user = { connect: { id: newUser.id } };
        }

        // Personeli veritabanına kaydet
        const newPersonnel = await prisma.personnel.create({
            data: personnelData
        });

        // Tarihçe (History) ekle
        if (targetStoreId) {
            await prisma.personnelHistory.create({
                data: {
                    personnelId: newPersonnel.id,
                    storeId: targetStoreId,
                    startDate: new Date()
                }
            });
        }

        // Bölge müdürü atamasını bölge (Region) tablosuna kaydet
        if (body.titleName === "Bölge Müdürü" && body.regionId && targetUserId && session.user.role === "ADMIN") {
            await prisma.region.update({
                where: { id: body.regionId },
                data: { manager: { connect: { id: targetUserId } } }
            });
        }

        return NextResponse.json({ success: true, personnel: newPersonnel });

    } catch (error: any) {
        console.error("PERSONEL POST HATASI:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}