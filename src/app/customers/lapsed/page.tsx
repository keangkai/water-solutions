export const dynamic = "force-dynamic";
import Link from "next/link";
import { formatDate } from "@/lib/format-date";
import { behaviorInfo } from "@/lib/customer-behavior";
import { lapsedStatuses, type LapsedStatus } from "@/lib/lapsed-customers";
import { filterAndSortLapsed, loadLapsedCustomers, lapsedSortOptions, parseLapsedSort, parseLapsedStatus, type LapsedSortKey } from "@/lib/lapsed-query";
import { CopyMessageButton, TemplateEditor } from "./message-tools";
import { UserMinus, Phone, ArrowLeft, Download } from "lucide-react";

export default async function LapsedCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; status?: string }>;
}) {
  const params = await searchParams;
  const sort = parseLapsedSort(params.sort);
  const status = parseLapsedStatus(params.status);

  const all = await loadLapsedCustomers();
  const counts = new Map<LapsedStatus, number>(lapsedStatuses.map((st) => [st, all.filter((c) => c.status === st).length]));
  const shown = filterAndSortLapsed(all, status, sort);

  const callable = all.filter((c) => !c.isBlacklisted);
  const lostPerMonth = callable.reduce((sum, c) => sum + (c.monthlyValue ?? 0), 0);

  const href = (next: { sort?: LapsedSortKey; status?: LapsedStatus | null }) => {
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

      <TemplateEditor />

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
        <div className="flex flex-wrap gap-1">
          <a
            href={`/customers/lapsed/export?${new URLSearchParams({ sort, ...(status ? { status } : {}) })}`}
            className="px-3 min-h-[44px] inline-flex items-center gap-1.5 rounded-lg text-xs border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 touch-manipulation active:scale-95"
          >
            <Download className="size-3.5" /> ส่งออก CSV
          </a>
          {(Object.keys(lapsedSortOptions) as LapsedSortKey[]).map((key) => (
            <Link
              key={key}
              href={href({ sort: key })}
              className={`px-3 min-h-[44px] inline-flex items-center rounded-lg text-xs border touch-manipulation ${
                sort === key ? "bg-sky-50 text-sky-700 border-sky-200 font-medium" : "bg-white text-slate-500 border-slate-200 hover:text-slate-900"
              }`}
            >
              {lapsedSortOptions[key]}
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
            <div className="flex flex-wrap items-center gap-2">
              {c.phone ? (
                <a
                  href={`tel:${c.phone}`}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border border-sky-300 text-sm font-medium text-sky-700 hover:bg-sky-50 touch-manipulation active:scale-95"
                >
                  <Phone className="size-4" /> {c.phone}
                </a>
              ) : (
                <span className="text-xs text-slate-400">ไม่มีเบอร์โทร</span>
              )}
              <CopyMessageButton name={c.name} items={c.lastItems} />
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-10">ไม่มีลูกค้าที่หายไปในกลุ่มนี้</div>
        )}
      </div>
    </div>
  );
}
