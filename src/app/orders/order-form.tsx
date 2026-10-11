"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { createOrder, updateOrder } from "./actions";
import { DELIVERY_ROUNDS } from "@/lib/delivery";
import { DateInput } from "@/components/date-input";

export type OrderProduct = { id: string; name: string; unit: string; defaultSellPrice: number | null };
export type OrderCustomer = {
  id: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  address: string | null;
};
export type OrderWarehouse = { id: string; name: string };
export type InitialOrder = {
  id: string;
  partnerId: string;
  warehouseId: string;
  orderDate: Date;
  deliveryDate: Date;
  deliveryRound: string;
  deliveryAddress: string | null;
  note: string | null;
  lines: { productId: string; quantity: number; unitPrice: number }[];
};
type LineRow = { productId: string; quantity: string; unitPrice: string };

const inputClass =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-white";

function defaultPrice(product: OrderProduct | undefined) {
  return product?.defaultSellPrice != null ? String(product.defaultSellPrice) : "";
}

export function OrderForm({
  customers,
  products,
  warehouses,
  today,
  minDeliveryDate,
  initialOrder,
  onDone,
}: {
  customers: OrderCustomer[];
  products: OrderProduct[];
  warehouses: OrderWarehouse[];
  today: string;
  minDeliveryDate?: string; // วันส่งที่เก่าสุดสำหรับออเดอร์ใหม่ กำหนดโดย server
  initialOrder?: InitialOrder;
  onDone?: () => void;
}) {
  const isEdit = !!initialOrder;
  const emptyRow = (): LineRow => ({ productId: products[0]?.id ?? "", quantity: "", unitPrice: defaultPrice(products[0]) });
  const [partnerId, setPartnerId] = useState(initialOrder?.partnerId ?? customers[0]?.id ?? "");
  const [rows, setRows] = useState<LineRow[]>(
    initialOrder
      ? initialOrder.lines.map((l) => ({ productId: l.productId, quantity: String(l.quantity), unitPrice: String(l.unitPrice) }))
      : [emptyRow()]
  );

  const customer = customers.find((c) => c.id === partnerId);
  const total = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0);
  const totalQty = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  const updateRow = (i: number, patch: Partial<LineRow>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const action = isEdit ? updateOrder.bind(null, initialOrder!.id) : createOrder;

  return (
    <form
      action={async (formData) => {
        await action(formData);
        if (isEdit) onDone?.();
        else setRows([emptyRow()]);
      }}
      className={`border rounded-xl p-5 shadow-sm space-y-4 ${isEdit ? "bg-sky-50/40 border-sky-200" : "bg-white border-slate-200"}`}
    >
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[200px]">
          <div className="flex items-baseline justify-between gap-3">
            <label className="text-xs font-medium text-slate-500">ลูกค้า</label>
            <Link href="/partners" className="text-xs text-sky-600 hover:text-sky-700">
              + ลูกค้าใหม่
            </Link>
          </div>
          <select
            name="partnerId"
            required
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className={inputClass}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName ? `${c.name} (${c.companyName})` : c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">วันที่สั่ง</label>
          <DateInput
            name="orderDate"
            defaultValue={initialOrder ? initialOrder.orderDate.toISOString().slice(0, 10) : today}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">วันที่ส่ง</label>
          <DateInput
            name="deliveryDate"
            min={isEdit ? undefined : minDeliveryDate}
            defaultValue={initialOrder ? initialOrder.deliveryDate.toISOString().slice(0, 10) : today}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">รอบจัดส่ง</label>
          <select name="deliveryRound" required defaultValue={initialOrder?.deliveryRound} className={inputClass}>
            {DELIVERY_ROUNDS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">ขึ้นของจากคลัง</label>
          <select name="warehouseId" required defaultValue={initialOrder?.warehouseId} className={inputClass}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {customer && (
        <div className="text-xs text-slate-500">
          เบอร์โทร: {customer.phone ?? <span className="text-amber-700">ยังไม่มีเบอร์โทร</span>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">ที่อยู่จัดส่ง (เว้นว่าง = ใช้ที่อยู่ลูกค้า)</label>
          <textarea
            name="deliveryAddress"
            rows={2}
            defaultValue={initialOrder?.deliveryAddress ?? ""}
            placeholder={customer?.address ?? "ลูกค้ารายนี้ยังไม่มีที่อยู่ กรอกที่อยู่จัดส่งที่นี่"}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">หมายเหตุถึงคนขับ</label>
          <textarea
            name="note"
            rows={2}
            defaultValue={initialOrder?.note ?? ""}
            placeholder="เช่น วางหน้าบ้าน, โทรก่อนถึง"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-500">สินค้าที่สั่ง</div>
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2 items-center">
            <select
              name={`lines.${i}.productId`}
              value={row.productId}
              onChange={(e) =>
                updateRow(i, {
                  productId: e.target.value,
                  unitPrice: defaultPrice(products.find((p) => p.id === e.target.value)),
                })
              }
              required
              className={`${inputClass} flex-1 min-w-[160px]`}
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
              onChange={(e) => updateRow(i, { quantity: e.target.value })}
              required
              placeholder="จำนวน"
              className={`${inputClass} w-24`}
            />
            <input
              name={`lines.${i}.unitPrice`}
              type="number"
              step="0.01"
              min={0}
              value={row.unitPrice}
              onChange={(e) => updateRow(i, { unitPrice: e.target.value })}
              required
              placeholder="ราคา/หน่วย"
              className={`${inputClass} w-28`}
            />
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
              disabled={rows.length === 1}
              className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors p-1"
              aria-label="ลบรายการ"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setRows((r) => [...r, emptyRow()])}
            className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 font-medium"
          >
            <Plus className="size-4" />
            เพิ่มสินค้า
          </button>
          <div className="text-sm text-slate-500">
            {totalQty.toLocaleString()} แพ็ค · ยอดโอน <span className="font-semibold text-slate-900">{total.toLocaleString()}</span> บาท
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg px-4 py-2 min-h-[44px] transition-colors touch-manipulation active:opacity-80">
          <Plus className="size-4" />
          {isEdit ? "บันทึกการแก้ไข" : "บันทึกออเดอร์ที่ลูกค้ายืนยัน"}
        </button>
        {isEdit && (
          <button type="button" onClick={onDone} className="text-sm text-slate-500 hover:text-slate-700 px-2 min-h-[44px]">
            ยกเลิก
          </button>
        )}
      </div>
    </form>
  );
}
