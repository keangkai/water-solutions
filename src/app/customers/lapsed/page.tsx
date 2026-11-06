export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format-date";
import { behaviorInfo } from "@/lib/customer-behavior";
import { buildLapsedCustomers, lapsedStatuses, type LapsedStatus } from "@/lib/lapsed-customers";
import { UserMinus, Phone, ArrowLeft } from "lucide-react";

const sortOptions = { value: "ยอดซื้อสะสมสูงสุด", overdue: "เลยรอบนานสุด", recent: "ซื้อล่าสุด" } as const;
type SortKey = keyof typeof sortOptions;

export default async function LapsedCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; status?: string }>;
}) {
  const params = await searchParams;
  const sort: SortKey = params.sort && params.sort in sortOptions ? (params.sort as SortKey) : "value";
  const status = lapsedStatuses.find((s) => s === params.status) ?? null;

  const partners = await prisma.partner.findMany({
    where: { type: "CUSTOMER", movements: { some: { type: "OUT" } } },
    select: {
      id: true,
      name: true,
      phone: true,
      zone: true,
      isBlacklisted: true,
      orders: { where: { status: { in: ["CONFIRMED", "FAILED"] } }, select: { id: true }, take: 1 },
      movements: {
        where: { type: "OUT" },
        select: { date: true, lines: { select: { quantity: true, unitPrice: true, product: { select: { name: true } } } } },
      },
    },
  });

  const all = buildLapsedCustomers(
    partners.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      zone: p.zone,
      isBlacklisted: p.isBlacklisted,
      hasPendingOrder: p.orders.length > 0,
      movements: p.movements.map((m) => ({
        date: m.date,
        lines: m.lines.map((l) => ({ productName: l.product.name, quantity: l.quantity, unitPrice: l.unitPrice })),
      })),
    }))
  );

  const counts = new Map<LapsedStatus, number>(lapsedStatuses.map((s) => [s, all.filter((c) => c.status === s).length]));
  const shown = (status ? all.filter((c) => c.status === status) : all).sort((a, b) => {
    if (sort === "overdue") return (b.daysOverdue ?? -1) - (a.daysOverdue ?? -1) || b.total - a.total;
    if (sort === "recent") return b.lastDate.getTime() - a.lastDate.getTime();
    return b.total - a.total;
  });

  const callable = all.filter((c) => !c.isBlacklisted);
  const lostPerMonth = callable.reduce((sum, c) => sum + (c.monthlyValue ?? 0), 0);

  const href = (next: { sort?: SortKey; status?: LapsedStatus | null }) => {
    const q = new URLSearchParams({ sort: next.sort ?? sort });
    const s = next.status === undefined ? status : next.status;
    if (s) q.set("status", s);
    return `/customers/lapsed?${q}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <UserMinus className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">ลูกค้าที่หายไป</h1>
        <Link
          href="/customers"
          className="ml-auto inline-flex items-center gap-1 min-h-[44px] px-2 text-sm text-sky-600 hover:text-sky-700"
        >
          <ArrowLeft className="size-4" /> วิเคราะห์ลูกค้า
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-sm text-slate-500">ลูกค้าที่ควรโทรตาม</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{callable.length.toLocaleString()} ราย</div>
          <div className="text-xs text-slate-400 mt-0.5">ซื้อล่าสุดเกิน 14 วัน ไม่รวมบัญชีดำและคนที่มีออเดอร์รอส่งอยู่แล้ว</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-sm text-slate-500">ยอดที่น่าจะเสียไปต่อเดือน (ประมาณการ)</div>
          <div className="mt-2 text-2xl font-semibold text-red-600">{lostPerMonth.toLocaleString()} บาท</div>
          <div className="text-xs text-slate-400 mt-0.5">ยอดเฉลี่ยต่อใบ × 30 ÷ รอบซื้อเฉลี่ย นับเฉพาะลูกค้าที่เคยซื้อตั้งแต่ 3 วันขึ้นไป (น้อยกว่านั้นรอบยังไม่น่าเชื่อถือ)</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <Link
            href={href({ status: null })}
            className={`px-3 min-h-[44px] inline-flex items-center rounded-lg text-xs border touch-manipulation ${
              !status ? "bg-sky-50 text-sky-700 border-sky-200 font-medium" : "bg-white text-slate-500 border-slate-200 hover:text-slate-900"
            }`}
          >
            ทั้งหมด {all.length.toLocaleString()}
          </Link>
          {lapsedStatuses.map((s) => (
            <Link
              key={s}
              href={href({ status: s })}
              title={behaviorInfo[s].hint}
              className={`px-3 min-h-[44px] inline-flex items-center rounded-lg text-xs border touch-manipulation ${
                status === s ? "bg-sky-50 text-sky-700 border-sky-200 font-medium" : "bg-white text-slate-500 border-slate-200 hover:text-slate-900"
              }`}
            >
              {behaviorInfo[s].label} {counts.get(s)?.toLocaleString()}
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          {(Object.keys(sortOptions) as SortKey[]).map((key) => (
            <Link
              key={key}
              href={href({ sort: key })}
              className={`px-3 min-h-[44px] inline-flex items-center rounded-lg text-xs border touch-manipulation ${
                sort === key ? "bg-sky-50 text-sky-700 border-sky-200 font-medium" : "bg-white text-slate-500 border-slate-200 hover:text-slate-900"
              }`}
            >
              {sortOptions[key]}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shown.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link href={`/customers/${c.id}`} className="font-medium text-sky-600 hover:text-sky-700">
                  {c.name}
                </Link>
                {c.zone && <span className="text-xs text-slate-400"> · {c.zone}</span>}
              </div>
              <div className="flex gap-1">
                {c.isBlacklisted && (
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">บัญชีดำ</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full border ${behaviorInfo[c.status].badge}`}>
                  {behaviorInfo[c.status].label}
                </span>
              </div>
            </div>
            <div className="text-sm text-slate-700">
              ซื้อล่าสุด {formatDate(c.lastDate)} · <b>{c.daysSinceLast.toLocaleString()} วันที่แล้ว</b>
              {c.avgGapDays != null && (
                <span className="text-slate-500">
                  {" "}
                  (ปกติทุก {c.avgGapDays.toLocaleString()} วัน
                  {c.daysOverdue ? `, เลยมา ${c.daysOverdue.toLocaleString()} วัน` : ""})
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">ครั้งล่าสุดสั่ง: {c.lastItems || "-"}</div>
            <div className="text-xs text-slate-500">
              ซื้อมา {c.orders.toLocaleString()} ครั้ง · ยอดสะสม {c.total.toLocaleString()} บาท
              {c.monthlyValue != null && ` · ประมาณ ${c.monthlyValue.toLocaleString()} บาท/เดือน`}
            </div>
            {c.phone ? (
              <a
                href={`tel:${c.phone}`}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border border-sky-300 text-sm font-medium text-sky-700 hover:bg-sky-50 touch-manipulation active:scale-95"
              >
                <Phone className="size-4" /> {c.phone}
              </a>
            ) : (
              <div className="text-xs text-slate-400">ไม่มีเบอร์โทร</div>
            )}
          </div>
        ))}
        {shown.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-10">ไม่มีลูกค้าที่หายไปในกลุ่มนี้</div>
        )}
      </div>
    </div>
  );
}
