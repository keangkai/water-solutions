export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { createWarehouse, deleteWarehouse, setWarehouseActive } from "./actions";
import { getStockSnapshot } from "@/lib/stock";
import { Warehouse, Trash2, Plus, Power } from "lucide-react";

export default async function WarehousesPage() {
  const [warehouses, snapshot] = await Promise.all([
    prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } }),
    getStockSnapshot(),
  ]);

  // สต็อกคงเหลือต่อคลัง: จำนวนสินค้าที่ยังมีของ และจำนวนที่ติดลบ (ต้องแก้ก่อนปิดคลัง)
  const stockOf = (warehouseId: string) => {
    let positive = 0;
    let negative = 0;
    let packs = 0;
    for (const [key, qty] of snapshot.onHand) {
      if (key.split("|")[1] !== warehouseId || qty === 0) continue;
      if (qty > 0) {
        positive += 1;
        packs += qty;
      } else negative += 1;
    }
    return { positive, negative, packs };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Warehouse className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">คลัง</h1>
      </div>

      <form
        action={createWarehouse}
        className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-wrap gap-3 items-end"
      >
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ชื่อคลัง</label>
          <input
            name="name"
            required
            placeholder="เช่น บ้านแม่, บ้านย่า"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <button className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Plus className="size-4" />
          เพิ่มคลัง
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map((w) => {
          const stock = stockOf(w.id);
          const hasStock = stock.positive > 0 || stock.negative > 0;
          return (
            <div
              key={w.id}
              className={`border rounded-xl p-4 shadow-sm space-y-3 ${w.isActive ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className={`flex items-center gap-2 font-medium ${w.isActive ? "text-slate-900" : "text-slate-500"}`}>
                  <Warehouse className="size-4 text-slate-400" />
                  {w.name}
                  {!w.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200">
                      ปิดใช้งาน
                    </span>
                  )}
                </div>
                <form action={deleteWarehouse.bind(null, w.id)}>
                  <button
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors"
                    aria-label="ลบคลัง (ลบได้เฉพาะคลังที่ไม่มีประวัติ)"
                    title="ลบได้เฉพาะคลังที่ไม่มีประวัติ"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>
              <div className="text-sm text-slate-600">
                {hasStock ? (
                  <>
                    {stock.positive > 0 && <span>มีของ {stock.positive} รายการ รวม {stock.packs.toLocaleString()} แพ็ค</span>}
                    {stock.negative > 0 && (
                      <span className="text-red-600">
                        {stock.positive > 0 ? " · " : ""}ติดลบ {stock.negative} รายการ
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400">ไม่มีสต็อกคงเหลือ</span>
                )}
              </div>
              {w.isActive && hasStock && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                  ถ้าจะปิดคลังนี้ ควรย้ายของออกก่อนที่หน้า “โอนย้ายคลัง”
                </div>
              )}
              <form action={setWarehouseActive.bind(null, w.id, !w.isActive)}>
                <button className="min-h-[44px] w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 touch-manipulation active:scale-95">
                  <Power className="size-4" />
                  {w.isActive ? "ปิดใช้งานคลังนี้" : "เปิดใช้งานอีกครั้ง"}
                </button>
              </form>
            </div>
          );
        })}
        {warehouses.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-10">ยังไม่มีคลัง</div>
        )}
      </div>
    </div>
  );
}
