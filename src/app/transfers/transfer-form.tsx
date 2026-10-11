"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createTransfer } from "./actions";
import { DateInput } from "@/components/date-input";

type Option = { id: string; name: string };
type Row = { productId: string; quantity: string };

const field =
  "w-full border border-slate-300 rounded-xl px-3 min-h-[44px] text-base text-black focus:outline-none focus:ring-2 focus:ring-sky-200";

export function TransferForm({
  fromWarehouses,
  toWarehouses,
  products,
  today,
}: {
  fromWarehouses: Option[]; // ต้นทางเลือกได้ทุกคลัง รวมคลังที่ปิดแล้ว (เพื่อย้ายของออก)
  toWarehouses: Option[]; // ปลายทางเฉพาะคลังที่เปิดใช้งาน
  products: (Option & { unit: string })[];
  today: string;
}) {
  const [rows, setRows] = useState<Row[]>([{ productId: products[0]?.id ?? "", quantity: "" }]);
  const [from, setFrom] = useState(fromWarehouses[0]?.id ?? "");
  const [to, setTo] = useState(toWarehouses.find((w) => w.id !== fromWarehouses[0]?.id)?.id ?? toWarehouses[0]?.id ?? "");
  const [formKey, setFormKey] = useState(0);

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  return (
    <form
      key={formKey}
      action={async (formData) => {
        await createTransfer(formData);
        setRows([{ productId: products[0]?.id ?? "", quantity: "" }]);
        setFormKey((k) => k + 1);
      }}
      className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="space-y-1 text-sm text-slate-600">
          จากคลัง
          <select name="fromWarehouseId" value={from} onChange={(e) => setFrom(e.target.value)} className={field}>
            {fromWarehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-600">
          ไปคลัง
          <select name="toWarehouseId" value={to} onChange={(e) => setTo(e.target.value)} className={field}>
            {toWarehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-600">
          วันที่
          <DateInput name="date" defaultValue={today} className={field} />
        </label>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => {
          const unit = products.find((p) => p.id === row.productId)?.unit;
          return (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select
                name={`lines.${i}.productId`}
                value={row.productId}
                onChange={(e) => update(i, { productId: e.target.value })}
                className={`${field} w-full sm:w-auto sm:flex-1 min-w-0`}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                name={`lines.${i}.quantity`}
                type="number"
                inputMode="numeric"
                min={1}
                value={row.quantity}
                onChange={(e) => update(i, { quantity: e.target.value })}
                placeholder="จำนวน"
                className={`${field} w-28 shrink-0 text-right`}
              />
              <span className="text-sm text-slate-400 w-12 shrink-0 truncate">{unit}</span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
                  className="ml-auto sm:ml-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-slate-400 hover:text-red-600 touch-manipulation"
                  aria-label="ลบรายการ"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setRows((r) => [...r, { productId: products[0]?.id ?? "", quantity: "" }])}
          className="inline-flex items-center gap-1 text-sm text-sky-600 min-h-[44px] touch-manipulation"
        >
          <Plus className="size-4" /> เพิ่มสินค้า
        </button>
      </div>

      <input name="note" placeholder="หมายเหตุ (ถ้ามี)" className={field} />

      {from === to && <p className="text-sm text-amber-700">เลือกคลังต้นทางและปลายทางให้ต่างกัน</p>}
      <button
        disabled={from === to}
        className="min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50 touch-manipulation active:scale-95"
      >
        บันทึกการโอนย้าย
      </button>
    </form>
  );
}
