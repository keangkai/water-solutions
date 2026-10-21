export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentRole } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { formatDate } from "@/lib/format-date";
import { DELIVERY_ROUNDS, roundLabel, shiftDateKey, todayInBangkok } from "@/lib/delivery";
import { DriverOrderCard, type DriverOrder } from "./driver-order-card";
import { Truck, ChevronLeft, ChevronRight, LogOut, Package, ClipboardList } from "lucide-react";
import { facebookNameIfDifferent } from "@/lib/customer-labels";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export default async function DriverPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const today = todayInBangkok();
  const date = params.date && datePattern.test(params.date) ? params.date : today;
  const role = await currentRole();

  const orders = await prisma.order.findMany({
    where: {
      deliveryDate: { gte: new Date(date), lt: new Date(shiftDateKey(date, 1)) },
      status: { in: ["CONFIRMED", "DELIVERED", "FAILED"] },
    },
    orderBy: { createdAt: "asc" },
    include: { partner: true, lines: { include: { product: true } } },
  });

  // ของที่ต้องโหลดขึ้นรถ รวมตามขนาดน้ำของออเดอร์ที่ยังไม่ได้ส่ง
  const load = new Map<string, { label: string; unit: string; qty: number }>();
  for (const line of orders.filter((o) => o.status === "CONFIRMED").flatMap((o) => o.lines)) {
    const label = line.product.size ?? line.product.name;
    const key = `${label}|${line.product.unit}`;
    const entry = load.get(key) ?? { label, unit: line.product.unit, qty: 0 };
    entry.qty += line.quantity;
    load.set(key, entry);
  }
  const loadList = Array.from(load.values()).sort((a, b) => a.label.localeCompare(b.label));
  // จำนวนแพ็ครวมทุกขนาด: ที่ต้องโหลดขึ้นรถ (ยังไม่ส่ง) และทั้งหมดของวัน (ทุกสถานะ)
  const loadTotal = loadList.reduce((sum, item) => sum + item.qty, 0);
  const dayTotal = orders.reduce((sum, o) => sum + o.lines.reduce((s, l) => s + l.quantity, 0), 0);

  // สรุปงานของวัน: ส่งสำเร็จกี่แพ็ค ต้องนำกลับกี่แพ็ค (ส่งไม่ครบ + ส่งไม่ได้) และยอดที่ต้องเก็บ
  const closed = orders.filter((o) => o.status !== "CONFIRMED");
  const summary = new Map<string, { label: string; unit: string; delivered: number; back: number }>();
  let deliveredAmount = 0;
  for (const o of closed) {
    for (const line of o.lines) {
      const label = line.product.size ?? line.product.name;
      const key = `${label}|${line.product.unit}`;
      const entry = summary.get(key) ?? { label, unit: line.product.unit, delivered: 0, back: 0 };
      const done = o.status === "DELIVERED" ? (line.deliveredQuantity ?? line.quantity) : 0;
      entry.delivered += done;
      entry.back += line.quantity - done;
      summary.set(key, entry);
      deliveredAmount += done * line.unitPrice;
    }
  }
  const summaryList = Array.from(summary.values()).sort((a, b) => a.label.localeCompare(b.label));
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;
  const failedCount = orders.filter((o) => o.status === "FAILED").length;

  const toCard = (o: (typeof orders)[number]): DriverOrder => ({
    id: o.id,
    status: o.status,
    name: o.partner.name,
    companyName: o.partner.companyName,
    facebookName: facebookNameIfDifferent(o.partner.name, o.partner.facebookName),
    blacklistReason: o.partner.isBlacklisted ? o.partner.blacklistReason ?? "บัญชีดำ" : null,
    phone: o.partner.phone,
    address: o.deliveryAddress ?? o.partner.address,
    coords:
      !o.deliveryAddress && o.partner.latitude != null && o.partner.longitude != null
        ? { latitude: o.partner.latitude, longitude: o.partner.longitude }
        : null,
    mapUrl: o.deliveryAddress ? null : o.partner.mapUrl,
    note: o.note,
    issueReason: o.issueReason,
    total: o.lines.reduce(
      (sum, l) => sum + (o.status === "DELIVERED" ? (l.deliveredQuantity ?? l.quantity) : l.quantity) * l.unitPrice,
      0
    ),
    lines: o.lines.map((l) => ({
      id: l.id,
      label: l.product.size ? `${l.product.size} · ${l.product.name}` : l.product.name,
      unit: l.product.unit,
      quantity: l.quantity,
      deliveredQuantity: l.deliveredQuantity,
    })),
  });

  // รอบที่รู้จักเรียงตามเวลา รอบที่ไม่อยู่ในรายการ (ถ้ามี) ต่อท้าย
  const roundKeys = [
    ...DELIVERY_ROUNDS.map((r) => r.key as string),
    ...Array.from(new Set(orders.map((o) => o.deliveryRound))).filter(
      (k) => !DELIVERY_ROUNDS.some((r) => r.key === k)
    ),
  ];
  const rounds = roundKeys
    .map((key) => {
      const roundOrders = orders.filter((o) => o.deliveryRound === key);
      // ที่ยังไม่ได้ส่งขึ้นก่อน
      roundOrders.sort((a, b) => Number(a.status !== "CONFIRMED") - Number(b.status !== "CONFIRMED"));
      return {
        key,
        orders: roundOrders.map(toCard),
        remaining: roundOrders.filter((o) => o.status === "CONFIRMED").length,
        packs: roundOrders.reduce((sum, o) => sum + o.lines.reduce((s, l) => s + l.quantity, 0), 0),
      };
    })
    .filter((r) => r.orders.length > 0);

  const remaining = orders.filter((o) => o.status === "CONFIRMED").length;
  const dayLabel = date === today ? "วันนี้" : date === shiftDateKey(today, 1) ? "พรุ่งนี้" : date === shiftDateKey(today, -1) ? "เมื่อวาน" : "";

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Truck className="size-6 text-sky-500" />
          <h1 className="text-xl font-semibold text-slate-900">งานส่งน้ำ</h1>
        </div>
        <div className="flex items-center gap-1">
          {role === "admin" && (
            <Link href="/orders" className="text-sm text-sky-600 hover:text-sky-700 px-2 min-h-[44px] inline-flex items-center">
              หน้า admin
            </Link>
          )}
          <form action={logout}>
            <button
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 px-2 min-h-[44px] touch-manipulation"
              aria-label="ออกจากระบบ"
            >
              <LogOut className="size-4" /> ออก
            </button>
          </form>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
        <Link
          href={`/driver?date=${shiftDateKey(date, -1)}`}
          className="size-12 inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 touch-manipulation active:scale-95"
          aria-label="วันก่อนหน้า"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-900">{formatDate(new Date(date))}</div>
          <div className="text-xs text-slate-500">
            {dayLabel && <>{dayLabel} · </>}
            {orders.length === 0
              ? "ไม่มีงานส่ง"
              : `เหลือ ${remaining} จาก ${orders.length} ออเดอร์ · รวม ${dayTotal.toLocaleString()} แพ็ค`}
          </div>
          {date !== today && (
            <Link href="/driver" className="text-xs text-sky-600 min-h-[44px] inline-flex items-center touch-manipulation">
              กลับไปวันนี้
            </Link>
          )}
        </div>
        <Link
          href={`/driver?date=${shiftDateKey(date, 1)}`}
          className="size-12 inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 touch-manipulation active:scale-95"
          aria-label="วันถัดไป"
        >
          <ChevronRight className="size-6" />
        </Link>
      </div>

      {loadList.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-sky-800">
            <Package className="size-4" /> ต้องโหลดขึ้นรถ (ออเดอร์ที่ยังไม่ได้ส่ง)
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {loadList.map((item) => (
              <div key={`${item.label}|${item.unit}`} className="bg-white rounded-xl p-2 text-center">
                <div className="text-xs text-slate-500">{item.label}</div>
                <div className="text-2xl font-semibold text-slate-900">{item.qty}</div>
                <div className="text-xs text-slate-400">{item.unit}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-baseline justify-between bg-sky-600 text-white rounded-xl px-4 py-2.5">
            <span className="text-sm">รวมทุกขนาดที่ต้องส่ง</span>
            <span className="text-2xl font-semibold">
              {loadTotal.toLocaleString()} <span className="text-sm font-normal">แพ็ค</span>
            </span>
          </div>
        </div>
      )}

      {rounds.map((r) => (
        <section key={r.key} className="space-y-3">
          <h2 className="flex items-baseline justify-between text-sm font-medium text-slate-500 px-1">
            <span className="text-base text-slate-900">รอบ {roundLabel(r.key)}</span>
            <span>
              {r.remaining > 0 ? `เหลือ ${r.remaining} ออเดอร์` : "ส่งครบรอบนี้แล้ว"} · {r.packs.toLocaleString()} แพ็ค
            </span>
          </h2>
          {r.orders.map((o) => (
            <DriverOrderCard key={o.id} order={o} />
          ))}
        </section>
      ))}

      {closed.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <ClipboardList className="size-4" /> สรุปงาน {dayLabel || formatDate(new Date(date))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-50 rounded-xl p-2">
              <div className="text-2xl font-semibold text-emerald-700">{deliveredCount}</div>
              <div className="text-xs text-emerald-700">ส่งแล้ว</div>
            </div>
            <div className="bg-red-50 rounded-xl p-2">
              <div className="text-2xl font-semibold text-red-700">{failedCount}</div>
              <div className="text-xs text-red-700">ส่งไม่ได้</div>
            </div>
            <div className="bg-sky-50 rounded-xl p-2">
              <div className="text-2xl font-semibold text-sky-700">{remaining}</div>
              <div className="text-xs text-sky-700">ยังไม่ได้ส่ง</div>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1.5 font-medium">ขนาด</th>
                <th className="py-1.5 font-medium text-right">ส่งสำเร็จ</th>
                <th className="py-1.5 font-medium text-right">นำกลับ</th>
              </tr>
            </thead>
            <tbody>
              {summaryList.map((r) => (
                <tr key={`${r.label}|${r.unit}`} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 text-slate-700">{r.label}</td>
                  <td className="py-1.5 text-right text-slate-900">{r.delivered} {r.unit}</td>
                  <td className={`py-1.5 text-right ${r.back > 0 ? "text-amber-700 font-medium" : "text-slate-400"}`}>{r.back}</td>
                </tr>
              ))}
              <tr className="font-semibold text-slate-900 border-t border-slate-200">
                <td className="py-1.5">รวมทุกขนาด</td>
                <td className="py-1.5 text-right">{summaryList.reduce((n, r) => n + r.delivered, 0).toLocaleString()} แพ็ค</td>
                <td className="py-1.5 text-right">{summaryList.reduce((n, r) => n + r.back, 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <div className="flex items-baseline justify-between text-sm pt-1">
            <span className="text-slate-500">ยอดที่ลูกค้าต้องโอน (ส่งแล้ว)</span>
            <span className="font-semibold text-slate-900">{deliveredAmount.toLocaleString()} บาท</span>
          </div>
        </div>
      )}

      {orders.length === 0 && <div className="text-center text-slate-400 py-16">ไม่มีออเดอร์ที่ต้องส่งในวันนี้</div>}
    </div>
  );
}
