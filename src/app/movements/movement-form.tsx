"use client";

import { useState } from "react";
import { Plus, X, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { createMovement, updateMovement } from "./actions";

type Product = {
  id: string;
  name: string;
  unit: string;
  defaultCostPrice: number | null;
  defaultSellPrice: number | null;
};
type Partner = { id: string; name: string; type: "SUPPLIER" | "CUSTOMER" };
type Warehouse = { id: string; name: string };
type LineRow = { productId: string; quantity: string; unitPrice: string };

const partnerTypeLabel = { SUPPLIER: "ซัพพลายเออร์", CUSTOMER: "ลูกค้า" } as const;

type InitialMovement = {
  id: string;
  type: "IN" | "OUT";
  partnerId: string;
  warehouseId: string;
  note: string | null;
  date: Date;
  lines: { productId: string; quantity: number; unitPrice: number }[];
};

function defaultPriceFor(product: Product | undefined, t: "IN" | "OUT") {
  const price = t === "IN" ? product?.defaultCostPrice : product?.defaultSellPrice;
  return price != null ? String(price) : "";
}

export function MovementForm({
  products,
  partners,
  warehouses,
  initialMovement,
  defaultType = "IN",
  onDone,
}: {
  products: Product[];
  partners: Partner[];
  warehouses: Warehouse[];
  initialMovement?: InitialMovement;
  defaultType?: "IN" | "OUT";
  onDone?: () => void;
}) {
  const isEdit = !!initialMovement;
  const [type, setType] = useState<"IN" | "OUT">(initialMovement?.type ?? defaultType);
  const [rows, setRows] = useState<LineRow[]>(
    initialMovement
      ? initialMovement.lines.map((l) => ({
          productId: l.productId,
          quantity: String(l.quantity),
          unitPrice: String(l.unitPrice),
        }))
      : [{ productId: products[0]?.id ?? "", quantity: "", unitPrice: defaultPriceFor(products[0], defaultType) }]
  );

  const addRow = () =>
    setRows((r) => [...r, { productId: products[0]?.id ?? "", quantity: "", unitPrice: defaultPriceFor(products[0], type) }]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof LineRow, value: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  const handleTypeChange = (nextType: "IN" | "OUT") => {
    setType(nextType);
    setRows((r) =>
      r.map((row) => ({
        ...row,
        unitPrice: defaultPriceFor(products.find((p) => p.id === row.productId), nextType),
      }))
    );
  };

  const handleProductChange = (i: number, productId: string) => {
    setRows((r) =>
      r.map((row, idx) =>
        idx === i
          ? { ...row, productId, unitPrice: defaultPriceFor(products.find((p) => p.id === productId), type) }
          : row
      )
    );
  };

  const total = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0);
  const totalQty = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const dateDefault = (initialMovement ? initialMovement.date : new Date()).toISOString().slice(0, 10);

  const action = isEdit ? updateMovement.bind(null, initialMovement!.id) : createMovement;

  return (
    <form
      action={async (formData) => {
        await action(formData);
        if (isEdit) {
          onDone?.();
        } else {
          setRows([{ productId: products[0]?.id ?? "", quantity: "", unitPrice: defaultPriceFor(products[0], type) }]);
        }
      }}
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4"
    >
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ประเภท</label>
          {isEdit ? (
            <select
              name="type"
              required
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as "IN" | "OUT")}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
            >
              <option value="IN">รับเข้า (ซื้อจากซัพพลายเออร์)</option>
              <option value="OUT">ขายออก (ขายให้ลูกค้า)</option>
            </select>
          ) : (
            <>
              <input type="hidden" name="type" value={type} />
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border ${
                  type === "IN"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-sky-50 text-sky-700 border-sky-200"
                }`}
              >
                {type === "IN" ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}
                {type === "IN" ? "รับเข้า" : "ขายออก"}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">คลัง</label>
          <select
            name="warehouseId"
            required
            defaultValue={initialMovement?.warehouseId}
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
          <label className="text-xs font-medium text-slate-500">คู่ค้า</label>
          <select
            name="partnerId"
            required
            defaultValue={initialMovement?.partnerId}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          >
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({partnerTypeLabel[p.type]})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">วันที่</label>
          <input
            name="date"
            type="date"
            defaultValue={dateDefault}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-[160px]">
          <label className="text-xs font-medium text-slate-500">หมายเหตุ</label>
          <input
            name="note"
            defaultValue={initialMovement?.note ?? ""}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-500">สินค้าในใบนี้ (เลือกได้หลายขนาด)</div>
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2 items-center">
            <select
              name={`lines.${i}.productId`}
              value={row.productId}
              onChange={(e) => handleProductChange(i, e.target.value)}
              required
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black flex-1 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit})
                </option>
              ))}
            </select>
            <input
              name={`lines.${i}.quantity`}
              type="number"
              min={1}
              value={row.quantity}
              onChange={(e) => updateRow(i, "quantity", e.target.value)}
              required
              placeholder="จำนวน"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black w-24 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
            />
            <input
              name={`lines.${i}.unitPrice`}
              type="number"
              step="0.01"
              min={0}
              value={row.unitPrice}
              onChange={(e) => updateRow(i, "unitPrice", e.target.value)}
              required
              placeholder="ราคา/หน่วย"
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

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 font-medium"
          >
            <Plus className="size-4" />
            เพิ่มสินค้า
          </button>
          <div className="text-sm text-slate-500">
            {totalQty.toLocaleString()} แพ็ค · รวม{" "}
            <span className="font-semibold text-slate-900">{total.toLocaleString()}</span> บาท
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Plus className="size-4" />
          {isEdit ? "บันทึกการแก้ไข" : "บันทึก"}
        </button>
        {isEdit && (
          <button type="button" onClick={onDone} className="text-sm text-slate-500 hover:text-slate-700">
            ยกเลิก
          </button>
        )}
      </div>
    </form>
  );
}
