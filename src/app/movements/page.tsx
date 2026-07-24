export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MovementForm } from "./movement-form";
import { MovementCard } from "./movement-card";
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const tab = (await searchParams).tab === "out" ? "OUT" : "IN";

  const [products, partners, warehouses, movements] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.partner.findMany({ orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.movement.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { partner: true, warehouse: true, lines: { include: { product: true } } },
    }),
  ]);

  const canRecord = products.length > 0 && partners.length > 0 && warehouses.length > 0;

  let totalInQty = 0;
  let totalInValue = 0;
  let totalOutQty = 0;
  let totalOutValue = 0;
  for (const m of movements) {
    for (const line of m.lines) {
      if (m.type === "IN") {
        totalInQty += line.quantity;
        totalInValue += line.quantity * line.unitPrice;
      } else {
        totalOutQty += line.quantity;
        totalOutValue += line.quantity * line.unitPrice;
      }
    }
  }

  const visibleMovements = movements.filter((m) => m.type === tab);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">รับเข้า / ขายออก</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <ArrowDownToLine className="size-4 text-emerald-600" /> ยอดรวมรับเข้า
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">
            {totalInValue.toLocaleString()}
            <span className="text-sm font-normal text-slate-400"> บาท</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{totalInQty.toLocaleString()} แพ็ค</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <ArrowUpFromLine className="size-4 text-sky-600" /> ยอดรวมขายออก
          </div>
          <div className="mt-1 text-2xl font-semibold text-sky-600">
            {totalOutValue.toLocaleString()}
            <span className="text-sm font-normal text-slate-400"> บาท</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{totalOutQty.toLocaleString()} แพ็ค</div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <Link
          href="/movements?tab=in"
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
            tab === "IN"
              ? "border-emerald-500 text-emerald-600 font-medium"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <ArrowDownToLine className="size-4" />
          รับเข้า
        </Link>
        <Link
          href="/movements?tab=out"
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
            tab === "OUT"
              ? "border-sky-500 text-sky-600 font-medium"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <ArrowUpFromLine className="size-4" />
          ขายออก
        </Link>
      </div>

      {!canRecord ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4">
          ต้องเพิ่มสินค้า, คู่ค้า และคลัง ก่อนจึงจะบันทึกรายการได้
        </div>
      ) : (
        <MovementForm
          key={tab}
          products={products}
          partners={partners}
          warehouses={warehouses}
          defaultType={tab}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visibleMovements.map((m) => (
          <MovementCard key={m.id} movement={m} products={products} partners={partners} warehouses={warehouses} />
        ))}
        {visibleMovements.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-10">
            ยังไม่มีรายการ{tab === "IN" ? "รับเข้า" : "ขายออก"}
          </div>
        )}
      </div>
    </div>
  );
}
