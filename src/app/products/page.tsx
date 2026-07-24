import { prisma } from "@/lib/prisma";
import { createProduct } from "./actions";
import { ProductRow } from "./product-row";
import { Package, Plus } from "lucide-react";

const sizePresets = ["1.5L", "600ml", "350ml"];

export default async function ProductsPage() {
  const [products, brands] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: "desc" }, include: { brand: true } }),
    prisma.brand.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">สินค้า</h1>
      </div>

      <form
        action={createProduct}
        className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-wrap gap-3 items-end"
      >
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ชื่อสินค้า</label>
          <input
            name="name"
            required
            placeholder="เช่น น้ำดื่ม ตราเอ"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ยี่ห้อ</label>
          <select
            name="brandId"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          >
            <option value="">ไม่ระบุยี่ห้อ</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ขนาด</label>
          <input
            name="size"
            list="product-size-presets"
            placeholder="เช่น 1.5L"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black w-full sm:w-28 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
          <datalist id="product-size-presets">
            {sizePresets.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">หน่วย</label>
          <input
            name="unit"
            required
            defaultValue="แพ็ค"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black w-full sm:w-24 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ราคาต้นทุน/แพ็ค</label>
          <input
            name="defaultCostPrice"
            type="number"
            step="0.01"
            min={0}
            placeholder="เช่น 23"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black w-full sm:w-28 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ราคาขาย/แพ็ค</label>
          <input
            name="defaultSellPrice"
            type="number"
            step="0.01"
            min={0}
            placeholder="เช่น 25"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black w-full sm:w-28 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">แจ้งเตือนเมื่อต่ำกว่า</label>
          <input
            name="reorderPoint"
            type="number"
            defaultValue={0}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black w-full sm:w-32 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <button className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Plus className="size-4" />
          เพิ่มสินค้า
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="py-3 px-4 font-medium">ชื่อสินค้า</th>
              <th className="py-3 px-4 font-medium">ยี่ห้อ</th>
              <th className="py-3 px-4 font-medium">ขนาด</th>
              <th className="py-3 px-4 font-medium">หน่วย</th>
              <th className="py-3 px-4 font-medium">ราคาต้นทุน/ขาย (default)</th>
              <th className="py-3 px-4 font-medium">จุดแจ้งเตือนสต็อกต่ำ</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <ProductRow key={p.id} product={p} brands={brands} />
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  ยังไม่มีสินค้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
