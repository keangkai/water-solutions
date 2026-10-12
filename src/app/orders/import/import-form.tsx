"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { importOrders, type ImportResult } from "./actions";
import { parseOrderSheet, sizeToMl } from "@/lib/parse-sheet";
import { DELIVERY_ROUNDS } from "@/lib/delivery";

type Product = { id: string; label: string; size: string | null };

const field =
  "w-full border border-slate-300 rounded-xl px-3 min-h-[44px] text-base text-black focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white";
const btn = "min-h-[44px] px-5 rounded-xl text-sm font-medium touch-manipulation active:scale-95 disabled:opacity-50";

export function ImportForm({ products, warehouses }: { products: Product[]; warehouses: { id: string; name: string }[] }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"CONFIRMED" | "DELIVERED">("CONFIRMED");
  const [result, action, pending] = useActionState<ImportResult | null, FormData>(importOrders, null);

  // ไม่ใช้ <form action> เพราะ React จะรีเซ็ตช่องที่ผู้ใช้เลือกไว้ (สินค้าต่อขนาด ราคา ฯลฯ) หลังตรวจตัวอย่าง
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const formData = new FormData(e.currentTarget, submitter);
    startTransition(() => action(formData));
  };

  const sheet = useMemo(() => (text.trim() ? parseOrderSheet(text) : null), [text]);
  const guess = (header: string) => {
    const ml = sizeToMl(header);
    return products.find((p) => sizeToMl(p.size) === ml)?.id ?? "";
  };

  const done = result && !("error" in result) && result.mode === "import" ? result : null;
  const preview = result && !("error" in result) ? result : null;
  const importable = preview ? preview.rows.filter((r) => !r.skip).length : 0;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <textarea
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="วางตารางที่คัดลอกจาก Excel ที่นี่"
        className={`${field} font-mono text-sm`}
      />
      {sheet?.error && <p className="text-sm text-red-700">{sheet.error}</p>}

      {sheet && !sheet.error && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
          <div className="text-sm text-slate-600">พบ {sheet.rows.length} แถว</div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sheet.sizeHeaders.map((h) => (
              <label key={h} className="space-y-1 text-sm text-slate-600">
                คอลัมน์ “{h}” คือสินค้า
                <select name={`product.${h}`} defaultValue={guess(h)} className={field}>
                  <option value="">— เลือก —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="space-y-1 text-sm text-slate-600">
              ราคาขาย/แพ็ค
              <input name="unitPrice" type="number" step="any" min={0} defaultValue={25} className={field} />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              ราคาต้นทุน/แพ็ค
              <input name="costPrice" type="number" step="any" min={0} defaultValue={21.5} className={field} />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              ขึ้นของจากคลัง
              <select name="warehouseId" className={field}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              รอบจัดส่ง
              <select name="deliveryRound" className={field}>
                {DELIVERY_ROUNDS.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-700 min-h-[44px]">
            <input type="checkbox" name="includeWarned" value="1" className="size-5 mt-0.5 shrink-0" />
            <span>
              นำเข้าแถวที่มีคำเตือน “อาจซ้ำกับใบขายออกเดิม” ด้วย
              <span className="block text-xs text-slate-500">
                ปกติแถวเหล่านี้จะถูกข้ามไว้ก่อน เพื่อกันยอดขายและสต็อกถูกนับซ้ำ ตรวจใบขายออกเดิมแล้วค่อยเลือกติ๊กถ้าไม่ซ้ำจริง
              </span>
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700 min-h-[44px]">
            <input type="checkbox" name="setDefaults" value="1" defaultChecked className="size-5" />
            ตั้งราคาขาย/ต้นทุนข้างบนเป็นราคาตั้งต้นของสินค้าที่ยังไม่มีราคา (ไม่ทับราคาที่ตั้งไว้แล้ว)
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">สถานะออเดอร์ที่นำเข้า</legend>
            <label className="flex items-start gap-2 text-sm text-slate-700 min-h-[44px]">
              <input type="radio" name="status" value="CONFIRMED" checked={status === "CONFIRMED"} onChange={() => setStatus("CONFIRMED")} className="size-5 mt-0.5" />
              <span>รอส่ง (ขึ้นหน้าคนขับ ยังไม่ตัดสต็อกจนกว่าคนขับกดส่ง)</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700 min-h-[44px]">
              <input type="radio" name="status" value="DELIVERED" checked={status === "DELIVERED"} onChange={() => setStatus("DELIVERED")} className="size-5 mt-0.5" />
              <span>ส่งแล้ว (ใช้กับออเดอร์เก่า สร้างใบขายออกและ<b>ตัดสต็อกทันที</b>)</span>
            </label>
            {status === "DELIVERED" && (
              <label className="flex items-center gap-2 text-sm text-slate-700 min-h-[44px] pl-7">
                <input type="checkbox" name="paid" value="1" className="size-5" /> ลูกค้าโอนเงินแล้วทั้งหมด
              </label>
            )}
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <button name="mode" value="preview" disabled={pending} className={`${btn} border border-slate-300 text-slate-700`}>
              {pending ? "กำลังตรวจ…" : "ตรวจสอบตัวอย่าง"}
            </button>
            <button
              name="mode"
              value="import"
              disabled={pending || !preview || preview.mode === "import" || importable === 0}
              className={`${btn} bg-sky-600 hover:bg-sky-700 text-white`}
            >
              นำเข้า {preview && preview.mode === "preview" ? importable : ""} ออเดอร์
            </button>
          </div>
          <p className="text-xs text-slate-500">ต้องกด “ตรวจสอบตัวอย่าง” ก่อนจึงจะนำเข้าได้ ถ้าแก้ข้อมูลหรือตัวเลือก ให้ตรวจสอบใหม่</p>
        </div>
      )}

      {result && "error" in result && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{result.error}</div>
      )}

      {done && (
        <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          นำเข้าแล้ว {done.imported} ออเดอร์{done.defaultsSet ? " และตั้งราคาตั้งต้นให้สินค้าที่ยังไม่มีราคา" : ""}
        </div>
      )}

      {preview && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-2 px-3 font-medium">#</th>
                <th className="py-2 px-3 font-medium">ลูกค้า</th>
                {preview.sizeHeaders.map((h) => (
                  <th key={h} className="py-2 px-3 font-medium text-right">{h}</th>
                ))}
                <th className="py-2 px-3 font-medium">สั่ง</th>
                <th className="py-2 px-3 font-medium">ส่ง</th>
                <th className="py-2 px-3 font-medium">ผล</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r) => (
                <tr key={r.rowNo} className="border-b border-slate-100 last:border-0 align-top">
                  <td className="py-2 px-3 text-slate-400">{r.rowNo}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {r.name}{" "}
                    <span className={`text-xs ${r.customer === "new" ? "text-amber-700" : "text-slate-400"}`}>
                      {r.customer === "new" ? "ลูกค้าใหม่" : ""}
                    </span>
                  </td>
                  {preview.sizeHeaders.map((h) => (
                    <td key={h} className="py-2 px-3 text-right text-slate-700">{r.sizes[h] ?? ""}</td>
                  ))}
                  <td className="py-2 px-3 whitespace-nowrap text-slate-600">{r.orderDate ?? "-"}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-slate-600">{r.deliveryDate ?? "-"}</td>
                  <td className={`py-2 px-3 ${r.warned ? "text-amber-700" : r.skip ? "text-red-700" : "text-emerald-700"}`}>
                    {r.skip ??
                      (r.warned
                        ? `${preview.mode === "import" ? "นำเข้าแล้ว" : "พร้อมนำเข้า"} (ยืนยันแล้วว่าไม่ซ้ำ)`
                        : preview.mode === "import"
                          ? "นำเข้าแล้ว"
                          : "พร้อมนำเข้า")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}
