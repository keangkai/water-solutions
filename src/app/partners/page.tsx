export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { createPartner } from "./actions";
import { PartnerCard } from "./partner-card";
import { PartnerFields } from "./partner-fields";
import Link from "next/link";
import { Users, Plus, UserPlus } from "lucide-react";

export default async function PartnersPage() {
  const [partners, sources] = await Promise.all([
    prisma.partner.findMany({ orderBy: { createdAt: "desc" }, include: { source: true } }),
    prisma.customerSource.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  // โซนที่เคยกรอกไว้ ใช้เป็นตัวเลือกเพื่อไม่ให้สะกดเพี้ยน
  const zones = Array.from(new Set(partners.flatMap((p) => (p.zone ? [p.zone] : [])))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">คู่ค้า</h1>
        <Link
          href="/customers/new?return=%2Fpartners"
          className="ml-auto min-h-[44px] px-4 inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-sm font-medium touch-manipulation active:scale-95"
        >
          <UserPlus className="size-4" /> เพิ่มลูกค้า
        </Link>
      </div>

      <form
        action={createPartner}
        className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-wrap gap-3 items-end"
      >
        <PartnerFields sources={sources} zones={zones} />
        <button className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Plus className="size-4" />
          เพิ่มคู่ค้า
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.map((p) => (
          <PartnerCard key={p.id} partner={p} sources={sources} zones={zones} />
        ))}
        {partners.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-10">ยังไม่มีคู่ค้า</div>
        )}
      </div>
    </div>
  );
}
