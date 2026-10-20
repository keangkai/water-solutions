import { CheckCircle2 } from "lucide-react";

// แจ้งว่าเพิ่มลูกค้าแล้ว (แสดงหลังกลับมาจากหน้าเพิ่มลูกค้า)
export function AddedBanner({ name, hint }: { name: string; hint?: string }) {
  return (
    <div role="status" className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3">
      <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
      <span>
        เพิ่มลูกค้า <b>{name}</b> แล้ว{hint ? ` ${hint}` : ""}
      </span>
    </div>
  );
}
