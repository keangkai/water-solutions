import { prisma } from "@/lib/prisma";
import { createBrand, deleteBrand } from "./actions";
import { Tag, Trash2, Plus } from "lucide-react";

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Tag className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">ยี่ห้อ</h1>
      </div>

      <form
        action={createBrand}
        className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-wrap gap-3 items-end"
      >
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ชื่อยี่ห้อ</label>
          <input
            name="name"
            required
            placeholder="เช่น Brand A"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <button className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Plus className="size-4" />
          เพิ่มยี่ห้อ
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((b) => (
          <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-slate-900">
              <Tag className="size-4 text-slate-400" />
              {b.name}
            </div>
            <form action={deleteBrand.bind(null, b.id)}>
              <button className="text-slate-400 hover:text-red-600 transition-colors">
                <Trash2 className="size-4" />
              </button>
            </form>
          </div>
        ))}
        {brands.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-10">ยังไม่มียี่ห้อ</div>
        )}
      </div>
    </div>
  );
}
