import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import Papa from 'papaparse';
import bcrypt from 'bcryptjs';

// BAĞLANTI AYARLARI
const connectionString = process.env.DATABASE_URL as string;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Dosya yok' }, { status: 400 });

    const text = (await file.text()).replace(/^\uFEFF/, '');
    const parsedData = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows = parsedData.data as any[];

    // 1. MEVCUT MAĞAZALARI HAFIZAYA AL
    const allStores = await prisma.store.findMany({
      select: { id: true, name: true }
    });
    const storeMap = new Map(allStores.map(s => [s.name.trim().toLowerCase(), s]));

    // 2. ORTAK BAŞLANGIÇ ŞİFRESİNİ ŞİFRELE (Kriptola)
    // Tüm mağazaların ilk şifresi "Sirket2024*" olacak. Hızı artırmak için 1 kez şifreliyoruz.
    const defaultPassword = "Sirket2024*";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    let processedCount = 0;
    const chunkSize = 50;

    // 3. PARALEL İŞLEME BAŞLA
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      
      await Promise.all(chunk.map(async (row) => {
        const storeName = row['Mağaza Adı']?.trim();
        const email = row['Mail']?.trim().toLowerCase();
        const shortCode = row['Kısa Kod']?.trim();

        if (!storeName || !email) return; // İsim veya mail yoksa atla

        const store = storeMap.get(storeName.toLowerCase());

        if (store) {
          // A) MAĞAZAYI GÜNCELLE (Kısa Kod ve Maili Ekle)
          await prisma.store.update({
            where: { id: store.id },
            data: { 
              code: shortCode || null,
              email: email 
            }
          });

          // B) KULLANICIYI (USER) OLUŞTUR VEYA GÜNCELLE
          // upsert: Mail adresi varsa günceller, yoksa sıfırdan oluşturur.
          await prisma.user.upsert({
            where: { email: email },
            update: {
              storeId: store.id,
              role: 'STORE_MANAGER',
              isActive: true
            },
            create: {
              email: email,
              password: hashedPassword, // Kriptolanmış şifre
              name: `${store.name} Müdürü`, // Örn: "İstanbul 212 Müdürü"
              role: 'STORE_MANAGER',
              storeId: store.id,
              isActive: true
            }
          });

          processedCount++;
        }
      }));
    }

    return NextResponse.json({ 
      success: true, 
      message: `Mükemmel! ${processedCount} mağazanın e-postası eklendi ve tüm mağaza müdürü hesapları (Şifre: ${defaultPassword}) başarıyla oluşturuldu.` 
    });

  } catch (error: any) {
    console.error("YÖNETİCİ YÜKLEME HATASI:", error);
    return NextResponse.json({ error: `Hata: ${error.message}` }, { status: 500 });
  }
}