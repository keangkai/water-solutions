export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format-date";
import { segmentLabel, type CustomerSegment } from "@/lib/customer-labels";
import { behaviorInfo, classifyBehavior } from "@/lib/customer-behavior";
import { Contact, Search, Phone, MapPin } from "lucide-react";
import { LinkifiedText } from "@/components/linkified-text";
import { facebookNameIfDifferent } from "@/lib/customer-labels";

// รายชื่อลูกค้าพร้อมข้อมูลติดต่อและสรุปการซื้อ ค้นหาจากชื่อ เบอร์ ที่อยู่ หรือโซน
async function loadCustomerList() {
  const partners = await prisma.partner.findMany({
    orderBy: { name: "asc" },
    include: {
      source: true,
      movements: { where: { type: "OUT" }, include: { lines: true } },
    },
  });

  return partners
    .filter((p) => p.type === "CUSTOMER" || p.movements.length > 0)
    .map((p) => {
      const dates = p.movements.map((m) => m.date);
      const firstOrder = dates.reduce<Date | null>((min, d) => (!min || d < min ? d : min), null);
      const lastOrder = dates.reduce<Date | null>((max, d) => (!max || d > max ? d : max), null);
      return {
        id: p.id,
        name: p.name,
        companyName: p.companyName,
        facebookName: p.facebookName,
        type: p.type,
        phone: p.phone,
        address: p.address,
        segment: p.segment,
        zone: p.zone,
        source: p.source?.name ?? null,
        orders: p.movements.length,
        total: p.movements.flatMap((m) => m.lines).reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
        firstOrder,
        lastOrder,
        behavior: classifyBehavior(dates),
      };
    });
}

export default async function CustomerListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; segment?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const segment =
    params.segment && (params.segment in segmentLabel || params.segment === "NONE") ? params.segment : "";

  const all = await loadCustomerList();
  const needle = q.toLowerCase();
  const customers = all.filter((c) => {
    if (segment === "NONE" ? c.segment !== null : segment && c.segment !== segment) return false;
    if (!needle) return true;
    return [c.name, c.companyName, c.facebookName, c.phone, c.address, c.zone].some((v) => v?.toLowerCase().includes(needle));
  });

  const segmentHref = (value: string) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (value) query.set("segment", value);
    const s = query.toString();
    return s ? `/customers/list?${s}` : "/customers/list";
  };
  const segmentChips: { value: string; label: string }[] = [
    { value: "", label: "ทั้งหมด" },
    ...(Object.keys(segmentLabel) as CustomerSegment[]).map((key) => ({ value: key, label: segmentLabel[key] })),
    { value: "NONE", label: "ยังไม่ระบุ" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Contact className="size-5 text-sky-500" />
          <h1 className="text-xl font-semibold text-slate-900">รายชื่อลูกค้า</h1>
        </div>
        <Link href="/partners" className="text-sm text-sky-600 hover:text-sky-700 font-medium min-h-[44px] inline-flex items-center touch-manipulation">
          + เพิ่มลูกค้า
        </Link>
      </div>

      <form className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        {segment && <input type="hidden" name="segment" value={segment} />}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="ค้นหาชื่อ บริษัท เบอร์โทร ที่อยู่ หรือโซน"
              className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 min-h-[44px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
            />
          </div>
          <button className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg px-4 min-h-[44px] transition-colors touch-manipulation active:opacity-80">
            ค้นหา
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {segmentChips.map((chip) => (
            <Link
              key={chip.value || "ALL"}
              href={segmentHref(chip.value)}
              className={`px-3 py-1.5 min-h-[44px] inline-flex items-center rounded-full text-xs border transition-colors touch-manipulation ${
                segment === chip.value
                  ? "bg-sky-50 text-sky-700 border-sky-200 font-medium"
                  : "bg-white text-slate-500 border-slate-200 hover:text-slate-900"
              }`}
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </form>

      <div className="text-sm text-slate-500">
        พบ {customers.length.toLocaleString()} ราย
        {(q || segment) && (
          <>
            {" "}จากทั้งหมด {all.length.toLocaleString()} ราย ·{" "}
            <Link href="/customers/list" className="text-sky-600 hover:text-sky-700">
              ล้างการค้นหา
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => {
          const info = behaviorInfo[c.behavior.status];
          const tags = [
            c.segment && segmentLabel[c.segment],
            c.zone && `โซน ${c.zone}`,
            c.source && `มาจาก${c.source}`,
          ].filter(Boolean);
          return (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/customers/${c.id}`}
                    className="font-medium text-slate-900 hover:text-sky-600 break-words inline-flex items-center min-h-[44px]"
                  >
                    {c.name}
                  </Link>
                  {c.companyName && <div className="text-xs text-slate-500">{c.companyName}</div>}
                  {facebookNameIfDifferent(c.name, c.facebookName) && (
                    <div className="text-xs text-slate-400">Facebook: {facebookNameIfDifferent(c.name, c.facebookName)}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${info.badge}`}>{info.label}</span>
                    {c.type === "SUPPLIER" && (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                        ตั้งเป็นซัพพลายเออร์
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-sm text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0 text-slate-400" />
                  {c.phone ? (
                    <a href={`tel:${c.phone}`} className="text-sky-600 hover:text-sky-700 inline-flex items-center min-h-[44px]">
                      {c.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400">ไม่มีเบอร์โทร</span>
                  )}
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin className="size-3.5 shrink-0 mt-1 text-slate-400" />
                  {c.address ? (
                    <span className="whitespace-pre-line wrap-anywhere"><LinkifiedText text={c.address} /></span>
                  ) : (
                    <span className="text-slate-400">ไม่มีที่อยู่</span>
                  )}
                </div>
                {tags.length > 0 && <div className="text-xs text-slate-400">{tags.join(" · ")}</div>}
              </div>

              <div className="mt-auto pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-slate-400">สั่งซื้อ</div>
                  <div className="text-sm font-medium text-slate-900">{c.orders.toLocaleString()} ครั้ง</div>
                </div>
                <div>
                  <div className="text-slate-400">ยอดซื้อรวม</div>
                  <div className="text-sm font-medium text-slate-900">{c.total.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-400">ซื้อล่าสุด</div>
                  <div className="text-sm font-medium text-slate-900">
                    {c.lastOrder ? formatDate(c.lastOrder) : "-"}
                  </div>
                </div>
              </div>
              {c.firstOrder && (
                <div className="text-xs text-slate-400 -mt-1">
                  ลูกค้าตั้งแต่ {formatDate(c.firstOrder)}
                  {c.behavior.nextExpected && <> · คาดว่าจะสั่งรอบหน้า {formatDate(c.behavior.nextExpected)}</>}
                </div>
              )}
            </div>
          );
        })}
        {customers.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-10">
            {q || segment ? "ไม่พบลูกค้าที่ตรงกับการค้นหา" : "ยังไม่มีลูกค้า"}
          </div>
        )}
      </div>
    </div>
  );
}
