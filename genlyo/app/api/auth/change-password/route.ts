import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@adapter-pg';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    // 1. Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // 2. Mevcut şifreyi doğrula
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Mevcut şifreniz hatalı" }, { status: 400 });
    }

    // 3. Yeni şifreyi hashle
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // 4. Veritabanını güncelle
    await prisma.user.update({
      where: { email: session.user.email },
      data: { password: hashedNewPassword },
    });

    return NextResponse.json({ message: "Şifre başarıyla güncellendi" });
  } catch (error: any) {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
