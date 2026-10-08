export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getStockSnapshot, totalsByProduct } from "@/lib/stock";
import { todayInBangkok } from "@/lib/delivery";
import {
  Truck,
  ClipboardCheck,
  Package,
  Users,
  ArrowLeftRight,
  BarChart3,
  AlertTriangle,
  Wallet,
} from "lucide-react";

export default async function Home() {
  const today = todayInBangkok();
  const [productCount, partnerCount, products, movements, snapshot, openOrders] = await Promise.all([
    prisma.product.count(),
    prisma.partner.count(),
    prisma.product.findMany(),
    prisma.movement.findMany({ include: { lines: true } }),
    getStockSnapshot(),
    // ออเดอร์ที่ admin ต้องตามต่อ: ยังไม่ส่ง ส่งไม่ได้ หรือส่งแล้วรอโอน
    prisma.order.findMany({
      where: { OR: [{ status: { in: ["CONFIRMED", "FAILED"] } }, { status: "DELIVERED", paidAt: null }] },
      include: { lines: true },
    }),
  ]);
  const onHandTotals = totalsByProduct(snapshot.onHand);
  const reservedTotals = totalsByProduct(snapshot.reserved);

  const orderValue = (o: (typeof openOrders)[number]) =>
    o.lines.reduce((sum, l) => sum + (o.status === "DELIVERED" ? (l.deliveredQuantity ?? l.quantity) : l.quantity) * l.unitPrice, 0);
  const todayOrders = openOrders.filter((o) => o.status === "CONFIRMED" && o.deliveryDate.toISOString().slice(0, 10) === today);
  const overdueOrders = openOrders.filter((o) => o.status === "CONFIRMED" && o.deliveryDate.toISOString().slice(0, 10) < today);
  const failedOrders = openOrders.filter((o) => o.status === "FAILED");
  const unpaidOrders = openOrders.filter((o) => o.status === "DELIVERED");
  const unpaidTotal = unpaidOrders.reduce((sum, o) => sum + orderValue(o), 0);

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

    // ขายได้จริง = คงเหลือ − ที่ถูกจองโดยออเดอร์ที่ยังไม่ส่ง
    const available = (onHandTotals.get(product.id) ?? 0) - (reservedTotals.get(product.id) ?? 0);
    if (available < product.reorderPoint) lowStockCount += 1;
  }

  const profit = totalProfit;

  const stats = [
    { label: "สินค้าทั้งหมด", value: productCount, icon: Package, color: "text-sky-600 bg-sky-50" },
    { label: "คู่ค้าทั้งหมด", value: partnerCount, icon: Users, color: "text-violet-600 bg-violet-50" },
    {
      label: "สต็อกขายได้ต่ำกว่าจุดแจ้งเตือน",
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

  const todayCards = [
    { href: "/driver", label: "รอส่งวันนี้", value: todayOrders.length, tone: todayOrders.length > 0 ? "text-sky-700 bg-sky-50 border-sky-200" : "text-slate-500 bg-white border-slate-200", icon: Truck },
    { href: "/orders", label: "ค้างส่งจากวันก่อน", value: overdueOrders.length, tone: overdueOrders.length > 0 ? "text-red-700 bg-red-50 border-red-200" : "text-slate-500 bg-white border-slate-200", icon: AlertTriangle },
    { href: "/orders", label: "ส่งไม่ได้ รอจัดการ", value: failedOrders.length, tone: failedOrders.length > 0 ? "text-red-700 bg-red-50 border-red-200" : "text-slate-500 bg-white border-slate-200", icon: AlertTriangle },
    { href: "/orders?tab=unpaid", label: `รอโอน ${unpaidTotal.toLocaleString()} บาท`, value: unpaidOrders.length, tone: unpaidOrders.length > 0 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-slate-500 bg-white border-slate-200", icon: Wallet },
  ];

  const cards = [
    { href: "/orders", title: "ออเดอร์", desc: "รับออเดอร์ลูกค้าและติดตามการส่ง", icon: ClipboardCheck },
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

      <div>
        <h2 className="text-sm font-medium text-slate-500 mb-3">งานวันนี้</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {todayCards.map((c) => (
            <Link key={c.label} href={c.href} className={`border rounded-xl p-4 shadow-sm hover:shadow-md transition ${c.tone}`}>
              <c.icon className="size-5" />
              <div className="mt-3 text-2xl font-semibold">{c.value}</div>
              <div className="text-sm">{c.label}</div>
            </Link>
          ))}
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
