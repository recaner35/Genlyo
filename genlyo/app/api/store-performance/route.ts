// app/api/store-performance/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// 🚀 DÜZELTME: Supabase bağlantı adaptörünü Prisma'ya doğru şekilde tanıtıyoruz
const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const month = parseInt(searchParams.get('month') || '0');
    const year = parseInt(searchParams.get('year') || '0');

    if (!storeId || !month || !year) return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });

    const store = await prisma.store.findUnique({
        where: { id: storeId }
    });

    if (!store) return NextResponse.json({ error: "Mağaza bulunamadı" }, { status: 404 });

    const personnelHistories = await prisma.personnelHistory.findMany({
        where: { storeId: storeId },
        include: { personnel: { include: { title: true } } },
        orderBy: { startDate: 'desc' }
    });

    const uniquePersonnels = new Map();
    for (const ph of personnelHistories) {
        if (!uniquePersonnels.has(ph.personnelId)) {
            uniquePersonnels.set(ph.personnelId, ph.personnel);
        }
    }
    const personnels = Array.from(uniquePersonnels.values());

    const monthlyData = await prisma.personnelMonthlyData.findMany({
        where: { storeId, month, year }
    });

    const [revenueRules, productRules, penaltyRules, milestoneRules, titleRewards] = await Promise.all([
      prisma.bonusRuleRevenue.findMany(),
      prisma.bonusRuleProduct.findMany(),
      prisma.bonusRulePenalty.findMany({ where: { isActive: true } }),
      prisma.bonusRuleMilestone.findMany(),
      prisma.titleRewardSetting.findMany()
    ]);

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const targets = await prisma.target.findMany({
        where: { storeId, date: { gte: startDate, lte: endDate } }
    });
    const totalTarget = targets.reduce((sum, t) => sum + t.targetAmount, 0);

    const sales = await prisma.salesFact.findMany({
        where: { storeId, date: { gte: startDate, lte: endDate } }
    });
    const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);

    let storeHitRate = 0;
    if (totalTarget > 0) {
        storeHitRate = (totalRevenue / totalTarget) * 100;
    }

    return NextResponse.json({ 
        storeCategory: store?.category || "A",
        personnels, 
        monthlyData, 
        rules: { revenueRules, productRules, penaltyRules, milestoneRules, titleRewards },
        storeHitRate,
        totalTarget,
        totalRevenue
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const body = await request.json();
    const { storeId, month, year, data } = body;

    for (const item of data) {
        await prisma.personnelMonthlyData.upsert({
            where: { personnelId_month_year: { personnelId: item.personnelId, month, year } },
            update: {
                ownRevenue: item.ownRevenue,
                targetHitRate: item.targetHitRate,
                techServiceEarn: item.techServiceEarn,
                productSalesData: item.productSalesData,
                penaltySalesData: item.penaltySalesData,
                baseSalary: item.baseSalary,
                travelAllowance: item.travelAllowance,
                calculatedRevenueBonus: item.calculatedRevenueBonus,
                calculatedBrandBonus: item.calculatedBrandBonus,
                calculatedMilestoneBonus: item.calculatedMilestoneBonus,
                calculatedSpecialBonus: item.calculatedSpecialBonus,
                totalEarnings: item.totalEarnings
            },
            create: {
                personnelId: item.personnelId,
                storeId, month, year,
                ownRevenue: item.ownRevenue,
                targetHitRate: item.targetHitRate, 
                techServiceEarn: item.techServiceEarn,
                productSalesData: item.productSalesData,
                penaltySalesData: item.penaltySalesData,
                baseSalary: item.baseSalary,
                travelAllowance: item.travelAllowance,
                calculatedRevenueBonus: item.calculatedRevenueBonus,
                calculatedBrandBonus: item.calculatedBrandBonus,
                calculatedMilestoneBonus: item.calculatedMilestoneBonus,
                calculatedSpecialBonus: item.calculatedSpecialBonus,
                totalEarnings: item.totalEarnings
            }
        });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}