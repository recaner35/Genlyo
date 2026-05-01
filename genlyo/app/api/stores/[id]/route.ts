// @ts-nocheck
import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 1. DÜZENLEME İÇİN VERİ GETİRME (GET)
export async function GET(request: Request, context: { params: any }) {
  try {
    const resolvedParams = await context.params;
    const storeId = resolvedParams.id;

    if (!storeId) {
      return NextResponse.json({ error: "Geçersiz Mağaza ID" }, { status: 400 });
    }

    // 🚀 ÇÖZÜM: Personelleri ayrı bir sorguyla yanlış aramak yerine,
    // Doğrudan "Mağaza" üzerinden "Personel Geçmişi" ilişkisiyle tek seferde ve güvenle çekiyoruz!
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        region: {
          include: { channel: true, manager: true }
        },
        city: true,
        personnelHistory: {
          include: {
            personnel: {
              include: { title: true }
            }
          }
        }
      }
    });

    if (!store) {
      return NextResponse.json({ error: "Mağaza bulunamadı" }, { status: 404 });
    }

    // Veri zaten frontend'in istediği kusursuz formatta geliyor
    return NextResponse.json({ store: store });
  } catch (error: any) {
    console.error("GET HATASI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. TOPLU İŞLEM VE KAYDETME İÇİN GÜNCELLEME (PATCH)
export async function PATCH(request: Request, context: { params: any }) {
  try {
    const resolvedParams = await context.params;
    const storeId = resolvedParams.id;
    
    if (!storeId) {
      return NextResponse.json({ error: "Geçersiz Mağaza ID" }, { status: 400 });
    }

    const body = await request.json();
    const updateData: any = {};

    // Gelen verileri kontrol edip sadece değişenleri objeye ekliyoruz
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.regionId !== undefined && body.regionId !== "") updateData.regionId = body.regionId;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.email !== undefined) updateData.email = body.email;
    
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: updateData
    });

    return NextResponse.json({ success: true, store: updatedStore });
  } catch (error: any) {
    console.error("PATCH HATASI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}