"use client";

import { useRouter } from "next/navigation";
import type { PeriodOption, PeriodView } from "@/lib/report-period";

export function PeriodSelect({ view, value, options }: { view: PeriodView; value: string; options: PeriodOption[] }) {
  const router = useRouter();
  return (
    <select
      value={value}
      onChange={(e) => router.push(`/reports?view=${view}&key=${e.target.value}`)}
      aria-label="เลือกช่วงเวลา"
      className="min-h-[44px] border border-slate-300 rounded-xl px-3 text-base text-black bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
          {o.count > 0 ? ` · ${o.count} รายการ` : ""}
        </option>
      ))}
    </select>
  );
}
