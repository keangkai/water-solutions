"use client";

import { useState, useTransition } from "react";
import { Phone, MapPin, Navigation, AlertTriangle, CheckCircle2 } from "lucide-react";
import { deliverOrder, failOrder } from "./actions";
import { mapsUrl, orderStatusInfo, type OrderStatus } from "@/lib/delivery";

export type DriverOrder = {
  id: string;
  status: OrderStatus;
  name: string;
  companyName: string | null;
  phone: string | null;
  address: string | null;
  coords: { latitude: number; longitude: number } | null;
  note: string | null;
  issueReason: string | null;
  total: number;
  lines: { id: string; label: string; unit: string; quantity: number; deliveredQuantity: number | null }[];
};

const shortReasons = ["แพ็คน้ำแตก", "ของบนรถไม่พอ", "ลูกค้าขอลดจำนวน"];
const failReasons = ["ลูกค้าไม่อยู่", "โทรไม่ติด", "หาที่อยู่ไม่เจอ", "ลูกค้ายกเลิก"];

type Mode = "idle" | "confirmFull" | "short" | "fail";

const bigButton = "min-h-[48px] rounded-xl px-4 text-sm font-medium transition-colors touch-manipulation active:scale-95";

export function DriverOrderCard({ order }: { order: DriverOrder }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (fn: typeof deliverOrder, formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await fn(order.id, formData);
      if ("error" in result) setError(result.error);
      else if ("stockWarning" in result) setStockWarning(result.stockWarning);
      else {
        setStockWarning(null);
        setMode("idle");
      }
    });
  };

  const isOpen = order.status === "CONFIRMED";
  const status = orderStatusInfo[order.status];

  return (
    <div className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col gap-3 ${isOpen ? "border-slate-200" : "border-slate-100 opacity-70"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900 break-words">{order.name}</div>
          {order.companyName && <div className="text-sm text-slate-500">{order.companyName}</div>}
        </div>
        {!isOpen && (
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${status.badge}`}>{status.label}</span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-700 min-w-0">
            <Phone className="size-4 shrink-0 text-slate-400" />
            {order.phone ?? <span className="text-amber-700 text-sm">ไม่มีเบอร์โทร</span>}
          </div>
          {order.phone && (
            <a
              href={`tel:${order.phone}`}
              className={`${bigButton} inline-flex items-center gap-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50`}
            >
              <Phone className="size-4" /> โทร
            </a>
          )}
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 text-slate-700 min-w-0">
            <MapPin className="size-4 shrink-0 mt-0.5 text-slate-400" />
            {order.address ? (
              <span className="whitespace-pre-line wrap-anywhere">{order.address}</span>
            ) : (
              <span className="text-amber-700 text-sm">ไม่มีที่อยู่ โทรถามลูกค้า</span>
            )}
          </div>
          {(order.coords || order.address) && (
            <a
              href={order.coords ? mapsUrl(`${order.coords.latitude},${order.coords.longitude}`) : mapsUrl(order.address!)}
              target="_blank"
              rel="noreferrer"
              className={`${bigButton} shrink-0 inline-flex items-center gap-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50`}
            >
              <Navigation className="size-4" /> แผนที่
            </a>
          )}
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
        {order.lines.map((l) => {
          const short = l.deliveredQuantity != null && l.deliveredQuantity < l.quantity;
          return (
            <div key={l.id} className="flex items-baseline justify-between gap-2">
              <span className="text-slate-700">{l.label}</span>
              <span className="text-lg font-semibold text-slate-900 whitespace-nowrap">
                {short ? (
                  <span className="text-amber-700">
                    {l.deliveredQuantity}/{l.quantity}
                  </span>
                ) : (
                  l.quantity
                )}{" "}
                <span className="text-sm font-normal text-slate-500">{l.unit}</span>
              </span>
            </div>
          );
        })}
        <div className="flex items-baseline justify-between gap-2 pt-1.5 border-t border-slate-200 text-sm">
          <span className="text-slate-500">ยอดที่ลูกค้าต้องโอน</span>
          <span className="font-semibold text-slate-900">{order.total.toLocaleString()} บาท</span>
        </div>
      </div>

      {order.note && (
        <div className="text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          หมายเหตุ: {order.note}
        </div>
      )}

      {order.issueReason && !isOpen && (
        <div className="flex items-start gap-1.5 text-sm text-red-700">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          {order.status === "FAILED" ? "ส่งไม่ได้" : "ส่งไม่ครบ"}: {order.issueReason}
        </div>
      )}

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}

      {isOpen && mode === "idle" && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("confirmFull")}
            className={`${bigButton} col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center justify-center gap-1.5`}
          >
            <CheckCircle2 className="size-5" /> ส่งครบแล้ว
          </button>
          <button
            onClick={() => {
              setReason("");
              setMode("short");
            }}
            className={`${bigButton} border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100`}
          >
            ส่งไม่ครบ
          </button>
          <button
            onClick={() => {
              setReason("");
              setMode("fail");
            }}
            className={`${bigButton} border border-red-300 text-red-700 bg-red-50 hover:bg-red-100`}
          >
            ส่งไม่ได้
          </button>
        </div>
      )}

      {isOpen && mode === "confirmFull" && (
        <form action={(formData) => submit(deliverOrder, formData)} className="grid grid-cols-2 gap-2">
          <input type="hidden" name="overrideStock" value={stockWarning ? "1" : ""} />
          {stockWarning && <StockWarning text={stockWarning} />}
          <p className="col-span-2 text-sm text-slate-700">ยืนยันว่าส่งครบทุกรายการตามที่ลูกค้าสั่ง?</p>
          <button
            disabled={pending}
            className={`${bigButton} bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60`}
          >
            {pending ? "กำลังบันทึก…" : stockWarning ? "ส่งต่ออยู่ดี" : "ยืนยัน ส่งครบ"}
          </button>
          <button
            type="button"
            onClick={() => setMode("idle")}
            className={`${bigButton} border border-slate-300 text-slate-600`}
          >
            กลับ
          </button>
        </form>
      )}

      {isOpen && mode === "short" && (
        <form action={(formData) => submit(deliverOrder, formData)} className="space-y-3">
          <input type="hidden" name="overrideStock" value={stockWarning ? "1" : ""} />
          {stockWarning && <StockWarning text={stockWarning} />}
          <p className="text-sm font-medium text-slate-700">ใส่จำนวนที่ส่งจริง (จำนวนที่ลูกค้าสั่งจะไม่ถูกแก้)</p>
          {order.lines.map((l) => (
            <label key={l.id} className="flex items-center justify-between gap-2 text-sm text-slate-700">
              <span>
                {l.label} <span className="text-slate-400">(สั่ง {l.quantity})</span>
              </span>
              <input
                name={`delivered.${l.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={l.quantity}
                defaultValue={l.quantity}
                required
                className="w-24 border border-slate-300 rounded-xl px-3 min-h-[44px] text-base text-black text-right focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </label>
          ))}
          <ReasonPicker presets={shortReasons} value={reason} onChange={setReason} />
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={pending}
              className={`${bigButton} bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60`}
            >
              {pending ? "กำลังบันทึก…" : stockWarning ? "ส่งต่ออยู่ดี" : "บันทึกส่งไม่ครบ"}
            </button>
            <button type="button" onClick={() => setMode("idle")} className={`${bigButton} border border-slate-300 text-slate-600`}>
              กลับ
            </button>
          </div>
        </form>
      )}

      {isOpen && mode === "fail" && (
        <form action={(formData) => submit(failOrder, formData)} className="space-y-3">
          <p className="text-sm font-medium text-slate-700">ทำไมส่งไม่ได้</p>
          <ReasonPicker presets={failReasons} value={reason} onChange={setReason} />
          <div className="grid grid-cols-2 gap-2">
            <button disabled={pending} className={`${bigButton} bg-red-600 hover:bg-red-700 text-white disabled:opacity-60`}>
              {pending ? "กำลังบันทึก…" : "บันทึกส่งไม่ได้"}
            </button>
            <button type="button" onClick={() => setMode("idle")} className={`${bigButton} border border-slate-300 text-slate-600`}>
              กลับ
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function StockWarning({ text }: { text: string }) {
  return (
    <div className="col-span-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
      {text}
      <div className="text-xs mt-1">ถ้าของอยู่บนรถจริง กด “ส่งต่ออยู่ดี” ระบบจะแจ้ง admin ให้ตรวจยอดรับเข้า</div>
    </div>
  );
}

function ReasonPicker({
  presets,
  value,
  onChange,
}: {
  presets: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`min-h-[44px] px-3 rounded-full text-sm border touch-manipulation ${
              value === p ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <input
        name="issueReason"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="เหตุผล (เลือกด้านบนหรือพิมพ์เอง)"
        className="w-full border border-slate-300 rounded-xl px-3 min-h-[44px] text-base text-black focus:outline-none focus:ring-2 focus:ring-sky-200"
      />
    </div>
  );
}
