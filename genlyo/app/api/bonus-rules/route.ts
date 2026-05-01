// app/api/bonus-rules/route.ts
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
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const [revenueRules, productRules, penaltyRules, milestoneRules, titleRewards] = await Promise.all([
      prisma.bonusRuleRevenue.findMany({ orderBy: [{ storeCategory: 'asc' }, { minTargetHitRate: 'asc' }] }),
      prisma.bonusRuleProduct.findMany({ orderBy: { name: 'asc' } }),
      prisma.bonusRulePenalty.findMany({ orderBy: { modelName: 'asc' } }),
      prisma.bonusRuleMilestone.findMany({ orderBy: [{ storeCategory: 'asc' }, { minTargetHitRate: 'asc' }] }),
      // 🚀 YENİ: Unvan bazlı maaş ve yol ücretlerini veritabanından çekiyoruz
      prisma.titleRewardSetting.findMany({ orderBy: { titleName: 'asc' } })
    ]);

    return NextResponse.json({ revenueRules, productRules, penaltyRules, milestoneRules, titleRewards });
  } catch (error: any) {
    console.error("GET Hatası:", error); 
    return NextResponse.json({ error: "Veriler çekilemedi" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const body = await request.json();
    const { ruleType, data, isBulk } = body;

    // 🚀 EXCEL-LİKE TABLO KAYDI (TOPLU SİL VE YENİDEN YAZ)
    if (isBulk && Array.isArray(data)) {
        switch (ruleType) {
            case 'REVENUE':
              await prisma.bonusRuleRevenue.deleteMany({});
              await prisma.bonusRuleRevenue.createMany({ data });
              break;
            case 'PRODUCT':
              await prisma.bonusRuleProduct.deleteMany({});
              await prisma.bonusRuleProduct.createMany({ data });
              break;
            case 'PENALTY':
              await prisma.bonusRulePenalty.deleteMany({});
              await prisma.bonusRulePenalty.createMany({ data });
              break;
            case 'MILESTONE':
              await prisma.bonusRuleMilestone.deleteMany({});
              await prisma.bonusRuleMilestone.createMany({ data });
              break;
            // 🚀 YENİ: Maaş tablosunu kaydeden kural seti
            case 'SALARY':
              await prisma.titleRewardSetting.deleteMany({});
              await prisma.titleRewardSetting.createMany({ data });
              break;
            default:
              return NextResponse.json({ error: "Geçersiz kural tipi" }, { status: 400 });
        }
        return NextResponse.json({ success: true, message: "Tablo başarıyla senkronize edildi." });
    }

    return NextResponse.json({ error: "Sadece Bulk (Toplu) işlem desteklenmektedir." }, { status: 400 });
  } catch (error: any) {
    console.error("POST Hatası:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}