"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createStockCount } from "./actions";

const presetLabels = ["พาเลซใหญ่", "พาเลซกลาง", "กระดาษใหญ่", "กลาง", "แถวเสริม"];

type Warehouse = { id: string; name: string };
type Product = { id: string; name: string; unit: string };

export function StockCountForm({
  warehouses,
  products,
}: {
  warehouses: Warehouse[];
  products: Product[];
}) {
  const [rows, setRows] = useState([{ label: "", quantity: "" }]);

  const addRow = () => setRows((r) => [...r, { label: "", quantity: "" }]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: "label" | "quantity", value: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  const total = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={createStockCount}
      onSubmit={() => setTimeout(() => setRows([{ label: "", quantity: "" }]), 0)}
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4"
    >
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">วันที่นับ (รอบ)</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={today}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">คลัง</label>
          <select
            name="warehouseId"
            required
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ขนาดน้ำ / สินค้า</label>
          <select
            name="productId"
            required
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unit})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-slate-500">หมายเหตุ</label>
          <input
            name="note"
            placeholder="เช่น นับช่วงเช้า"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-500">
          รายการนับแยกตามลักษณะการจัดเก็บ
        </div>
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              name={`lines.${i}.label`}
              value={row.label}
              onChange={(e) => updateRow(i, "label", e.target.value)}
              required
              list="stock-count-label-presets"
              placeholder="เช่น พาเลซใหญ่"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black flex-1 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
            />
            <input
              name={`lines.${i}.quantity`}
              type="number"
              min={1}
              value={row.quantity}
              onChange={(e) => updateRow(i, "quantity", e.target.value)}
              required
              placeholder="จำนวน"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black w-28 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={rows.length === 1}
              className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        <datalist id="stock-count-label-presets">
          {presetLabels.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 font-medium"
          >
            <Plus className="size-4" />
            เพิ่มรายการ
          </button>
          <div className="text-sm text-slate-500">
            รวมทั้งหมด: <span className="font-semibold text-slate-900">{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <button className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
        <Plus className="size-4" />
        บันทึกผลนับ
      </button>
    </form>
  );
}
