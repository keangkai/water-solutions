"use client";

import { useRouter } from "next/navigation";
import type { PeriodOption, PeriodView } from "@/lib/report-period";

const field =
  "min-h-[44px] border border-slate-300 rounded-xl px-3 text-base text-black bg-white focus:outline-none focus:ring-2 focus:ring-sky-200";

export function PeriodSelect({ view, value, options }: { view: PeriodView; value: string; options: PeriodOption[] }) {
  const router = useRouter();
  const go = (key: string) => router.push(`/reports?view=${view}&key=${key}`);

  // รายวันเลือกจากปฏิทิน (ได้ค่า yyyy-mm-dd เสมอ ไม่ขึ้นกับภาษาเครื่อง) ถ้าลบค่าออกจนว่างจะไม่เปลี่ยนหน้า
  if (view === "day") {
    const count = options.find((o) => o.key === value)?.count ?? 0;
    return (
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={value}
          onChange={(e) => e.target.value && go(e.target.value)}
          aria-label="เลือกวันที่"
          className={field}
        />
        <span className="text-sm text-slate-500">{count > 0 ? `${count} รายการ` : "ไม่มีรายการ"}</span>
      </div>
    );
  }

  return (
    <select value={value} onChange={(e) => go(e.target.value)} aria-label="เลือกช่วงเวลา" className={field}>
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
          {o.count > 0 ? ` · ${o.count} รายการ` : ""}
        </option>
      ))}
    </select>
  );
}
