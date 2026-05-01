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

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

// ============================================================================
// 🧠 1. MOTOR 2: TAKVİM VE ÖZEL GÜN
// ============================================================================

function getNthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): number {
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const offset = (weekday - firstDay.getUTCDay() + 7) % 7;
    return 1 + offset + (nth - 1) * 7;
}

function getBlackFriday(year: number): number {
    const nov1 = new Date(Date.UTC(year, 10, 1));
    const firstFriday = 1 + ((5 - nov1.getUTCDay() + 7) % 7);
    return firstFriday + 21;
}

function getHolidayContext(targetDate: Date) {
    const year = targetDate.getUTCFullYear();
    const HOLIDAYS = [
        { name: "Yılbaşı", m: 1, d: 1, pre: 4, post: 1 },
        { name: "Sevgililer Günü", m: 2, d: 14, pre: 5, post: 1 },
        { name: "23 Nisan", m: 4, d: 23, pre: 2, post: 0 },
        { name: "19 Mayıs", m: 5, d: 19, pre: 2, post: 0 },
        { name: "Anneler Günü", m: 5, d: getNthWeekdayOfMonth(year, 5, 0, 2), pre: 5, post: 1 },
        { name: "Babalar Günü", m: 6, d: getNthWeekdayOfMonth(year, 6, 0, 3), pre: 4, post: 1 },
        { name: "15 Temmuz", m: 7, d: 15, pre: 1, post: 0 },
        { name: "30 Ağustos", m: 8, d: 30, pre: 2, post: 0 },
        { name: "29 Ekim", m: 10, d: 29, pre: 2, post: 0 },
        { name: "11.11 İndirimleri", m: 11, d: 11, pre: 3, post: 2 },
        { name: "Black Friday", m: 11, d: getBlackFriday(year), pre: 7, post: 3 },
        { name: "Öğretmenler Günü", m: 11, d: 24, pre: 3, post: 1 }
    ];

    for (const h of HOLIDAYS) {
        const holidayDate = new Date(Date.UTC(year, h.m - 1, h.d));
        const diffDays = Math.floor((targetDate.getTime() - holidayDate.getTime()) / 86400000);
        if (diffDays >= -h.pre && diffDays <= h.post) {
            const window = diffDays < 0 ? h.pre : h.post;
            const intensity = window === 0 ? (diffDays === 0 ? 1 : 0) : 1 - (Math.abs(diffDays) / (window + 1));
            return { name: h.name, intensity: Math.max(0, Math.min(1, intensity)) };
        }
    }
    return { name: null, intensity: 0 };
}

function calculateSlope(data: number[]): number {
    if (data.length < 2) return 0;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, n = data.length;
    for (let i = 0; i < n; i++) {
        sumX += i; sumY += data[i]; sumXY += i * data[i]; sumX2 += i * i;
    }
    const denom = (n * sumX2 - sumX * sumX);
    return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
}

// ============================================================================
// 🤖 2. MOTOR 2: AI SINIFI (Hafıza Uyumlu)
// ============================================================================

class SalesModel {
    data: any[];
    weights: any;
    currentRunRate: number;
    inflationMultiplier: number;
    recentBias: number; 

    constructor(historicalData: any[], existingWeights: any = null) {
        this.data = historicalData.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
        const lastYearStart = new Date(thirtyDaysAgo); lastYearStart.setFullYear(now.getFullYear() - 1);
        const lastYearEnd = new Date(now); lastYearEnd.setFullYear(now.getFullYear() - 1);

        const currentMonthSales = this.data.filter(d => d.date >= thirtyDaysAgo).map(d => d.amount);
        const lastYearPeriodSales = this.data.filter(d => d.date >= lastYearStart && d.date <= lastYearEnd).map(d => d.amount);

        const currentAvg = currentMonthSales.length > 0 ? (currentMonthSales.reduce((a,b)=>a+b,0)/currentMonthSales.length) : 0;
        const lastYearAvg = lastYearPeriodSales.length > 0 ? (lastYearPeriodSales.reduce((a,b)=>a+b,0)/lastYearPeriodSales.length) : (currentAvg / 1.8); 

        this.currentRunRate = currentAvg || 1000;
        this.inflationMultiplier = lastYearAvg > 0 ? (currentAvg / lastYearAvg) : 1.8; 
        
        this.recentBias = 1.0; 

        this.weights = existingWeights || {
            base: 1.0,
            dow: [1.15, 0.9, 0.9, 0.9, 0.9, 1.1, 1.25],
            holidays: {}
        };
    }

