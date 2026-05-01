import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import Papa from 'papaparse';

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

    // 1. KANALLAR
    const uniqueChannels = [...new Set(rows.map(r => r['Kanal']?.trim()).filter(Boolean))];
    const existingC = await prisma.channel.findMany({ where: { name: { in: uniqueChannels } } });
    const cMap = new Map(existingC.map(c => [c.name.toLowerCase(), c.id]));
    
    const newC = uniqueChannels.filter(n => !cMap.has(n.toLowerCase())).map(name => ({ name }));
    if (newC.length > 0) await prisma.channel.createMany({ data: newC, skipDuplicates: true });
    
    const updatedC = await prisma.channel.findMany({ where: { name: { in: uniqueChannels } } });
    updatedC.forEach(c => cMap.set(c.name.toLowerCase(), c.id));

    // 2. BÖLGELER
    const rData = new Map();
    rows.forEach(r => {
      const reg = r['Bölge']?.trim(); const chan = r['Kanal']?.trim();
      if(reg && chan) { const cId = cMap.get(chan.toLowerCase()); if(cId) rData.set(reg, cId); }
    });
    const uRegs = Array.from(rData.keys());
    const existingR = await prisma.region.findMany({ where: { name: { in: uRegs } } });
    const rMap = new Map(existingR.map(r => [r.name.toLowerCase(), r.id]));

    const newR = uRegs.filter(n => !rMap.has(n.toLowerCase())).map(name => ({ name, channelId: rData.get(name) }));
    if (newR.length > 0) await prisma.region.createMany({ data: newR, skipDuplicates: true });
    
    const updatedR = await prisma.region.findMany({ where: { name: { in: uRegs } } });
    updatedR.forEach(r => rMap.set(r.name.toLowerCase(), r.id));

    // 3. İLLER
    const cData = new Map();
    rows.forEach(r => {
      const city = r['İl']?.trim(); const reg = r['Bölge']?.trim();
      if(city && reg) { const rId = rMap.get(reg.toLowerCase()); if(rId) cData.set(city, rId); }
    });
    const uCities = Array.from(cData.keys());
    const existingCity = await prisma.city.findMany({ where: { name: { in: uCities } } });
    const cityMap = new Map(existingCity.map(c => [c.name.toLowerCase(), c.id]));

    const newCity = uCities.filter(n => !cityMap.has(n.toLowerCase())).map(name => ({ name, regionId: cData.get(name) }));
    if (newCity.length > 0) await prisma.city.createMany({ data: newCity, skipDuplicates: true });
    
    const updatedCity = await prisma.city.findMany({ where: { name: { in: uCities } } });
    updatedCity.forEach(c => cityMap.set(c.name.toLowerCase(), c.id));

    // 4. MAĞAZALAR
    const sData = new Map();
    rows.forEach(r => {
      const store = r['Mağaza']?.trim(); const city = r['İl']?.trim(); const reg = r['Bölge']?.trim();
      if(store && city && reg) {
        const cId = cityMap.get(city.toLowerCase()); const rId = rMap.get(reg.toLowerCase());
        if(cId && rId) sData.set(store, { cityId: cId, regionId: rId });
      }
    });
    const uStores = Array.from(sData.keys());
    const existingS = await prisma.store.findMany({ where: { name: { in: uStores } } });
    const sMap = new Map(existingS.map(s => [s.name.toLowerCase(), s.id]));

    const newS = uStores.filter(n => !sMap.has(n.toLowerCase())).map(name => ({
      name, cityId: sData.get(name).cityId, regionId: sData.get(name).regionId, category: "Standart", isActive: true
    }));
    if (newS.length > 0) await prisma.store.createMany({ data: newS, skipDuplicates: true });
    
    const updatedS = await prisma.store.findMany({ where: { name: { in: uStores } } });
    updatedS.forEach(s => sMap.set(s.name.toLowerCase(), s.id));

    // 5. ÜNVANLAR
    const uTitles = [...new Set(rows.map(r => r['Ünvanı']?.trim()).filter(Boolean))];
    if (!uTitles.includes('Bölge Müdürü')) uTitles.push('Bölge Müdürü');
    
    const existingT = await prisma.jobTitle.findMany({ where: { name: { in: uTitles } } });
    const tMap = new Map(existingT.map(t => [t.name.toLowerCase(), t.id]));

    const newT = uTitles.filter(n => !tMap.has(n.toLowerCase())).map(name => ({ name, level: 1 }));
    if (newT.length > 0) await prisma.jobTitle.createMany({ data: newT, skipDuplicates: true });
    
    const updatedT = await prisma.jobTitle.findMany({ where: { name: { in: uTitles } } });
    updatedT.forEach(t => tMap.set(t.name.toLowerCase(), t.id));

    // 6. PERSONELLERİ HAZIRLA
    const pData: any[] = []; 
    const seenP = new Set();
    const managerTitleId = tMap.get('bölge müdürü');

    // 6A. Bölge Müdürleri
    rows.forEach(r => {
      const mName = r['Bölge Müdürü']?.trim();
      if (mName && managerTitleId) {
        const parts = mName.split(' '); const last = parts.length > 1 ? parts.pop() : ''; const first = parts.join(' ');
        const pKey = `manager-${first} ${last}`.toLowerCase();
        if (!seenP.has(pKey)) {
          pData.push({ firstName: first, lastName: last, titleId: managerTitleId, metadataKey: pKey });
          seenP.add(pKey);
        }
      }
    });

    // 6B. Mağaza Personelleri
    rows.forEach(r => {
      const pName = r['Personel Adı']?.trim(); const tName = r['Ünvanı']?.trim(); const sName = r['Mağaza']?.trim();
      if(pName && tName && sName) {
        const tId = tMap.get(tName.toLowerCase());
        if(tId) {
          const parts = pName.split(' '); const last = parts.length > 1 ? parts.pop() : ''; const first = parts.join(' ');
          const pKey = `store-${first} ${last}-${sName}`.toLowerCase();
          if (!seenP.has(pKey)) {
            pData.push({ firstName: first, lastName: last, titleId: tId, metadataKey: pKey });
            seenP.add(pKey);
          }
        }
      }
    });

    // 🚀🚀🚀 İŞTE ZAMAN AŞIMINI ÇÖZEN PARALEL YÜKLEME SİSTEMİ 🚀🚀🚀
    const personToIdMap = new Map();
    const chunkSize = 50; // Aynı anda 50 kişiyi kaydet (Sunucuyu yormadan hızı 50'ye katlar)
    
    for (let i = 0; i < pData.length; i += chunkSize) {
      const chunk = pData.slice(i, i + chunkSize);
      // await Promise.all ile 50 işlemi paralel yolluyoruz
      await Promise.all(chunk.map(async (p) => {
        const newPerson = await prisma.personnel.create({
          data: { firstName: p.firstName, lastName: p.lastName, titleId: p.titleId }
        });
        personToIdMap.set(p.metadataKey, newPerson.id);
      }));
    }
    // 🚀🚀🚀 🚀🚀🚀 🚀🚀🚀 🚀🚀🚀 🚀🚀🚀 🚀🚀🚀 🚀🚀🚀 🚀🚀🚀

    // 7. GÖREV ATAMALARI
    const hData: any[] = [];
    const seenH = new Set();

    rows.forEach(r => {
      const mName = r['Bölge Müdürü']?.trim(); const regName = r['Bölge']?.trim();
      if (mName && regName) {
        const parts = mName.split(' '); const last = parts.length > 1 ? parts.pop() : ''; const first = parts.join(' ');
        const pKey = `manager-${first} ${last}`.toLowerCase();
        const pId = personToIdMap.get(pKey);
        const rId = rMap.get(regName.toLowerCase());

        if (pId && rId) {
          const hKey = `reg-${pId}-${rId}`;
          if (!seenH.has(hKey)) {
            hData.push({ personnelId: pId, regionId: rId, startDate: new Date() });
            seenH.add(hKey);
          }
        }
      }
    });

    rows.forEach(r => {
      const pName = r['Personel Adı']?.trim(); const sName = r['Mağaza']?.trim();
      if(pName && sName) {
        const parts = pName.split(' '); const last = parts.length > 1 ? parts.pop() : ''; const first = parts.join(' ');
        const pKey = `store-${first} ${last}-${sName}`.toLowerCase();
        const pId = personToIdMap.get(pKey);
        const sId = sMap.get(sName.toLowerCase());
        
        if (pId && sId) {
          const hKey = `store-${pId}-${sId}`;
          if(!seenH.has(hKey)) {
            hData.push({ personnelId: pId, storeId: sId, startDate: new Date() });
            seenH.add(hKey);
          }
        }
      }
    });

    if (hData.length > 0) {
      await prisma.personnelHistory.createMany({ data: hData, skipDuplicates: true });
    }

    return NextResponse.json({ success: true, message: `Başarılı! Paralel sistemle yüzlerce personel saniyeler içinde eklendi.` });
    
  } catch (error: any) {
    console.error("YÜKLEME HATASI:", error);
    return NextResponse.json({ error: `Hata: ${error.message}` }, { status: 500 });
  }
}