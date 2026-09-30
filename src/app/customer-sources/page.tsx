export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { createCustomerSource, setCustomerSourceActive, deleteCustomerSource } from "./actions";
import { channelLabel } from "@/lib/customer-labels";
import { Megaphone, Trash2, Plus } from "lucide-react";

export default async function CustomerSourcesPage() {
  const sources = await prisma.customerSource.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { partners: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Megaphone className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">ช่องทางที่ได้ลูกค้า</h1>
      </div>

      <form
        action={createCustomerSource}
        className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-wrap gap-3 items-end"
      >
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ชื่อช่องทาง</label>
          <input
            name="name"
            required
            placeholder="เช่น Facebook"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ประเภท</label>
          <select
            name="channel"
            required
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          >
            <option value="OFFLINE">{channelLabel.OFFLINE}</option>
            <option value="ONLINE">{channelLabel.ONLINE}</option>
          </select>
        </div>
        <button className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Plus className="size-4" />
          เพิ่มช่องทาง
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((s) => (
          <div
            key={s.id}
            className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between gap-3 ${
              s.isActive ? "" : "opacity-60"
            }`}
          >
            <div>
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <Megaphone className="size-4 text-slate-400" />
                {s.name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {channelLabel[s.channel]} · ลูกค้า {s._count.partners.toLocaleString()} ราย
                {!s.isActive && " · ปิดใช้งาน"}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <form action={setCustomerSourceActive.bind(null, s.id, !s.isActive)}>
                <button className="text-xs text-sky-600 hover:text-sky-700 font-medium">
                  {s.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                </button>
              </form>
              {s._count.partners === 0 && (
                <form action={deleteCustomerSource.bind(null, s.id)}>
                  <button className="text-slate-400 hover:text-red-600 transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-10">ยังไม่มีช่องทาง</div>
        )}
      </div>
    </div>
  );
}