    train() {
        if (this.data.length < 7) return;
        let baseLr = 0.05;
        let totalDirectionalError = 0;
        let biasCount = 0;

        for (let i = 7; i < this.data.length; i++) {
            const current = this.data[i];
            const dow = current.date.getUTCDay();
            const holidayCtx = getHolidayContext(current.date);

            const history = this.data.slice(Math.max(0, i - 14), i).map(d => d.amount);
            const baseline = history.reduce((a, b) => a + b, 0) / history.length || this.currentRunRate;
            
            const slope = calculateSlope(history);
            const trend = 1 + (slope / (baseline || 1));
            const hEff = holidayCtx.name ? (1 + (((this.weights.holidays[holidayCtx.name] || 1.3) - 1) * holidayCtx.intensity)) : 1.0;

            const predicted = baseline * Math.max(0.85, Math.min(1.15, trend)) * this.weights.base * this.weights.dow[dow] * hEff;
            const actual = current.amount;
            if (actual <= 0) continue;

            const errorPct = Math.abs(actual - predicted) / actual;
            
            if (i > this.data.length - 30) {
                const directionalError = (actual - predicted) / actual;
                totalDirectionalError += directionalError;
                biasCount++;
            }

            const lr = baseLr * (1 / (1 + errorPct));
            const gradient = (actual - predicted) / actual;
            this.weights.base += gradient * lr * 0.1;
            this.weights.dow[dow] += gradient * lr * 0.15;
            if (holidayCtx.name) {
                this.weights.holidays[holidayCtx.name] = (this.weights.holidays[holidayCtx.name] || 1.3) + gradient * lr * 0.4;
            }
        }
        
        if (biasCount > 0) {
            const avgBias = totalDirectionalError / biasCount;
            this.recentBias = 1 + Math.max(-0.25, Math.min(0.25, avgBias));
        }
    }

    predict(date: Date) {
        const dow = date.getUTCDay();
        const holidayCtx = getHolidayContext(date);
        const lastYearDate = new Date(date); lastYearDate.setFullYear(date.getFullYear() - 1);
        
        const lastYearData = this.data.find(d => d.date.toISOString().split('T')[0] === lastYearDate.toISOString().split('T')[0]);
        let baseline = lastYearData ? (lastYearData.amount * this.inflationMultiplier) : this.currentRunRate;
        
        baseline = Math.max(baseline, this.currentRunRate * 0.85);

        const hWeight = holidayCtx.name ? (this.weights.holidays[holidayCtx.name] || 1.3) : 1.0;
        const hEff = 1 + (hWeight - 1) * holidayCtx.intensity;

        let result = baseline * this.weights.base * this.weights.dow[dow] * hEff;
        result = result * this.recentBias;

        return { predicted: Math.max(0, result) };
    }
}

function getSafeguardedTarget(targets: any[], salesPredictions: number[], year: number, month: number): number {
    const explicitTarget = targets.filter(t => t.date.getUTCFullYear() === year && t.date.getUTCMonth() + 1 === month).reduce((a, b) => a + b.amount, 0);
    if (explicitTarget > 0) return explicitTarget; 

    const sumSales = salesPredictions.reduce((a,b)=>a+b,0);
    const lastYear = targets.filter(t => t.date.getUTCFullYear() === year-1 && t.date.getUTCMonth()+1 === month).reduce((a,b)=>a+b.amount,0);
    
    let finalTarget = sumSales * 1.15; 
    if (lastYear > 0) finalTarget = Math.max(finalTarget, lastYear * 1.6); 
    
    finalTarget = Math.max(finalTarget, sumSales * 1.05);
    finalTarget = Math.min(finalTarget, sumSales * 1.35);

    return finalTarget;
}

