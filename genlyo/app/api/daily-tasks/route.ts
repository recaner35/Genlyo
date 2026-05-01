import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma"; // 🚀 Merkezi prisma'yı çağırıyoruz
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const currentUser = await prisma.user.findUnique({ 
      where: { email: session.user.email as string } 
    });

    if (!currentUser?.storeId) return NextResponse.json({ error: "Mağaza bulunamadı" }, { status: 404 });

    // 🚀 ÖNEMLİ: Tablo isminin prisma.dailyTask (küçük harfle başlar) olduğundan emin ol
    const latestTask = await prisma.dailyTask.findFirst({
      where: { storeId: currentUser.storeId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(latestTask || {});
  } catch (error: any) {
    console.error("API_GET_ERROR:", error);
    return NextResponse.json({ error: "Kayıt bulunamadı veya tablo henüz oluşmadı." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const currentUser = await prisma.user.findUnique({ 
      where: { email: session.user.email as string } 
    });
    
    const body = await request.json();

    const newTask = await prisma.dailyTask.create({
      data: {
        storeId: currentUser?.storeId || "",
        erpTotal: parseFloat(body.erpTotal) || 0,
        cashCounts: body.cashCounts || {},
        expenses: body.expenses || [],
        selectedStaff: body.selectedStaff || "",
        shiftType: body.shiftType || "KAPANIŞ",
        toBank: parseFloat(body.toBank) || 0,
        difference: parseFloat(body.difference) || 0
      }
    });

    return NextResponse.json({ success: true, id: newTask.id });
  } catch (error: any) {
    console.error("API_POST_ERROR:", error);
    return NextResponse.json({ error: "Kaydedilemedi: " + error.message }, { status: 500 });
  }
}