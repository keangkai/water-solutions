import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Package,
  Users,
  ArrowLeftRight,
  BarChart3,
  AlertTriangle,
  Wallet,
} from "lucide-react";

export default async function Home() {
  const [productCount, partnerCount, products, movements] = await Promise.all([
    prisma.product.count(),
    prisma.partner.count(),
    prisma.product.findMany(),
    prisma.movement.findMany({ include: { lines: true } }),
  ]);

  // กระจาย lines ของแต่ละใบให้พกพา type ของ movement ติดไปด้วย เพื่อคำนวณต่อสินค้าเหมือนเดิม
  const movementLines = movements.flatMap((m) => m.lines.map((l) => ({ ...l, type: m.type })));

  let totalProfit = 0;
  let lowStockCount = 0;

  for (const product of products) {
    const productLines = movementLines.filter((l) => l.productId === product.id);
    const qtyIn = productLines.filter((l) => l.type === "IN").reduce((s, l) => s + l.quantity, 0);
    const qtyOut = productLines.filter((l) => l.type === "OUT").reduce((s, l) => s + l.quantity, 0);
    const costIn = productLines.filter((l) => l.type === "IN").reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const revenue = productLines.filter((l) => l.type === "OUT").reduce((s, l) => s + l.quantity * l.unitPrice, 0);

    // หักต้นทุนเฉพาะของที่ขายไปแล้ว (เฉลี่ยถ่วงน้ำหนัก) ไม่เอาต้นทุนของสต็อกที่ยังขายไม่ออกมาหัก
    const avgCost = qtyIn > 0 ? costIn / qtyIn : 0;
    totalProfit += revenue - avgCost * qtyOut;

    if (qtyIn - qtyOut < product.reorderPoint) lowStockCount += 1;
  }

  const profit = totalProfit;

  const stats = [
    { label: "สินค้าทั้งหมด", value: productCount, icon: Package, color: "text-sky-600 bg-sky-50" },
    { label: "คู่ค้าทั้งหมด", value: partnerCount, icon: Users, color: "text-violet-600 bg-violet-50" },
    {
      label: "สต็อกต่ำกว่าจุดแจ้งเตือน",
      value: lowStockCount,
      icon: AlertTriangle,
      color: lowStockCount > 0 ? "text-red-600 bg-red-50" : "text-slate-500 bg-slate-100",
    },
    {
      label: "กำไรที่แท้จริง",
      value: profit.toLocaleString(),
      icon: Wallet,
      color: profit >= 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50",
    },
  ];

  const cards = [
    { href: "/products", title: "สินค้า", desc: "จัดการรายการสินค้าและจุดแจ้งเตือนสต็อกต่ำ", icon: Package },
    { href: "/partners", title: "คู่ค้า", desc: "ซัพพลายเออร์และลูกค้า", icon: Users },
    { href: "/movements", title: "รับเข้า/ขายออก", desc: "บันทึกรายการซื้อ-ขาย", icon: ArrowLeftRight },
    { href: "/reports", title: "รายงาน", desc: "กำไรรวมและแจ้งเตือนสต็อกต่ำ", icon: BarChart3 },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">ภาพรวมธุรกิจ</h1>
        <p className="text-slate-500 mt-1">สรุปสถานะสต็อกและกำไรของคุณ ณ ตอนนี้</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className={`inline-flex items-center justify-center rounded-lg p-2 ${s.color}`}>
              <s.icon className="size-5" />
            </div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-medium text-slate-500 mb-3">เมนูลัด</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-sky-300 hover:shadow-md transition"
            >
              <c.icon className="size-5 text-slate-400 group-hover:text-sky-500 transition-colors" />
              <div className="font-medium text-slate-900 mt-3">{c.title}</div>
              <div className="text-sm text-slate-500 mt-1">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
