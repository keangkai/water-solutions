import { defineConfig } from "prisma/config";

// รันบนเครื่องให้อ่าน .env ให้เอง (ไม่ทับค่าที่ตั้งไว้แล้ว เช่น DATABASE_URL=... npx prisma migrate deploy)
// บน Vercel ไม่มีไฟล์ .env จึงข้ามไปโดยไม่ error
try {
  process.loadEnvFile(".env");
} catch {
  // ไม่มีไฟล์ .env
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
