import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * 🚀 DOKÜMANTASYON:
 * Bu Singleton yapısı, Next.js'in geliştirme modunda sürekli yeni 
 * veritabanı bağlantısı açmasını engeller. Adaptör yapısını 
 * açık bir şekilde tanımlayarak "InitializationError" hatasını giderir.
 */

const connectionString = process.env.DATABASE_URL || ""
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma