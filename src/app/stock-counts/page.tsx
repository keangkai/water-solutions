export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { deleteStockCount } from "./actions";
import { StockCountForm } from "./stock-count-form";
import { ClipboardList, Trash2, Warehouse as WarehouseIcon, Package, Tag } from "lucide-react";

export default async function StockCountsPage() {
  const [warehouses, products, stockCounts] = await Promise.all([
    prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" }, include: { brand: true } }),
    prisma.stockCount.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { warehouse: true, product: true, lines: true },
    }),
  ]);

  const canRecord = warehouses.length > 0 && products.length > 0;

  // ใช้เฉพาะผลนับ "รอบล่าสุด" ของแต่ละคลัง+สินค้า มาคิดเป็นยอดคงเหลือปัจจุบัน
  const latestByKey = new Map<string, (typeof stockCounts)[number]>();
  for (const sc of stockCounts) {
    const key = `${sc.warehouseId}_${sc.productId}`;
    if (!latestByKey.has(key)) latestByKey.set(key, sc);
  }
  const latestCounts = Array.from(latestByKey.values());

  const grandTotal = latestCounts.reduce(
    (sum, sc) => sum + sc.lines.reduce((s, l) => s + l.quantity, 0),
    0
  );

  const totalsByProduct = products.map((p) => {
    const countsForProduct = latestCounts.filter((sc) => sc.productId === p.id);
    return {
      product: p,
      total: countsForProduct.reduce(
        (sum, sc) => sum + sc.lines.reduce((s, l) => s + l.quantity, 0),
        0
      ),
      byWarehouse: warehouses
        .map((w) => ({
          warehouse: w,
          total: countsForProduct
            .filter((sc) => sc.warehouseId === w.id)
            .reduce((sum, sc) => sum + sc.lines.reduce((s, l) => s + l.quantity, 0), 0),
        }))
        .filter((t) => t.total > 0),
      hasData: countsForProduct.length > 0,
    };
  });

  // จัดกลุ่มยอดคงเหลือตามยี่ห้อ เพื่อให้เห็นว่ายี่ห้อ A เหลือ 1.5L/600ml/350ml เท่าไหร่
  const brandGroups = new Map<
    string,
    { label: string; items: typeof totalsByProduct }
  >();
  for (const t of totalsByProduct) {
    const key = t.product.brandId ?? "__none__";
    const label = t.product.brand?.name ?? "ไม่ระบุยี่ห้อ";
    if (!brandGroups.has(key)) brandGroups.set(key, { label, items: [] });
    brandGroups.get(key)!.items.push(t);
  }
  const sortedBrandGroups = Array.from(brandGroups.entries()).sort(([a], [b]) => {
    if (a === "__none__") return 1;
    if (b === "__none__") return -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">นับสต็อกตามรอบ</h1>
      </div>

      {products.length > 0 && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="text-sm text-slate-500">รวมทั้งหมดตอนนี้ (จากรอบนับล่าสุดของแต่ละคลัง)</div>
            <div className="text-3xl font-semibold text-sky-600">
              {grandTotal.toLocaleString()} แพ็ค
            </div>
          </div>

          {sortedBrandGroups.map(([key, group]) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Tag className="size-4 text-slate-400" />
                {group.label}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {group.items.map((t) => (
                  <div key={t.product.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Package className="size-4" />
                      {t.product.size ?? t.product.name}
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-slate-900">
                      {t.total.toLocaleString()}
                      <span className="text-sm font-normal text-slate-400"> {t.product.unit}</span>
                    </div>
                    {!t.hasData ? (
                      <div className="mt-2 text-xs text-slate-400">ยังไม่มีผลนับ</div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {t.byWarehouse.map((bw) => (
                          <span
                            key={bw.warehouse.id}
                            className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5"
                          >
                            <WarehouseIcon className="size-3" />
                            {bw.warehouse.name}: <b>{bw.total.toLocaleString()}</b>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!canRecord ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4">
          ต้องเพิ่มคลังและสินค้าก่อนจึงจะบันทึกผลนับได้
        </div>
      ) : (
        <StockCountForm warehouses={warehouses} products={products} />
      )}

      <div className="space-y-3">
        {stockCounts.map((sc) => {
          const total = sc.lines.reduce((sum, l) => sum + l.quantity, 0);
          return (
            <div key={sc.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-slate-500">
                    รอบ {sc.date.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                      <WarehouseIcon className="size-3" />
                      {sc.warehouse.name}
                    </span>
                    <span className="font-medium text-slate-900">
                      {sc.product.name} ({sc.product.unit})
                    </span>
                  </div>
                  {sc.note && <div className="text-sm text-slate-500 mt-1">{sc.note}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">รวม</div>
                    <div className="text-lg font-semibold text-slate-900">{total.toLocaleString()}</div>
                  </div>
                  <form action={deleteStockCount.bind(null, sc.id)}>
                    <button className="text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {sc.lines.map((line) => (
                  <span
                    key={line.id}
                    className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 rounded-full px-3 py-1"
                  >
                    {line.label} <b>{line.quantity.toLocaleString()}</b>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {stockCounts.length === 0 && (
          <div className="text-center text-slate-400 py-10">ยังไม่มีผลนับสต็อก</div>
        )}
      </div>
    </div>
  );
}
