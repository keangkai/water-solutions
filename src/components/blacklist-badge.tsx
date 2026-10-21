import { Ban } from "lucide-react";

// ป้าย "บัญชีดำ" ใช้ทุกหน้าที่แสดงชื่อลูกค้า (ถ้ามีเหตุผล แสดงเป็นข้อความกำกับได้)
export function BlacklistBadge({ reason, showReason = false }: { reason?: string | null; showReason?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200 font-medium">
        <Ban className="size-3" aria-hidden /> บัญชีดำ
      </span>
      {showReason && reason && <span className="text-xs text-red-700">{reason}</span>}
    </span>
  );
}
