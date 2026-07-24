import { prisma } from "@/lib/prisma";
import { createPartner } from "./actions";
import { PartnerCard } from "./partner-card";
import { Users, Plus } from "lucide-react";

export default async function PartnersPage() {
  const partners = await prisma.partner.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">คู่ค้า</h1>
      </div>

      <form
        action={createPartner}
        className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-wrap gap-3 items-end"
      >
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ชื่อ</label>
          <input
            name="name"
            required
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ประเภท</label>
          <select
            name="type"
            required
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          >
            <option value="SUPPLIER">ซัพพลายเออร์</option>
            <option value="CUSTOMER">ลูกค้า</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">เบอร์โทร</label>
          <input
            name="phone"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ที่อยู่</label>
          <input
            name="address"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <button className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Plus className="size-4" />
          เพิ่มคู่ค้า
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.map((p) => (
          <PartnerCard key={p.id} partner={p} />
        ))}
        {partners.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-10">ยังไม่มีคู่ค้า</div>
        )}
      </div>
    </div>
  );
}
