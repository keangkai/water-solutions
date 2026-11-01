"use client";

import { startTransition, useActionState } from "react";
import Link from "next/link";
import { UserPlus, AlertTriangle } from "lucide-react";
import { createCustomer, type CreateCustomerState } from "@/app/partners/actions";
import { segmentLabel } from "@/lib/customer-labels";

type Source = { id: string; name: string };

const field =
  "w-full border border-slate-300 rounded-xl px-3 min-h-[48px] text-base text-black bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400";
const label = "text-sm font-medium text-slate-700";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

// ฟอร์มเพิ่มลูกค้าสำหรับมือถือ: คอลัมน์เดียว ช่องใหญ่ ปุ่มบันทึกติดขอบล่าง ประเภทเป็นลูกค้าเสมอ ไม่ต้องไปเพิ่มที่หน้าคู่ค้า
export function CustomerForm({ sources, zones, returnTo }: { sources: Source[]; zones: string[]; returnTo: string }) {
  const [state, action, pending] = useActionState<CreateCustomerState, FormData>(createCustomer, null);
  const duplicate = state && "duplicate" in state ? state.duplicate : null;
  const error = state && "error" in state ? state.error : null;

  // ไม่ใช้ <form action> เพราะ React จะล้างช่องที่พิมพ์ไว้หลังได้คำเตือน (เบอร์ซ้ำ) บนมือถือต้องพิมพ์ใหม่หมด
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-28">
      <input type="hidden" name="return" value={returnTo} />

      <Section title="ข้อมูลหลัก">
        <label className="flex flex-col gap-1.5">
          <span className={label}>ชื่อลูกค้า <span className="text-red-500">*</span></span>
          <input name="name" required autoComplete="off" placeholder="ชื่อจริงหรือชื่อที่เรียก" className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>ชื่อ Facebook</span>
          <input name="facebookName" autoComplete="off" placeholder="ถ้าไม่ตรงกับชื่อจริง" className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>เบอร์โทร</span>
          <input name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder="08x-xxx-xxxx" className={field} />
        </label>
      </Section>

      <Section title="ที่อยู่และแผนที่">
        <label className="flex flex-col gap-1.5">
          <span className={label}>หมุดแผนที่ (วางลิงก์ Google Maps)</span>
          <input name="mapUrl" type="url" inputMode="url" autoComplete="off" placeholder="https://maps.app.goo.gl/..." className={field} />
          <span className="text-xs text-slate-500">ถ้าลูกค้าส่งหมุดมา ให้คัดลอกลิงก์มาวาง ระบบจะอ่านพิกัดให้เอง คนขับกดเปิดแอปแผนที่ได้เลย</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>ที่อยู่</span>
          <textarea name="address" rows={3} placeholder="บ้านเลขที่ ซอย ตำบล" className={`${field} py-2.5`} />
        </label>
      </Section>

      <Section title="ที่อยู่ที่ 2 (ถ้าลูกค้าส่งสองที่)">
        <label className="flex flex-col gap-1.5">
          <span className={label}>ชื่อเรียก</span>
          <input name="address2Label" autoComplete="off" placeholder="เช่น ร้าน, ที่ทำงาน" className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>ที่อยู่ที่ 2</span>
          <textarea name="address2" rows={3} className={`${field} py-2.5`} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>หมุดแผนที่ของที่อยู่ที่ 2</span>
          <input name="mapUrl2" type="url" inputMode="url" autoComplete="off" placeholder="https://maps.app.goo.gl/..." className={field} />
        </label>
      </Section>

      <Section title="จัดกลุ่ม (ไม่บังคับ)">
        <label className="flex flex-col gap-1.5">
          <span className={label}>ประเภทลูกค้า</span>
          <select name="segment" defaultValue="" className={field}>
            <option value="">ไม่ระบุ</option>
            {Object.entries(segmentLabel).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>รู้จักร้านจาก</span>
          <select name="sourceId" defaultValue="" className={field}>
            <option value="">ไม่ทราบ</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>โซน</span>
          <input name="zone" list="customer-zones" autoComplete="off" placeholder="เช่น ตำบล หรือหมู่บ้าน" className={field} />
          <datalist id="customer-zones">
            {zones.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>ชื่อบริษัท</span>
          <input name="companyName" autoComplete="off" placeholder="ถ้ามี" className={field} />
        </label>
      </Section>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}

      {duplicate && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-2 text-sm text-amber-900">
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <span>
              มีลูกค้าเบอร์ {duplicate.phone} อยู่แล้ว: <b>{duplicate.name}</b> ตรวจก่อนว่าเป็นคนเดียวกันหรือไม่
            </span>
          </div>
          <label className="flex items-center gap-2 text-sm text-amber-900 min-h-[44px]">
            <input type="checkbox" name="allowDuplicate" value="1" className="size-5" />
            ไม่ใช่คนเดียวกัน ขอเพิ่มเป็นลูกค้าใหม่
          </label>
        </div>
      )}

      {/* ปุ่มบันทึกติดขอบล่างของจอ กดได้ด้วยนิ้วโป้งโดยไม่ต้องเลื่อนลงสุด */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-xl mx-auto flex gap-3">
          <Link
            href={returnTo}
            className="min-h-[48px] px-5 inline-flex items-center justify-center rounded-xl border border-slate-300 text-slate-700 text-sm touch-manipulation"
          >
            ยกเลิก
          </Link>
          <button
            disabled={pending}
            className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium touch-manipulation active:scale-95 disabled:opacity-60"
          >
            <UserPlus className="size-5" />
            {pending ? "กำลังบันทึก…" : duplicate ? "บันทึกลูกค้า (ยืนยันแล้ว)" : "บันทึกลูกค้า"}
          </button>
        </div>
      </div>
    </form>
  );
}
