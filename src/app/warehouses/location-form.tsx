"use client";

import { useActionState, useState } from "react";
import { MapPin } from "lucide-react";
import { setWarehouseLocation, type LocationState } from "./actions";

export function WarehouseLocationForm({ id, latitude, longitude }: { id: string; latitude: number | null; longitude: number | null }) {
  const [state, formAction, pending] = useActionState<LocationState, FormData>(setWarehouseLocation.bind(null, id), null);
  const current = latitude != null && longitude != null ? `${latitude}, ${longitude}` : "";
  // ควบคุมค่าเอง ไม่งั้น React 19 จะล้างช่องหลัง action ทำให้ข้อความที่วางไว้หายตอนบันทึกไม่สำเร็จ
  const [text, setText] = useState(current);

  return (
    <form action={formAction} className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-medium text-slate-500">
        <MapPin className="size-3.5" /> พิกัดคลัง (ใช้เรียงงานคนขับจากใกล้ไปไกล)
      </label>
      <div className="flex gap-2">
        <input
          name="location"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="วางลิงก์ Google Maps หรือ 13.75, 100.50"
          className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
        />
        <button
          disabled={pending}
          className="min-h-[44px] px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm touch-manipulation active:opacity-80 disabled:opacity-60"
        >
          {pending ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </div>
      {state && (
        <div
          role={state.ok ? "status" : "alert"}
          className={`text-xs rounded-lg px-2 py-1.5 border ${
            state.ok ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-red-700 bg-red-50 border-red-100"
          }`}
        >
          {state.message}
        </div>
      )}
      {!state && !current && <div className="text-xs text-amber-700">ยังไม่ได้ตั้งพิกัด หน้าคนขับจะไม่เรียงตามระยะ</div>}
    </form>
  );
}
