// @ts-nocheck
import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function PATCH(request: Request, context: { params: any }) {
  try {
    const resolvedParams = await context.params;
    const regionId = resolvedParams.id;
    const body = await request.json();
    
    // Bölgenin mevcut durumunu alıyoruz (Disconnect çökmesini önlemek için)
    const currentRegion = await prisma.region.findUnique({ where: { id: regionId } });
    if (!currentRegion) return NextResponse.json({ error: "Bölge bulunamadı." }, { status: 404 });

    const updateData: any = {};
    if (body.name) updateData.name = body.name;

    if (body.channelId) {
      updateData.channel = { connect: { id: body.channelId } };
    }

    // 🚀 AKILLI MÜDÜR ATAMA MOTORU
    if (body.managerId !== undefined) {
      if (body.managerId === "" || body.managerId === null) {
        // Sadece bölgede halihazırda bir müdür varsa bağını kopar (Prisma çökmesini engeller)
        if (currentRegion.managerId) {
          updateData.manager = { disconnect: true };
        }
      } else {
        // Gelen ID'nin bir Personel olup olmadığını kontrol et
        const person = await prisma.personnel.findUnique({
           where: { id: body.managerId },
           include: { user: true } // Varsa User hesabını da getir
        });

        let targetUserId = body.managerId; // Eğer personel değilse, zaten bir User ID'sidir diye varsay
        
        if (person) {
            if (person.user && person.user.id) {
                targetUserId = person.user.id; // Personelin bağlı olduğu Kullanıcı ID'sini bulduk!
            } else {
                // Personel var ama sisteme giriş yetkisi (User hesabı) yok, nazikçe reddet!
                return NextResponse.json({ error: "Seçilen personelin sisteme giriş yetkisi (User hesabı) bulunmuyor. Lütfen kullanıcı hesabı atanmış bir yetkili seçin." }, { status: 400 });
            }
        }

        updateData.manager = { connect: { id: targetUserId } };
      }
    }

    const updatedRegion = await prisma.region.update({
      where: { id: regionId },
      data: updateData
    });

    // 2. Mağaza Transferleri
    if (body.stores && Array.isArray(body.stores)) {
      await prisma.store.updateMany({
        where: { regionId: regionId },
        data: { regionId: null }
      });

      const storeIds = body.stores.map((s: any) => s.id);
      if (storeIds.length > 0) {
        await prisma.store.updateMany({
          where: { id: { in: storeIds } },
          data: { regionId: regionId }
        });
      }
    }

    return NextResponse.json({ success: true, region: updatedRegion });
  } catch (error: any) {
    console.error("REGION PATCH ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: any }) {
  try {
    const resolvedParams = await context.params;
    const regionId = resolvedParams.id;
    
    await prisma.region.delete({
      where: { id: regionId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("REGION DELETE ERROR:", error);
    return NextResponse.json({ error: "Bu bölgeyi silemezsiniz çünkü ona bağlı mağazalar var." }, { status: 400 });
  }
}