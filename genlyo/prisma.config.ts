import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    // Supabase'de tablo oluştururken (push/migrate) her zaman doğrudan bağlantı (DIRECT_URL) kullanılır.
    url: process.env.DIRECT_URL,
  },
});