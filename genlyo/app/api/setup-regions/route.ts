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
    // 1. Tüm bölgeleri ve müdürleri al
    const regions = await prisma.region.findMany();
    const managers = await prisma.user.findMany({ 
      where: { role: 'REGION_MANAGER' } 
    });

    if (regions.length === 0) return NextResponse.json({ error: "Bölge bulunamadı" });
    if (managers.length === 0) return NextResponse.json({ error: "Bölge Müdürü rolünde kullanıcı bulunamadı" });

    const report: string[] = [];

    // 2. Eşleştirme
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      const manager = managers[i] || managers[0];

      if (manager) {
        // HATAYI ÇÖZEN KISIM: 'managerId' yerine 'manager: { connect: { id: ... } }'
        await prisma.region.update({
          where: { id: region.id },
          data: {
            manager: {
              connect: {
                id: manager.id
              }
            }
          } as any // TS hala inat ederse 'as any' ile zorluyoruz
        });

        // Karşı tarafı da bağla
        await prisma.user.update({
          where: { id: manager.id },
          data: {
            regionId: region.id
          }
        });

        report.push(`${region.name} -> ${manager.name} BAĞLANDI`);
      }
    }

    return NextResponse.json({ success: true, details: report });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}