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
    const channels = await prisma.channel.findMany({
      include: {
        regions: true // Bu kanala bağlı kaç bölge olduğunu görebilmek için
      },
      orderBy: { name: 'asc' }
    });
    
    return NextResponse.json(channels);
  } catch (error: any) {
    console.error("KANAL GET HATASI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json({ error: "Kanal adı zorunludur." }, { status: 400 });
    }

    const newChannel = await prisma.channel.create({
      data: {
        name: body.name
      }
    });

    return NextResponse.json({ success: true, channel: newChannel });
  } catch (error: any) {
    console.error("KANAL POST HATASI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}