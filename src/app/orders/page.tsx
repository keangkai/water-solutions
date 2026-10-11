export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OrderForm } from "./order-form";
import { OrderCard } from "./order-card";
import { DELIVERY_ROUNDS, earliestDeliveryDate, isDeliveryRound, todayInBangkok } from "@/lib/delivery";
import { bkkDay } from "@/lib/report-period";
import { warehouseOptionsFor } from "@/lib/warehouses";
import { ClipboardCheck } from "lucide-react";

const tabs = {
  pending: { label: "รอส่ง / ส่งไม่ได้", empty: "ไม่มีออเดอร์รอส่ง" },
  unpaid: { label: "ส่งแล้ว รอโอน", empty: "ไม่มีออเดอร์ที่รอโอน" },
  done: { label: "โอนแล้ว", empty: "ยังไม่มีออเดอร์ที่โอนแล้ว" },
  cancelled: { label: "ยกเลิก", empty: "ไม่มีออเดอร์ที่ยกเลิก" },
} as const;
type TabKey = keyof typeof tabs;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; date?: string; round?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filterDate = params.date && datePattern.test(params.date) ? params.date : "";
  const filterRound = params.round && isDeliveryRound(params.round) ? params.round : "";
  const filterText = (params.q ?? "").trim().slice(0, 100);
  const hasFilter = !!(filterDate || filterRound || filterText);
  // ลิงก์แท็บต้องพาตัวกรองไปด้วย
  const filterQuery = (tabKey: string) => {
    const q = new URLSearchParams({ tab: tabKey });
    if (filterDate) q.set("date", filterDate);
    if (filterRound) q.set("round", filterRound);
    if (filterText) q.set("q", filterText);
    return `/orders?${q.toString()}`;
  };
  const tab: TabKey = params.tab && params.tab in tabs ? (params.tab as TabKey) : "pending";
  const today = todayInBangkok();

  const [customers, products, warehouses, allFetched] = await Promise.all([
    prisma.partner.findMany({ where: { type: "CUSTOMER" }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({
      orderBy: [{ deliveryDate: "asc" }, { deliveryRound: "asc" }, { createdAt: "asc" }],
      include: { partner: true, warehouse: true, lines: { include: { product: true } } },
    }),
  ]);

  let orders = allFetched;
  const needle = filterText.toLowerCase();
  const matches = (o: (typeof orders)[number]) =>
    (!filterDate || bkkDay(o.deliveryDate) === filterDate) &&
    (!filterRound || o.deliveryRound === filterRound) &&
    (!needle ||
      [o.partner.name, o.partner.companyName, o.partner.phone].some((v) => v?.toLowerCase().includes(needle)));
  orders = orders.filter(matches);

  const byTab: Record<TabKey, typeof orders> = {
    pending: orders.filter((o) => o.status === "CONFIRMED" || o.status === "FAILED"),
    unpaid: orders.filter((o) => o.status === "DELIVERED" && !o.paidAt),
    // ที่จบแล้วเรียงล่าสุดก่อน
    done: orders.filter((o) => o.status === "DELIVERED" && o.paidAt).reverse(),
    cancelled: orders.filter((o) => o.status === "CANCELLED").reverse(),
  };
  const visible = byTab[tab];
  const failedCount = allFetched.filter((o) => o.status === "FAILED").length;

  const canRecord = customers.length > 0 && products.length > 0 && warehouses.some((w) => w.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">ออเดอร์</h1>
        <Link href="/orders/import" className="ml-auto text-sm text-sky-600 hover:text-sky-700 min-h-[44px] inline-flex items-center">
          นำเข้าจาก Excel
        </Link>
      </div>

      {canRecord ? (
        <OrderForm
          customers={customers}
          products={products}
          warehouses={warehouseOptionsFor(warehouses)}
          today={today}
          minDeliveryDate={earliestDeliveryDate(today)}
        />
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4">
          ต้องมีลูกค้า สินค้า และคลัง ก่อนจึงจะบันทึกออเดอร์ได้
        </div>
      )}

      {failedCount > 0 && tab !== "pending" && (
        <Link
          href="/orders?tab=pending"
          className="block bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 hover:bg-red-100 transition-colors"
        >
          มี {failedCount.toLocaleString()} ออเดอร์ที่คนขับส่งไม่ได้ ต้องเลื่อนวันส่งหรือยกเลิก
        </Link>
      )}

      <form method="GET" action="/orders" className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-wrap items-end gap-3">
        <input type="hidden" name="tab" value={tab} />
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 w-full sm:w-auto">
          วันที่ส่ง
          <input
            type="date"
            name="date"
            defaultValue={filterDate}
            className="border border-slate-300 rounded-xl px-3 min-h-[44px] text-base text-black bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 w-full sm:w-auto">
          รอบ
          <select
            name="round"
            defaultValue={filterRound}
            className="border border-slate-300 rounded-xl px-3 min-h-[44px] text-base text-black bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value="">ทุกรอบ</option>
            {DELIVERY_ROUNDS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 w-full sm:flex-1 sm:min-w-[180px]">
          ลูกค้า / เบอร์โทร
          <input
            type="search"
            name="q"
            defaultValue={filterText}
            placeholder="ค้นหา"
            className="border border-slate-300 rounded-xl px-3 min-h-[44px] text-base text-black bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </label>
        <button className="min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium touch-manipulation active:scale-95">
          ค้นหา
        </button>
        {hasFilter && (
          <Link href={`/orders?tab=${tab}`} className="min-h-[44px] px-3 inline-flex items-center text-sm text-slate-500 hover:text-slate-900">
            ล้างตัวกรอง
          </Link>
        )}
      </form>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {(Object.keys(tabs) as TabKey[]).map((key) => (
          <Link
            key={key}
            href={filterQuery(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 whitespace-nowrap transition-colors ${
              tab === key
                ? "border-sky-500 text-sky-600 font-medium"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {tabs[key].label}
            <span className="text-xs text-slate-400">{byTab[key].length.toLocaleString()}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            customers={customers}
            products={products}
            warehouses={warehouseOptionsFor(warehouses, o.warehouseId)}
            today={today}
          />
        ))}
        {visible.length === 0 && <div className="col-span-full text-center text-slate-400 py-10">{hasFilter ? "ไม่พบออเดอร์ที่ตรงกับตัวกรอง" : tabs[tab].empty}</div>}
      </div>
    </div>
  );
}
