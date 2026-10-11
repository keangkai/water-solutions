export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { todayInBangkok } from "@/lib/delivery";
import { formatDate } from "@/lib/format-date";
import { TransferForm } from "./transfer-form";
import { warehouseOptionsFor } from "@/lib/warehouses";
import { deleteTransfer } from "./actions";
import { Repeat, ArrowRight, Trash2 } from "lucide-react";

export default async function TransfersPage() {
  const [warehouses, products, transfers] = await Promise.all([
    prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.transfer.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { fromWarehouse: true, toWarehouse: true, lines: { include: { product: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Repeat className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">โอนย้ายระหว่างคลัง</h1>
      </div>
      <p className="text-sm text-slate-500">
        ใช้เมื่อย้ายของจากคลังหนึ่งไปอีกคลัง ยอดรวมและกำไรไม่เปลี่ยน มีผลแค่สต็อกรายคลัง
      </p>

      {warehouses.length >= 2 && warehouses.some((w) => w.isActive) && products.length > 0 ? (
        <TransferForm
          fromWarehouses={warehouses.map((w) => ({ id: w.id, name: w.isActive ? w.name : `${w.name} (ปิดใช้งาน)` }))}
          toWarehouses={warehouseOptionsFor(warehouses)}
          products={products}
          today={todayInBangkok()}
        />
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4">
          ต้องมีอย่างน้อย 2 คลังและ 1 สินค้า จึงจะโอนย้ายได้
        </div>
      )}

      <div className="space-y-3">
        {transfers.map((t) => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-medium text-slate-900">
                {t.fromWarehouse.name} <ArrowRight className="size-4 text-slate-400" /> {t.toWarehouse.name}
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-500">
                {formatDate(t.date)}
                <form action={deleteTransfer.bind(null, t.id)}>
                  <button
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-slate-400 hover:text-red-600 touch-manipulation"
                    aria-label="ลบใบโอนย้าย"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>
            </div>
            <ul className="mt-2 text-sm text-slate-700 space-y-0.5">
              {t.lines.map((l) => (
                <li key={l.id}>
                  {l.product.name} × <b>{l.quantity}</b> {l.product.unit}
                </li>
              ))}
            </ul>
            {t.note && <div className="mt-2 text-sm text-slate-500">หมายเหตุ: {t.note}</div>}
          </div>
        ))}
        {transfers.length === 0 && <div className="text-center text-slate-400 py-10">ยังไม่มีการโอนย้าย</div>}
      </div>
    </div>
  );
}
