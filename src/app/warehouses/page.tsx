export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { createWarehouse, deleteWarehouse } from "./actions";
import { Warehouse, Trash2, Plus } from "lucide-react";

export default async function WarehousesPage() {
  const warehouses = await prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } });

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
        {warehouses.map((w) => (
          <div key={w.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-slate-900">
              <Warehouse className="size-4 text-slate-400" />
              {w.name}
            </div>
            <form action={deleteWarehouse.bind(null, w.id)}>
              <button className="text-slate-400 hover:text-red-600 transition-colors">
                <Trash2 className="size-4" />
              </button>
            </form>
          </div>
        ))}
        {warehouses.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-10">ยังไม่มีคลัง</div>
        )}
      </div>
    </div>
  );
}
