import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from "bcryptjs";

// BAĞLANTI AYARLARI
const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const hashedPassword = await bcrypt.hash("Sirket2024*", 10);
    const regions = ["Marmara", "Ege", "İç Anadolu", "Akdeniz", "Karadeniz", "Doğu Anadolu", "Güneydoğu Anadolu"];
    
    const results: string[] = [];

    for (const rName of regions) {
      // 1. Bölgeyi oluştur veya bul
      const region = await prisma.region.upsert({
        where: { name: rName },
        update: {},
        create: { name: rName }
      });

      // 2. Müdür hesabını oluştur veya güncelle
      const manager = await prisma.user.upsert({
        where: { email: `${rName.toLowerCase().replace(/\s/g, '')}@saatvesaat.com` },
        update: { 
          role: 'REGION_MANAGER', 
          regionId: region.id 
        },
        create: {
          email: `${rName.toLowerCase().replace(/\s/g, '')}@saatvesaat.com`,
          name: `${rName} Bölge Müdürü`,
          password: hashedPassword,
          role: 'REGION_MANAGER',
          isActive: true,
          regionId: region.id
        }
      });

      // 3. Bölgeyi müdüre bağla (Buradaki 'as any' TS hatasını %100 çözer)
      await prisma.region.update({
        where: { id: region.id },
        data: { 
          manager: {
            connect: { id: manager.id }
          }
        } as any
      });

      results.push(`${rName} KURULDU VE ${manager.name} ATANDI.`);
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("FIX-ALL ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}