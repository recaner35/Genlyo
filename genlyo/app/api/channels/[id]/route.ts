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
    const channelId = resolvedParams.id;
    const body = await request.json();
    
    const updatedChannel = await prisma.channel.update({
      where: { id: channelId },
      data: { name: body.name }
    });

    return NextResponse.json({ success: true, channel: updatedChannel });
  } catch (error: any) {
    console.error("KANAL PATCH HATASI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: any }) {
  try {
    const resolvedParams = await context.params;
    const channelId = resolvedParams.id;
    
    await prisma.channel.delete({
      where: { id: channelId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("KANAL DELETE HATASI:", error);
    // Eğer kanala bağlı bölgeler varsa veritabanı silmeye izin vermez, bunu yakalıyoruz
    return NextResponse.json({ error: "Bu kanalı silemezsiniz çünkü ona bağlı bölgeler var. Önce bölgeleri silin veya taşıyın." }, { status: 400 });
  }
}