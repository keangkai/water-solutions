export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CustomerForm } from "./customer-form";
import { ChevronLeft, UserPlus } from "lucide-react";

// ยอมเฉพาะ path ภายในเว็บ
function safeReturn(raw: string | undefined) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\") && raw.length <= 200 ? raw : "/customers/list";
}

export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<{ return?: string }> }) {
  const returnTo = safeReturn((await searchParams).return);
  const [sources, zoneRows] = await Promise.all([
    prisma.customerSource.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
    prisma.partner.findMany({ where: { zone: { not: null } }, select: { zone: true } }),
  ]);
  // โซนที่เคยกรอกไว้ ใช้เป็นตัวเลือกเพื่อไม่ให้สะกดเพี้ยน
  const zones = Array.from(new Set(zoneRows.flatMap((p) => (p.zone ? [p.zone] : [])))).sort();

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link href={returnTo} className="inline-flex items-center gap-1 min-h-[44px] text-sm text-slate-500 hover:text-slate-900 touch-manipulation">
        <ChevronLeft className="size-4" /> กลับ
      </Link>
      <div className="flex items-center gap-2">
        <UserPlus className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">เพิ่มลูกค้า</h1>
      </div>
      <CustomerForm sources={sources} zones={zones} returnTo={returnTo} />
    </div>
  );
}
