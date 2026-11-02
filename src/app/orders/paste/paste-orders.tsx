"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardPaste, UserPlus } from "lucide-react";
import { OrderForm, type OrderCustomer, type OrderProduct, type OrderWarehouse } from "../order-form";
import { createCustomerFromPaste, fillCustomerAddress, parsePastedOrders, type PastedOrder } from "./actions";

const inputClass =
  "border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 w-full";

export function PasteOrders({
  customers,
  products,
  warehouses,
  today,
  minDeliveryDate,
}: {
  customers: OrderCustomer[];
  products: OrderProduct[];
  warehouses: OrderWarehouse[];
  today: string;
  minDeliveryDate: string;
}) {
  const [text, setText] = useState("");
  const [orders, setOrders] = useState<PastedOrder[] | null>(null);
  // เพิ่มทุกครั้งที่กดอ่าน เพื่อให้การ์ดเริ่มใหม่ ไม่จำลูกค้า/สถานะของข้อความรอบก่อน
  const [batch, setBatch] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [pending, startTransition] = useTransition();

  const read = () => {
    setError(null);
    startTransition(async () => {
      const result = await parsePastedOrders(text);
      if ("error" in result) {
        setError(result.error);
        setOrders(null);
      } else {
        setOrders(result.orders);
        setBatch((n) => n + 1);
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          placeholder={"รับออเดอร์ครับคุณลูกค้า\nคุณมด\n063-xxx-xxxx\n\n1500ml = 30 แพค\n600 ml = 30 แพค\n\nพิกัด ...\nหมุด google map: https://maps.app.goo.gl/...\nส่ง 31/10 รอบ 18.00"}
          className={`${inputClass} font-mono`}
        />
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        <button
          onClick={read}
          disabled={pending || !text.trim()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium touch-manipulation active:scale-95 disabled:opacity-60"
        >
          <ClipboardPaste className="size-5" />
          {pending ? "กำลังอ่าน…" : "อ่านข้อความ"}
        </button>
      </div>

      {orders?.map((order) => (
        <PastedOrderCard
          key={`${batch}-${order.key}`}
          order={order}
          total={orders.length}
          customers={localCustomers}
          onCustomer={(c) => setLocalCustomers((list) => [...list.filter((x) => x.id !== c.id), c])}
          products={products}
          warehouses={warehouses}
          today={today}
          minDeliveryDate={minDeliveryDate}
        />
      ))}
    </div>
  );
}

function PastedOrderCard({
  order,
  total,
  customers,
  onCustomer,
  products,
  warehouses,
  today,
  minDeliveryDate,
}: {
  order: PastedOrder;
  total: number;
  customers: OrderCustomer[];
  onCustomer: (c: OrderCustomer) => void;
  products: OrderProduct[];
  warehouses: OrderWarehouse[];
  today: string;
  minDeliveryDate: string;
}) {
  const [customerId, setCustomerId] = useState<string | null>(order.customer?.id ?? null);
  const [saved, setSaved] = useState(false);
  const [filled, setFilled] = useState(0);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: (order.name ?? "").replace(/^คุณ\s*/, ""),
    phone: order.phone ?? "",
    address: order.address ?? "",
    mapUrl: order.mapUrl ?? "",
  });

  const chosen = customers.find((c) => c.id === customerId);
  const canFill = !!chosen && order.canFillAddress && !(chosen.address || chosen.mapUrl) && filled === 0;

  const createCustomer = () => {
    setNote(null);
    const fd = new FormData();
    for (const [k, v] of Object.entries(form)) fd.set(k, v);
    startTransition(async () => {
      const result = await createCustomerFromPaste(fd);
      if (result.customer) {
        onCustomer(result.customer as OrderCustomer);
        setCustomerId(result.customer.id);
        setCreating(false);
      } else setNote(result.error ?? "สร้างลูกค้าไม่สำเร็จ");
    });
  };

  const fillAddress = () => {
    if (!chosen) return;
    setNote(null);
    startTransition(async () => {
      const result = await fillCustomerAddress(chosen.id, order.address, order.mapUrl);
      if (result.customer) {
        onCustomer(result.customer as OrderCustomer);
        setFilled((n) => n + 1);
      } else setNote(result.error ?? "เติมที่อยู่ไม่สำเร็จ");
    });
  };

  return (
    <section className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-slate-900">
          {total > 1 ? `ออเดอร์ที่ ${order.key + 1}: ` : ""}
          {order.name ?? "ไม่พบชื่อ"}
          {order.phone && <span className="font-normal text-slate-500"> · {order.phone}</span>}
        </h2>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" /> บันทึกแล้ว
          </span>
        )}
      </div>

      {saved ? (
        <Link href="/orders" className="inline-flex items-center min-h-[44px] text-sm text-sky-600 hover:text-sky-700">
          ดูออเดอร์ทั้งหมด
        </Link>
      ) : (
        <>
          {/* ลูกค้า */}
          {chosen ? (
            <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              ลูกค้า: <b>{chosen.name}</b>
              {customerId === order.customer?.id && order.matchedBy && <> (เทียบจาก{order.matchedBy === "phone" ? "เบอร์โทร" : "ชื่อ"})</>}
              {canFill && (
                <button
                  onClick={fillAddress}
                  disabled={pending}
                  className="mt-2 flex min-h-[44px] items-center px-3 rounded-lg border border-emerald-300 bg-white text-emerald-700 touch-manipulation active:scale-95"
                >
                  ลูกค้ายังไม่มีที่อยู่ เติมที่อยู่/หมุดจากข้อความให้ลูกค้า
                </button>
              )}
              {order.deliveryAddress && (
                <div className="mt-1 text-xs text-amber-800">ที่อยู่ในข้อความต่างจากที่บันทึกไว้ ใส่เป็นที่อยู่จัดส่งเฉพาะออเดอร์นี้ให้แล้ว (ลบได้ในฟอร์ม)</div>
              )}
            </div>
          ) : (
            <div className="space-y-3 bg-white border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2 text-sm text-amber-900">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                {order.candidates.length > 0 ? "พบลูกค้าชื่อใกล้เคียง เลือกคนที่ใช่ หรือสร้างลูกค้าใหม่" : "ไม่พบลูกค้าชื่อ/เบอร์นี้ในระบบ"}
              </div>
              {order.candidates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {order.candidates.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCustomerId(c.id)}
                      className="min-h-[44px] px-3 rounded-full border border-slate-300 bg-white text-sm text-slate-700 hover:bg-sky-50 touch-manipulation active:scale-95 max-w-full truncate"
                    >
                      {c.name}
                      {c.phone && ` · ${c.phone}`}
                    </button>
                  ))}
                </div>
              )}
              {!creating ? (
                <button
                  onClick={() => setCreating(true)}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium touch-manipulation active:scale-95"
                >
                  <UserPlus className="size-4" /> สร้างลูกค้าใหม่จากข้อความ
                </button>
              ) : (
                <div className="space-y-2">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ชื่อลูกค้า" className={inputClass} />
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="เบอร์โทร" inputMode="tel" className={inputClass} />
                  <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} placeholder="ที่อยู่" className={inputClass} />
                  <input value={form.mapUrl} onChange={(e) => setForm({ ...form, mapUrl: e.target.value })} placeholder="ลิงก์ Google Maps" inputMode="url" className={inputClass} />
                  <div className="flex gap-2">
                    <button
                      onClick={createCustomer}
                      disabled={pending || !form.name.trim()}
                      className="flex-1 min-h-[44px] rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium touch-manipulation active:scale-95 disabled:opacity-60"
                    >
                      {pending ? "กำลังสร้าง…" : "สร้างลูกค้าและใช้กับออเดอร์นี้"}
                    </button>
                    <button onClick={() => setCreating(false)} className="min-h-[44px] px-3 text-sm text-slate-600">
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {note && <div className="text-sm text-red-700">{note}</div>}

          {order.warnings.length > 0 && (
            <ul className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1 list-disc list-inside">
              {order.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          {order.unparsed.length > 0 && (
            <div className="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <div className="text-xs font-medium text-slate-500">บรรทัดที่อ่านไม่ได้ (ไม่ได้ใส่ลงฟอร์ม)</div>
              {order.unparsed.map((l, i) => (
                <div key={i} className="break-words">{l}</div>
              ))}
            </div>
          )}

          {customerId ? (
            <OrderForm
              key={`${order.key}-${customerId}-${filled}`}
              customers={customers}
              products={products}
              warehouses={warehouses}
              today={today}
              minDeliveryDate={minDeliveryDate}
              defaultCustomerId={customerId}
              prefill={{
                deliveryDate: order.deliveryDate,
                deliveryRound: order.deliveryRound,
                deliveryAddress: order.deliveryAddress,
                lines: order.lines,
              }}
              onSaved={() => setSaved(true)}
            />
          ) : (
            <div className="text-sm text-slate-500">เลือกหรือสร้างลูกค้าก่อน ฟอร์มออเดอร์จึงจะขึ้น</div>
          )}
        </>
      )}
    </section>
  );
}
