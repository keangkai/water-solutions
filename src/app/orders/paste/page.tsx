export const dynamic = "force-dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { earliestDeliveryDate, todayInBangkok } from "@/lib/delivery";
import { warehouseOptionsFor } from "@/lib/warehouses";
import { recentIncidentCounts } from "@/lib/incidents";
import { PasteOrders } from "./paste-orders";

export default async function PasteOrdersPage() {
  const today = todayInBangkok();
  const [incidentCounts, customerRows, products, warehouses] = await Promise.all([
    recentIncidentCounts(),
    prisma.partner.findMany({ where: { type: "CUSTOMER" }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const customers = customerRows.map((c) => ({ ...c, recentIncidents: incidentCounts.get(c.id) ?? 0 }));

  return (
    <div className="space-y-5">
      <Link href="/orders" className="inline-flex items-center gap-1 min-h-[44px] text-sm text-slate-500 hover:text-slate-900 touch-manipulation">
        <ArrowLeft className="size-4" /> ออเดอร์
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">วางข้อความจากไลน์</h1>
        <p className="text-sm text-slate-500 mt-1">
          วางข้อความออเดอร์ที่ได้รับ ระบบจะอ่านชื่อ เบอร์ สินค้า ที่อยู่ วันและรอบส่งมากรอกฟอร์มให้ ตรวจแล้วค่อยกดบันทึก
        </p>
      </div>
      <PasteOrders
        customers={customers}
        products={products}
        warehouses={warehouseOptionsFor(warehouses)}
        today={today}
        minDeliveryDate={earliestDeliveryDate(today)}
      />
    </div>
  );
}
