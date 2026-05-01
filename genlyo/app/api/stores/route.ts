import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL as string;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    // Tüm mağazaları, bağlı oldukları derin ilişkilerle (Şehir, Bölge, Müdür, Kanal) birlikte çekiyoruz
    const stores = await prisma.store.findMany({
      include: { 
        city: true, 
        region: {
          include: { 
            manager: true, // Bölge Müdürü (Örn: Emrah Uyan)
            channel: true  // Kanal (Örn: Mağaza, E-Ticaret)
          } 
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(stores);
  } catch (error: any) {
    console.error("Mağaza Çekme Hatası:", error);
    return NextResponse.json({ error: `Hata: ${error.message}` }, { status: 500 });
  }
}