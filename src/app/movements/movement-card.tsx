"use client";

import { useState } from "react";
import { Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine, Warehouse as WarehouseIcon } from "lucide-react";
import { deleteMovement } from "./actions";
import { MovementForm } from "./movement-form";
import { formatDate } from "@/lib/format-date";

const typeLabel = { IN: "รับเข้า", OUT: "ขายออก" } as const;

type Product = { id: string; name: string; unit: string; defaultCostPrice: number | null; defaultSellPrice: number | null };
type Partner = { id: string; name: string; type: "SUPPLIER" | "CUSTOMER" };
type Warehouse = { id: string; name: string };
type Movement = {
  id: string;
  type: "IN" | "OUT";
  partnerId: string;
  warehouseId: string;
  note: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  partner: { name: string };
  warehouse: { name: string };
  lines: { id: string; productId: string; quantity: number; unitPrice: number; product: { name: string; unit: string } }[];
};

export function MovementCard({
  movement,
  products,
  partners,
  warehouses,
}: {
  movement: Movement;
  products: Product[];
  partners: Partner[];
  warehouses: Warehouse[];
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <MovementForm
        products={products}
        partners={partners}
        warehouses={warehouses}
        initialMovement={movement}
        onDone={() => setEditing(false)}
      />
    );
  }

  const total = movement.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const totalQty = movement.lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                movement.type === "IN"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-sky-50 text-sky-700 border-sky-200"
              }`}
            >
              {movement.type === "IN" ? <ArrowDownToLine className="size-3" /> : <ArrowUpFromLine className="size-3" />}
              {typeLabel[movement.type]}
            </span>
            <span className="text-xs text-slate-400">{formatDate(movement.date)}</span>
          </div>
          <div className="mt-1.5 font-medium text-slate-900">{movement.partner.name}</div>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
            <WarehouseIcon className="size-3" /> {movement.warehouse.name}
          </div>
          {movement.note && <div className="text-xs text-slate-400 mt-1">{movement.note}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-sky-600 transition-colors">
            <Pencil className="size-4" />
          </button>
          <form action={deleteMovement.bind(null, movement.id)}>
            <button className="text-slate-400 hover:text-red-600 transition-colors">
              <Trash2 className="size-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {movement.lines.map((line) => (
          <div key={line.id} className="flex items-center justify-between text-sm border-t border-slate-100 pt-1.5 first:border-0 first:pt-0">
            <div className="text-slate-600">{line.product.name}</div>
            <div className="text-slate-900 whitespace-nowrap">
              {line.quantity} {line.product.unit} × {line.unitPrice.toLocaleString()} ={" "}
              <b>{(line.quantity * line.unitPrice).toLocaleString()}</b>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-sm">
        <span className="text-slate-500">{totalQty.toLocaleString()} แพ็ค</span>
        <span className="font-semibold text-slate-900">รวม {total.toLocaleString()} บาท</span>
      </div>
    </div>
  );
}
