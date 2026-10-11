export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImportForm } from "./import-form";
import { warehouseOptionsFor } from "@/lib/warehouses";
import { ChevronLeft, FileSpreadsheet } from "lucide-react";

export default async function ImportOrdersPage() {
  const [products, warehouses] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" }, include: { brand: true } }),
    prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-sky-600">
        <ChevronLeft className="size-4" /> กลับไปออเดอร์
      </Link>
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">นำเข้าออเดอร์จาก Excel</h1>
      </div>
      <p className="text-sm text-slate-500">
        เปิดไฟล์ Excel เลือกเซลล์ทั้งตาราง (รวมแถวหัวคอลัมน์) คัดลอก แล้ววางในช่องด้านล่าง ระบบจะแสดงตัวอย่างให้ตรวจก่อนนำเข้าจริง
        คอลัมน์ที่ใช้: ชื่อ, เบอร์, ขนาดน้ำ (เช่น 600 ml), รวมจำนวน, วันที่สั่ง, วันที่ส่ง (เดือน/วัน/ปี พ.ศ.), ที่อยู่, ช่องทาง และลิงก์แผนที่
      </p>
      {warehouses.some((w) => w.isActive) && products.length > 0 ? (
        <ImportForm
          products={products.map((p) => ({ id: p.id, label: [p.brand?.name, p.name, p.size].filter(Boolean).join(" · "), size: p.size }))}
          warehouses={warehouseOptionsFor(warehouses)}
        />
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4">ต้องมีสินค้าและคลังก่อน</div>
      )}
    </div>
  );
}
