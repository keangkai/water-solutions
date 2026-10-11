export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format-date";
import { segmentLabel } from "@/lib/customer-labels";
import { behaviorInfo, behaviorOrder, classifyBehavior, type BehaviorStatus } from "@/lib/customer-behavior";
import { UserSearch, Users, ShoppingBag, Wallet } from "lucide-react";

const sortOptions = { total: "ยอดซื้อสูงสุด", recent: "ซื้อล่าสุด", orders: "สั่งบ่อยสุด" } as const;
type SortKey = keyof typeof sortOptions;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// ลูกค้ากลุ่มบนสุดที่คิดเป็นสัดส่วนนี้ของผู้ซื้อ นับเป็นลูกค้าหลัก
const KEY_CUSTOMER_SHARE = 0.2;

// สรุปการซื้อของลูกค้าแต่ละราย: ยอดคิดจากช่วงวันที่ที่เลือก ส่วนพฤติกรรมคิดจากประวัติทั้งหมด
async function loadCustomers(from: string, to: string) {
  const partners = await prisma.partner.findMany({
    include: {
      source: true,
      movements: { where: { type: "OUT" }, include: { lines: true } },
    },
  });

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999Z`) : null;
  const inRange = (d: Date) => (!fromDate || d >= fromDate) && (!toDate || d <= toDate);

  // นับคู่ค้าประเภทอื่นด้วยถ้าเคยมีใบขายออก เพื่อไม่ให้ยอดขายเก่าหายจากหน้านี้
  return partners
    .filter((p) => p.type === "CUSTOMER" || p.movements.length > 0)
    .map((p) => {
      const movements = p.movements.filter((m) => inRange(m.date));
      const lines = movements.flatMap((m) => m.lines);
      const behavior = classifyBehavior(p.movements.map((m) => m.date));
      const lastOrder = p.movements.reduce<Date | null>((max, m) => (!max || m.date > max ? m.date : max), null);
      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        address: p.address,
        segment: p.segment ? segmentLabel[p.segment] : null,
        zone: p.zone,
        source: p.source?.name ?? null,
        orders: movements.length,
        qty: lines.reduce((sum, l) => sum + l.quantity, 0),
        total: lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
        last: lastOrder?.getTime() ?? null,
        behavior,
        deliveryCount: movements.filter((m) => m.deliveryMethod === "DELIVERY").length,
        pickupCount: movements.filter((m) => m.deliveryMethod === "PICKUP").length,
      };
    });
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; from?: string; to?: string; status?: string }>;
}) {
  const params = await searchParams;
  const sort: SortKey = params.sort && params.sort in sortOptions ? (params.sort as SortKey) : "total";
  const from = params.from && datePattern.test(params.from) ? params.from : "";
  const to = params.to && datePattern.test(params.to) ? params.to : "";
  const status = params.status && params.status in behaviorInfo ? (params.status as BehaviorStatus) : null;

  const allCustomers = (await loadCustomers(from, to)).sort((a, b) => {
    if (sort === "recent") return (b.last ?? 0) - (a.last ?? 0);
    if (sort === "orders") return b.orders - a.orders || b.total - a.total;
    return b.total - a.total || b.orders - a.orders;
  });

  const buyers = allCustomers.filter((c) => c.orders > 0);
  const totalOrders = buyers.reduce((sum, c) => sum + c.orders, 0);
  const totalRevenue = buyers.reduce((sum, c) => sum + c.total, 0);

  // ลูกค้าหลัก = กลุ่มยอดซื้อสูงสุด 20% แรก ใช้ดูว่ายอดขายพึ่งลูกค้าไม่กี่รายแค่ไหน
  const keyCount = Math.ceil(buyers.length * KEY_CUSTOMER_SHARE);
  const keyIds = new Set([...buyers].sort((a, b) => b.total - a.total).slice(0, keyCount).map((c) => c.id));
  const keyRevenue = buyers.filter((c) => keyIds.has(c.id)).reduce((sum, c) => sum + c.total, 0);
  const keyShare = totalRevenue > 0 ? Math.round((keyRevenue / totalRevenue) * 100) : 0;

  const behaviorGroups = behaviorOrder.map((key) => ({
    key,
    customers: allCustomers.filter((c) => c.behavior.status === key),
  }));
  const customers = status ? allCustomers.filter((c) => c.behavior.status === status) : allCustomers;

  const groupBy = (key: "segment" | "zone" | "source") => {
    const groups = new Map<string, { label: string; customers: number; orders: number; total: number }>();
    for (const c of allCustomers) {
      const label = c[key] ?? "ไม่ระบุ";
      const g = groups.get(label) ?? { label, customers: 0, orders: 0, total: 0 };
      g.customers += 1;
      g.orders += c.orders;
      g.total += c.total;
      groups.set(label, g);
    }
    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  };
  const breakdowns = [
    { title: "ตามประเภทลูกค้า", rows: groupBy("segment") },
    { title: "ตามโซน", rows: groupBy("zone") },
    { title: "ตามช่องทางที่รู้จักร้าน", rows: groupBy("source") },
  ];

  const pageHref = (next: { sort?: SortKey; status?: BehaviorStatus | null }) => {
    const q = new URLSearchParams({ sort: next.sort ?? sort });
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const nextStatus = next.status === undefined ? status : next.status;
    if (nextStatus) q.set("status", nextStatus);
    return `/customers?${q}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <UserSearch className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">วิเคราะห์ลูกค้า</h1>
      </div>

      <form className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-wrap gap-3 items-end">
        <input type="hidden" name="sort" value={sort} />
        {status && <input type="hidden" name="status" value={status} />}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ตั้งแต่วันที่</label>
          <input
            name="from"
            type="date"
            defaultValue={from}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ถึงวันที่</label>
          <input
            name="to"
            type="date"
            defaultValue={to}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <button className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          ดูช่วงนี้
        </button>
        <p className="w-full text-xs text-slate-400">
          ช่วงวันที่มีผลกับจำนวนครั้ง จำนวนรวม และยอดซื้อ ส่วนพฤติกรรมคิดจากประวัติการซื้อทั้งหมด
        </p>
        {(from || to) && (
          <Link href={`/customers?sort=${sort}${status ? `&status=${status}` : ""}`} className="text-sm text-slate-500 hover:text-slate-700 py-2">
            ล้างช่วงวันที่
          </Link>
        )}
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Users className="size-4" /> ลูกค้าที่ซื้อ
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{buyers.length.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-0.5">จากลูกค้าทั้งหมด {customers.length.toLocaleString()} ราย</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <ShoppingBag className="size-4" /> จำนวนครั้งที่สั่งซื้อ
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{totalOrders.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-0.5">ใบขายออก</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Wallet className="size-4" /> ยอดขายรวม
          </div>
          <div className="mt-2 text-2xl font-semibold text-sky-600">{totalRevenue.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            เฉลี่ย {(totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0).toLocaleString()} บาทต่อใบ
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-slate-500">พฤติกรรมลูกค้า</h2>
          {keyCount > 0 && (
            <p className="text-xs text-slate-500">
              ลูกค้าหลัก {keyCount.toLocaleString()} ราย (20% แรก) สร้างยอด <b className="text-slate-900">{keyShare}%</b> ของยอดขาย
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {behaviorGroups.map((g) => {
            const info = behaviorInfo[g.key];
            const active = status === g.key;
            return (
              <Link
                key={g.key}
                href={pageHref({ status: active ? null : g.key })}
                className={`bg-white border rounded-xl p-4 shadow-sm transition-colors touch-manipulation active:opacity-80 ${
                  active ? "border-sky-400 ring-2 ring-sky-100" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${info.badge}`}>{info.label}</span>
                  <span className="text-2xl font-semibold text-slate-900">{g.customers.length.toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate-500 mt-2">{info.hint}</div>
                {g.customers.length > 0 && (
                  <div className="text-sm text-slate-700 mt-2 line-clamp-2">
                    {g.customers.map((c) => c.name).join(", ")}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-slate-500">
            ลูกค้ารายตัว
            {status && (
              <>
                {" "}
                · {behaviorInfo[status].label}{" "}
                <Link href={pageHref({ status: null })} className="text-sky-600 hover:text-sky-700">
                  ดูทั้งหมด
                </Link>
              </>
            )}
          </h2>
          <div className="flex gap-1">
            {(Object.keys(sortOptions) as SortKey[]).map((key) => (
              <Link
                key={key}
                href={pageHref({ sort: key })}
                className={`px-3 py-1.5 min-h-[44px] inline-flex items-center rounded-lg text-xs border transition-colors touch-manipulation ${
                  sort === key
                    ? "bg-sky-50 text-sky-700 border-sky-200 font-medium"
                    : "bg-white text-slate-500 border-slate-200 hover:text-slate-900"
                }`}
              >
                {sortOptions[key]}
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                <th className="py-3 px-4 font-medium">ลูกค้า</th>
                <th className="py-3 px-4 font-medium">พฤติกรรม</th>
                <th className="py-3 px-4 font-medium">เบอร์โทร</th>
                <th className="py-3 px-4 font-medium">ที่อยู่</th>
                <th className="py-3 px-4 font-medium text-right">สั่งซื้อ (ครั้ง)</th>
                <th className="py-3 px-4 font-medium text-right">จำนวนรวม</th>
                <th className="py-3 px-4 font-medium text-right">ยอดซื้อ</th>
                <th className="py-3 px-4 font-medium">ซื้อล่าสุด</th>
                <th className="py-3 px-4 font-medium text-right">รอบซื้อเฉลี่ย</th>
                <th className="py-3 px-4 font-medium">คาดว่าจะสั่งรอบหน้า</th>
                <th className="py-3 px-4 font-medium text-right">ไปส่ง / มารับ</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 align-top">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Link href={`/customers/${c.id}`} className="font-medium text-sky-600 hover:text-sky-700 inline-block py-2">
                      {c.name}
                    </Link>
                    {keyIds.has(c.id) && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                        ลูกค้าหลัก
                      </span>
                    )}
                    {(c.segment || c.zone) && (
                      <div className="text-xs text-slate-400">{[c.segment, c.zone].filter(Boolean).join(" · ")}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${behaviorInfo[c.behavior.status].badge}`}>
                      {behaviorInfo[c.behavior.status].label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{c.phone ?? "-"}</td>
                  <td className="py-3 px-4 text-slate-600 min-w-[160px] max-w-[280px] whitespace-pre-line wrap-anywhere">{c.address ?? "-"}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{c.orders.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{c.qty.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-900">{c.total.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {c.last != null ? formatDate(new Date(c.last)) : "-"}
                    {c.behavior.daysSinceLast != null && (
                      <div className="text-xs text-slate-400">{c.behavior.daysSinceLast.toLocaleString()} วันที่แล้ว</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 whitespace-nowrap">
                    {c.behavior.avgGapDays != null ? `ทุก ${c.behavior.avgGapDays.toLocaleString()} วัน` : "-"}
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {c.behavior.nextExpected ? formatDate(c.behavior.nextExpected) : "-"}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 whitespace-nowrap">
                    {c.deliveryCount} / {c.pickupCount}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400">
                    {status ? "ไม่มีลูกค้าในกลุ่มนี้" : "ยังไม่มีลูกค้า"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {breakdowns.map((b) => (
          <section key={b.title} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500">{b.title}</h2>
            <div className="mt-3 space-y-1.5">
              {b.rows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between text-sm border-t border-slate-100 pt-1.5 first:border-0 first:pt-0"
                >
                  <div className="text-slate-600">
                    {r.label}
                    <span className="text-xs text-slate-400">
                      {" "}
                      · {r.customers.toLocaleString()} ราย · {r.orders.toLocaleString()} ครั้ง
                    </span>
                  </div>
                  <div className="font-medium text-slate-900">{r.total.toLocaleString()}</div>
                </div>
              ))}
              {b.rows.length === 0 && <div className="text-sm text-slate-400">ยังไม่มีข้อมูล</div>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
