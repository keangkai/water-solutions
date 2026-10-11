"use client";

import { useState } from "react";
import { Pencil, Phone, MapPin, Warehouse as WarehouseIcon, AlertTriangle } from "lucide-react";
import { cancelOrder, setOrderPaid } from "./actions";
import { OrderForm, type OrderCustomer, type OrderProduct, type OrderWarehouse } from "./order-form";
import { formatDate } from "@/lib/format-date";
import { LinkifiedText } from "@/components/linkified-text";
import { orderStatusInfo, roundLabel, type OrderStatus } from "@/lib/delivery";

export type OrderCardData = {
  id: string;
  partnerId: string;
  warehouseId: string;
  orderDate: Date;
  deliveryDate: Date;
  deliveryRound: string;
  deliveryAddress: string | null;
  note: string | null;
  status: OrderStatus;
  issueReason: string | null;
  deliveredAt: Date | null;
  paidAt: Date | null;
  partner: { name: string; companyName: string | null; phone: string | null; address: string | null };
  warehouse: { name: string };
  lines: {
    id: string;
    productId: string;
    quantity: number;
    deliveredQuantity: number | null;
    unitPrice: number;
    product: { name: string; unit: string };
  }[];
};

export function OrderCard({
  order,
  customers,
  products,
  warehouses,
  today,
}: {
  order: OrderCardData;
  customers: OrderCustomer[];
  products: OrderProduct[];
  warehouses: OrderWarehouse[];
  today: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (editing) {
    return (
      <OrderForm
        customers={customers}
        products={products}
        warehouses={warehouses}
        today={today}
        initialOrder={order}
        onDone={() => setEditing(false)}
      />
    );
  }

  const status = orderStatusInfo[order.status];
  const isOpen = order.status === "CONFIRMED" || order.status === "FAILED";
  const isDelivered = order.status === "DELIVERED";
  // ยอดโอนคิดจากจำนวนที่ส่งจริงเมื่อส่งแล้ว
  const total = order.lines.reduce(
    (sum, l) => sum + (isDelivered ? (l.deliveredQuantity ?? l.quantity) : l.quantity) * l.unitPrice,
    0
  );
  const address = order.deliveryAddress ?? order.partner.address;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${status.badge}`}>{status.label}</span>
            <span className="text-xs text-slate-500">
              สั่ง {formatDate(order.orderDate)} · ส่ง {formatDate(order.deliveryDate)} · รอบ {roundLabel(order.deliveryRound)}
            </span>
          </div>
          <div className="mt-1.5 font-medium text-slate-900">{order.partner.name}</div>
          {order.partner.companyName && <div className="text-xs text-slate-500">{order.partner.companyName}</div>}
        </div>
        {isOpen && (
          <button
            onClick={() => setEditing(true)}
            className="text-slate-400 hover:text-sky-600 transition-colors p-1"
            aria-label="แก้ไขหรือเลื่อนวันส่ง"
          >
            <Pencil className="size-4" />
          </button>
        )}
      </div>

      <div className="space-y-1 text-sm text-slate-600">
        <div className="flex items-center gap-1.5">
          <Phone className="size-3.5 shrink-0 text-slate-400" />
          {order.partner.phone ?? <span className="text-amber-700">ยังไม่มีเบอร์โทร</span>}
        </div>
        <div className="flex items-start gap-1.5">
          <MapPin className="size-3.5 shrink-0 mt-1 text-slate-400" />
          {address ? (
            <span className="whitespace-pre-line wrap-anywhere min-w-0"><LinkifiedText text={address} /></span>
          ) : (
            <span className="text-amber-700">ยังไม่มีที่อยู่</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <WarehouseIcon className="size-3 shrink-0" /> ขึ้นของจาก {order.warehouse.name}
        </div>
        {order.note && <div className="text-xs text-slate-500">หมายเหตุ: {order.note}</div>}
      </div>

      <div className="space-y-1.5">
        {order.lines.map((l) => {
          const short = isDelivered && l.deliveredQuantity != null && l.deliveredQuantity < l.quantity;
          return (
            <div
              key={l.id}
              className="flex items-center justify-between gap-2 text-sm border-t border-slate-100 pt-1.5 first:border-0 first:pt-0"
            >
              <div className="text-slate-600">{l.product.name}</div>
              <div className="text-slate-900 whitespace-nowrap">
                {short ? (
                  <span className="text-amber-700">
                    ส่ง {l.deliveredQuantity}/{l.quantity}
                  </span>
                ) : (
                  l.quantity
                )}{" "}
                {l.product.unit} × {l.unitPrice.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {order.issueReason && (
        <div className="flex items-start gap-1.5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>
            {order.status === "FAILED" ? "ส่งไม่ได้" : "ส่งไม่ครบ"}: {order.issueReason}
          </span>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-slate-900">ยอดโอน {total.toLocaleString()} บาท</span>
        <div className="flex items-center gap-2">
          {isDelivered &&
            (order.paidAt ? (
              <form action={setOrderPaid.bind(null, order.id, false)} className="flex items-center gap-2">
                <span className="text-xs text-emerald-700">โอนแล้ว {formatDate(order.paidAt)}</span>
                <button className="text-xs text-slate-400 hover:text-slate-600">ยกเลิก</button>
              </form>
            ) : (
              <form action={setOrderPaid.bind(null, order.id, true)}>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg px-3 min-h-[44px] transition-colors touch-manipulation active:opacity-80">
                  ได้รับโอนแล้ว
                </button>
              </form>
            ))}
          {isOpen &&
            (confirmingCancel ? (
              <form action={cancelOrder.bind(null, order.id)} className="flex items-center gap-2">
                <button className="text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg px-3 min-h-[44px] touch-manipulation">
                  ยืนยันยกเลิกออเดอร์
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  className="text-sm text-slate-500 hover:text-slate-700 min-h-[44px] px-1"
                >
                  ไม่ยกเลิก
                </button>
              </form>
            ) : (
              <button
                onClick={() => setConfirmingCancel(true)}
                className="text-sm text-slate-500 hover:text-red-600 min-h-[44px] px-1"
              >
                ยกเลิกออเดอร์
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