// ============================================================================
// ⚙️ 3. ANA HİBRİT API
// ============================================================================

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') || 'STORE'; 
    const filterId = searchParams.get('filterId'); 

    const today = new Date();
    const reqYear = today.getUTCFullYear();
    const reqMonth = today.getUTCMonth() + 1; 
    
    const nextMonth = reqMonth === 12 ? 1 : reqMonth + 1;
    const nextYear = reqMonth === 12 ? reqYear + 1 : reqYear;
    
    const monthDays = new Date(Date.UTC(reqYear, reqMonth, 0)).getUTCDate();
    const nextMonthDays = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
    
    // 🚀 GÜNCELLENDİ: Motor 1 ile BİREBİR aynı gün hesabı
    const isCurrentMonth = true; // Zaten anasayfa her zaman içinde bulunduğumuz ayı gösterir
    let elapsedDays = Math.max(1, today.getUTCDate()); 
    const remainingDays = monthDays - elapsedDays;

    let baseWhere: any = {};
    if (session.user.role === "REGION_MANAGER") baseWhere.regionId = session.user.regionId;
    else if (session.user.role === "STORE_MANAGER") {
        const person = await prisma.personnel.findFirst({ where: { user: { id: session.user.id } } });
        if(person?.storeId) baseWhere.storeId = person.storeId;
    } else if (session.user.role === "ADMIN" && filterId && filterId !== "ALL") {
        if (level === "STORE") baseWhere.storeId = filterId;
        else if (level === "REGION") baseWhere.regionId = filterId;
    }

    const [sales, targets, weights] = await Promise.all([
        prisma.salesFact.findMany({ where: baseWhere }),
        prisma.target.findMany({ where: baseWhere }),
        prisma.modelWeight?.findMany({ where: baseWhere }).catch(() => [])
    ]);

    const stores = new Map();
    sales.forEach(s => {
        if (!stores.has(s.storeId)) stores.set(s.storeId, { s: [], t: [] });
        stores.get(s.storeId).s.push({ date: s.date, amount: Number(s.revenue) || 0 });
    });
    targets.forEach(t => {
        if (stores.has(t.storeId)) stores.get(t.storeId).t.push({ date: t.date, amount: Number(t.targetAmount) || 0 });
    });

    // MOTOR 1 İÇİN HEDEF SÖZLÜĞÜ (Target Dict)
    const targetDict = {};
    targets.forEach(t => {
        const y = t.date.getUTCFullYear();
        const m = t.date.getUTCMonth() + 1;
        const key = t.storeId;
        const amt = Number(t.targetAmount) || 0;
        if (!targetDict[key]) targetDict[key] = { monthly: {}, annual: {} };
        if (!targetDict[key].monthly[y]) targetDict[key].monthly[y] = {};
        targetDict[key].monthly[y][m] = (targetDict[key].monthly[y][m] || 0) + amt;
        targetDict[key].annual[y] = (targetDict[key].annual[y] || 0) + amt;
    });

    let m1CurrSalesTotal = 0, m2CurrSalesTotal = 0;
    let m1SalesTotal = 0, m2SalesTotal = 0;
    let m1TargetTotal = 0, m2TargetTotal = 0;
    let currTargetTotal = 0;

    for (const [id, data] of stores.entries()) {
        
        // ============================================
        // 🚀 MOTOR 1: (Mevcut Ay & Gelecek Ay UYUMU)
        // ============================================
        let currActual = 0;
        let prevYrCurrTotal = 0;
        let prevYrNextTotal = 0;

        data.s.forEach(x => {
            const y = x.date.getUTCFullYear();
            const m = x.date.getUTCMonth() + 1;
            if (y === reqYear && m === reqMonth && x.date <= today) currActual += x.amount;
            if (y === reqYear - 1 && m === reqMonth) prevYrCurrTotal += x.amount;
            if (y === reqYear - 1 && m === nextMonth) prevYrNextTotal += x.amount;
        });

        // 🚀 BİREBİR MOTOR 1 FORMÜLÜ: Mevcut Ay (EOM)
        let m1EOM = currActual;
        if (elapsedDays > 0 && remainingDays > 0) {
            const dailyAverage = currActual / elapsedDays;
            m1EOM = currActual + (dailyAverage * remainingDays);
        }
        m1CurrSalesTotal += m1EOM;

        // Motor 1 Gelecek Ay Tahmini (Ciro)
        const yoyGrowth = prevYrCurrTotal > 0 ? (m1EOM / prevYrCurrTotal) : 1.15;
        let m1NextSales = prevYrNextTotal > 0 ? (prevYrNextTotal * Math.max(0.5, Math.min(yoyGrowth, 1.5))) : (m1EOM * 1.05);
        m1SalesTotal += m1NextSales;

        // 🚀 BİREBİR MOTOR 1 FORMÜLÜ: Gelecek Ay Hedef (Blended Growth)
        const tDict = targetDict[id];
        let futureTargetPrediction = 0;

        if (tDict) {
            const getT = (y, m) => (tDict.monthly[y] && tDict.monthly[y][m]) ? tDict.monthly[y][m] : 0;
            const getA = (y) => tDict.annual[y] ? tDict.annual[y] : 0;

            const t_curr = getT(reqYear, reqMonth);
            const prevMY = reqMonth === 1 ? reqYear - 1 : reqYear;
            const prevM = reqMonth === 1 ? 12 : reqMonth - 1;
            const t_prev = getT(prevMY, prevM);
            const t_ly_curr = getT(reqYear - 1, reqMonth);
            const t_ly_next = getT(reqYear - 1, nextMonth);
            const a_ly = getA(reqYear - 1);
            const a_2ly = getA(reqYear - 2);

            const annual_yoy = a_2ly > 0 ? (a_ly / a_2ly) : 1.15; 
            const current_yoy = t_ly_curr > 0 ? (t_curr / t_ly_curr) : annual_yoy;
            const blended_growth = (current_yoy * 2 + annual_yoy) / 3;

            if (t_ly_next > 0) {
                futureTargetPrediction = t_ly_next * blended_growth;
            } else {
                futureTargetPrediction = t_curr * 1.05; 
            }

            const recent_mom = t_prev > 0 ? (t_curr / t_prev) : 1;
            const ly_mom = getT(reqYear - 1, prevM) > 0 ? (t_ly_curr / getT(reqYear - 1, prevM)) : 1;
            const momentum_factor = ly_mom > 0 ? (recent_mom / ly_mom) : 1;
            const safe_momentum = Math.max(0.85, Math.min(momentum_factor, 1.15));
            
            futureTargetPrediction = futureTargetPrediction * safe_momentum;
        } else {
            futureTargetPrediction = m1NextSales * 1.15;
        }
        m1TargetTotal += futureTargetPrediction;


        // ============================================
        // 🚀 MOTOR 2: (Enflasyon, Momentum ve Yapay Zeka Modeli)
        // ============================================
        let currTarget = data.t.find(t => t.date.getUTCFullYear() === reqYear && t.date.getUTCMonth() + 1 === reqMonth)?.amount || 0;
        currTargetTotal += currTarget;

        const w = (weights || []).find(x => x.storeId === id);
        const model = new SalesModel(data.s, w?.salesWeight);
        model.train(); 

        let mtdPredictedBase = 0;
        for (let d = 1; d <= today.getUTCDate(); d++) {
            const date = new Date(Date.UTC(reqYear, reqMonth - 1, d));
            const dStr = date.toISOString().split('T')[0];
            const act = data.s.find(x => x.date.toISOString().split('T')[0] === dStr);
            if (act && act.amount > 0) {
                mtdPredictedBase += model.predict(date).predicted;
            }
        }

        let activeMomentum = 1.0;
        if (mtdPredictedBase > 0 && currActual > 0) {
            activeMomentum = currActual / mtdPredictedBase;
            activeMomentum = Math.max(0.5, Math.min(3.0, activeMomentum)); 
        }

        let m2EOM = 0;
        for (let d = 1; d <= monthDays; d++) {
            const date = new Date(Date.UTC(reqYear, reqMonth - 1, d));
            let res = model.predict(date).predicted;
            if (d > today.getUTCDate()) res = res * activeMomentum;
            
            const dStr = date.toISOString().split('T')[0];
            const act = data.s.find(x => x.date.toISOString().split('T')[0] === dStr);

            if (date <= today && act) m2EOM += act.amount;
            else m2EOM += res;
        }
        m2CurrSalesTotal += m2EOM;

        let m2NextSales = 0;
        const nPreds = [];
        for(let d = 1; d <= nextMonthDays; d++) {
            let nP = model.predict(new Date(Date.UTC(nextYear, nextMonth - 1, d))).predicted;
            if (activeMomentum > 1.1) nP = nP * 1.1; 
            nPreds.push(nP);
            m2NextSales += nP;
        }
        m2SalesTotal += m2NextSales;

        let m2NextTarget = getSafeguardedTarget(data.t, nPreds, nextYear, nextMonth);
        m2TargetTotal += m2NextTarget;
    }

    return NextResponse.json({
        currMonthName: MONTHS[reqMonth - 1],
        nextMonthName: MONTHS[nextMonth - 1],
        
        m1CurrSales: Math.round(m1CurrSalesTotal),
        m2CurrSales: Math.round(m2CurrSalesTotal),
        hybridCurrSales: Math.round((m1CurrSalesTotal + m2CurrSalesTotal) / 2),
        currTarget: Math.round(currTargetTotal),

        m1Sales: Math.round(m1SalesTotal),
        m2Sales: Math.round(m2SalesTotal),
        hybridSales: Math.round((m1SalesTotal + m2SalesTotal) / 2),
        m1Target: Math.round(m1TargetTotal),
        m2Target: Math.round(m2TargetTotal),
        hybridTarget: Math.round((m1TargetTotal + m2TargetTotal) / 2)
    });

  } catch (error) {
    console.error("HİBRİT MOTOR HATASI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}