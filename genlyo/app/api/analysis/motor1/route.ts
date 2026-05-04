// @ts-nocheck
import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const startMonth = parseInt(searchParams.get('startMonth') || (new Date().getMonth() + 1).toString());
    const endMonth = parseInt(searchParams.get('endMonth') || (new Date().getMonth() + 1).toString());
    const level = searchParams.get('level') || 'STORE'; 
    const filterId = searchParams.get('filterId'); 

    const today = new Date();
    
    let start = new Date(Date.UTC(year, startMonth - 1, 1, 0, 0, 0));
    let end = new Date(Date.UTC(year, endMonth, 0, 23, 59, 59));

    let isCurrentMonth = false;
    if (year === today.getUTCFullYear() && endMonth === today.getUTCMonth() + 1) {
        isCurrentMonth = true;
        end = new Date(Date.UTC(year, endMonth - 1, today.getUTCDate(), 23, 59, 59));
    }

    const prevYrStart = new Date(Date.UTC(start.getUTCFullYear() - 1, start.getUTCMonth(), start.getUTCDate(), 0, 0, 0));
    const prevYrEnd = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), end.getUTCDate(), 23, 59, 59));

    const prevMoStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, start.getUTCDate(), 0, 0, 0));
    let prevMoEnd;
    if (!isCurrentMonth && end.getUTCDate() === new Date(Date.UTC(year, endMonth, 0)).getUTCDate()) {
        prevMoEnd = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0, 23, 59, 59));
    } else {
        prevMoEnd = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, end.getUTCDate(), 23, 59, 59));
    }

    const targetStart = new Date(Date.UTC(year, startMonth - 1, 1, 0, 0, 0));
    const targetEnd = new Date(Date.UTC(year, endMonth, 0, 23, 59, 59));

    let baseWhere: any = {};
    if (session.user.role === "REGION_MANAGER") baseWhere.regionId = session.user.regionId;
    else if (session.user.role === "STORE_MANAGER") {
        const person = await prisma.personnel.findFirst({ where: { userId: session.user.id } });
        if(person?.storeId) baseWhere.storeId = person.storeId;
    } else if (session.user.role === "ADMIN" && filterId && filterId !== "ALL") {
        if (level === "STORE") baseWhere.storeId = filterId;
        else if (level === "REGION") baseWhere.regionId = filterId;
    }

    const [ currentSales, currentTargets, prevYrSales, prevMoSales ] = await Promise.all([
      prisma.salesFact.findMany({ where: { ...baseWhere, date: { gte: start, lte: end } }, include: { store: true, region: true } }),
      prisma.target.findMany({ where: { ...baseWhere, date: { gte: targetStart, lte: targetEnd } } }),
      prisma.salesFact.findMany({ where: { ...baseWhere, date: { gte: prevYrStart, lte: prevYrEnd } } }),
      prisma.salesFact.findMany({ where: { ...baseWhere, date: { gte: prevMoStart, lte: prevMoEnd } } })
    ]);

    const futureY = endMonth === 12 ? year + 1 : year;
    const futureM = endMonth === 12 ? 1 : endMonth + 1;
    const prevM = endMonth === 1 ? 12 : endMonth - 1;
    const prevMY = endMonth === 1 ? year - 1 : year;

    const allTargetsRaw = await prisma.target.findMany({
        where: { ...baseWhere, date: { gte: new Date(Date.UTC(year - 2, 0, 1)) } }
    });

    const targetDict = {};
    const populateDict = (key, t, y, m) => {
        const amt = Number(t.targetAmount) || 0; // 🚀 GÜVENLİK: Decimal'i Number'a çeviriyoruz
        if (!targetDict[key]) targetDict[key] = { monthly: {}, annual: {} };
        if (!targetDict[key].monthly[y]) targetDict[key].monthly[y] = {};
        targetDict[key].monthly[y][m] = (targetDict[key].monthly[y][m] || 0) + amt;
        targetDict[key].annual[y] = (targetDict[key].annual[y] || 0) + amt;
    };

    allTargetsRaw.forEach(t => {
        const y = t.date.getUTCFullYear();
        const m = t.date.getUTCMonth() + 1;
        if (level === 'STORE') populateDict(t.storeId, t, y, m);
        if (level === 'REGION') populateDict(t.regionId, t, y, m);
        if (level === 'TOTAL') populateDict('TOTAL', t, y, m);
    });

    const map = new Map();
    const getMapItem = (key, name) => {
      if (!map.has(key)) map.set(key, { id: key, name, actual: 0, target: 0, prevYrActual: 0, prevMoActual: 0 });
      return map.get(key);
    };

    // 🚀 GÜVENLİK: Tüm ciro ve hedefler kesinlikle Number'a çevrilerek toplanıyor
    currentSales.forEach(s => {
      const key = level === 'STORE' ? s.storeId : (level === 'REGION' ? s.regionId : 'TOTAL');
      const name = level === 'STORE' ? s.store?.name : (level === 'REGION' ? s.region?.name : 'GENEL MERKEZ');
      getMapItem(key, name).actual += Number(s.revenue) || 0;
    });

    currentTargets.forEach(t => {
      const key = level === 'STORE' ? t.storeId : (level === 'REGION' ? t.regionId : 'TOTAL');
      if (map.has(key)) map.get(key).target += Number(t.targetAmount) || 0;
    });

    prevYrSales.forEach(s => {
      const key = level === 'STORE' ? s.storeId : (level === 'REGION' ? s.regionId : 'TOTAL');
      if (map.has(key)) map.get(key).prevYrActual += Number(s.revenue) || 0;
    });

    prevMoSales.forEach(s => {
      const key = level === 'STORE' ? s.storeId : (level === 'REGION' ? s.regionId : 'TOTAL');
      if (map.has(key)) map.get(key).prevMoActual += Number(s.revenue) || 0;
    });

    const totalDaysInPeriod = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
    
    // Geçen gün Motor 2 ve Hibrit ile tam uyumlu hale getirildi
    let elapsedDays = isCurrentMonth ? today.getUTCDate() : totalDaysInPeriod;
    // Eğer ayın 1'indeysek ve henüz satış yoksa hatayı önlemek için min 1 al
    elapsedDays = Math.max(1, elapsedDays); 
    
    const remainingDays = isCurrentMonth ? (totalDaysInPeriod - elapsedDays) : 0;

    const analysisResult = Array.from(map.values()).map(item => {
      const yoy = item.prevYrActual > 0 ? ((item.actual - item.prevYrActual) / item.prevYrActual) * 100 : null;
      const mom = item.prevMoActual > 0 ? ((item.actual - item.prevMoActual) / item.prevMoActual) * 100 : null;
      const realization = item.target > 0 ? (item.actual / item.target) * 100 : 0;

      // 🚀 HATA DÜZELTMESİ: Geçmiş aylar için EOM her zaman gerçekleşen ciroya eşit olmalı!
      let eomForecast = item.actual; 
      
      // Sadece içinde bulunduğumuz aysak ve kalan gün varsa üzerine tahmin ekle
      if (isCurrentMonth && elapsedDays > 0 && remainingDays > 0) {
        const dailyAverage = item.actual / elapsedDays;
        eomForecast = item.actual + (dailyAverage * remainingDays);
      }

      let futureTargetPrediction = 0;
      let histScore = 100;
      const tDict = targetDict[item.id];

      if (tDict) {
          const getT = (y, m) => (tDict.monthly[y] && tDict.monthly[y][m]) ? tDict.monthly[y][m] : 0;
          const getA = (y) => tDict.annual[y] ? tDict.annual[y] : 0;

          const t_curr = getT(year, endMonth);
          const t_prev = getT(prevMY, prevM);
          const t_ly_curr = getT(year - 1, endMonth);
          const t_ly_next = getT(year - 1, futureM);
          const a_ly = getA(year - 1);
          const a_2ly = getA(year - 2);

          const annual_yoy = a_2ly > 0 ? (a_ly / a_2ly) : 1.15; 
          const current_yoy = t_ly_curr > 0 ? (t_curr / t_ly_curr) : annual_yoy;
          const blended_growth = (current_yoy * 2 + annual_yoy) / 3;

          if (t_ly_next > 0) {
              futureTargetPrediction = t_ly_next * blended_growth;
          } else {
              futureTargetPrediction = t_curr * 1.05; 
          }

          const recent_mom = t_prev > 0 ? (t_curr / t_prev) : 1;
          const ly_mom = getT(year - 1, prevM) > 0 ? (t_ly_curr / getT(year - 1, prevM)) : 1;
          const momentum_factor = ly_mom > 0 ? (recent_mom / ly_mom) : 1;
          const safe_momentum = Math.max(0.85, Math.min(momentum_factor, 1.15));
          
          futureTargetPrediction = futureTargetPrediction * safe_momentum;
          const prevYrActual = item.prevYrActual;
          const prevYrRealization = t_ly_curr > 0 ? (prevYrActual / t_ly_curr) * 100 : 100;
          histScore = Math.min(prevYrRealization, 100);
      }

      return {
        id: item.id,
        ad: item.name,
        gerceklesen: Math.round(item.actual),
        hedef: Math.round(item.target),
        gecenYilGerceklesen: Math.round(item.prevYrActual),
        gecenAyGerceklesen: Math.round(item.prevMoActual), 
        yoy: yoy !== null ? parseFloat(yoy.toFixed(1)) : null, 
        mom: mom !== null ? parseFloat(mom.toFixed(1)) : null, 
        gerceklesmeOrani: parseFloat(realization.toFixed(1)),
        aySonuTahmini: Math.round(eomForecast),
        gelecekHedefOnerisi: Math.round(futureTargetPrediction),
        performansSkoru: parseFloat(histScore.toFixed(1)),
        isCurrentMonth
      };
    });

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error("MOTOR 1 HATASI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}