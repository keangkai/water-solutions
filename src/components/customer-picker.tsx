"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Plus, X } from "lucide-react";
import { facebookNameIfDifferent } from "@/lib/customer-labels";

export type PickableCustomer = {
  id: string;
  name: string;
  companyName: string | null;
  facebookName: string | null;
  isBlacklisted: boolean;
  phone: string | null;
  zone: string | null;
};

const MAX_RESULTS = 8;

function label(c: PickableCustomer) {
  return (c.isBlacklisted ? "⛔ " : "") + c.name;
}

function subline(c: PickableCustomer) {
  return [c.companyName, facebookNameIfDifferent(c.name, c.facebookName) && `FB: ${facebookNameIfDifferent(c.name, c.facebookName)}`, c.phone, c.zone && `โซน ${c.zone}`]
    .filter(Boolean)
    .join(" · ");
}

// เลือกลูกค้าด้วยการค้นหา + ปุ่มลูกค้าที่สั่งบ่อย แทนการเลื่อนหาใน select
// quickIds เรียงโดย server แล้ว ที่นี่แค่แสดง
export function CustomerPicker({
  customers,
  quickIds,
  value,
  onChange,
  newCustomerHref,
  inputClass,
}: {
  customers: PickableCustomer[];
  quickIds: string[];
  value: string;
  onChange: (id: string) => void;
  newCustomerHref: string;
  inputClass: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = customers.find((c) => c.id === value);
  const quick = quickIds.map((id) => customers.find((c) => c.id === id)).filter((c): c is PickableCustomer => !!c);

  const needle = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!needle) return [];
    return customers.filter((c) =>
      [c.name, c.companyName, c.facebookName, c.phone, c.zone].some((v) => v?.toLowerCase().includes(needle))
    );
  }, [customers, needle]);

  const pick = (id: string) => {
    onChange(id);
    setQuery("");
    setOpen(false);
  };

  const newButton = (
    <Link
      href={newCustomerHref}
      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium shadow-sm transition-colors touch-manipulation active:scale-95 whitespace-nowrap"
    >
      <Plus className="size-4" /> เพิ่มลูกค้าใหม่
    </Link>
  );

  return (
    <div className="flex flex-col gap-2 w-full sm:min-w-[320px] sm:flex-1">
      <label className="text-xs font-medium text-slate-500">ลูกค้า</label>
      {/* ช่องซ่อนไว้ให้ฟอร์มส่งค่า และบังคับให้เลือกลูกค้าก่อนบันทึก */}
      <input type="hidden" name="partnerId" value={value} />
      <input
        tabIndex={-1}
        aria-hidden
        required
        value={value}
        onChange={() => {}}
        className="sr-only"
        onInvalid={() => {
          setOpen(true);
        }}
      />

      {selected ? (
        <div className="flex items-start gap-2 border border-sky-200 bg-sky-50 rounded-lg px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="font-medium text-slate-900 break-words">{label(selected)}</div>
            <div className="text-xs text-slate-500 break-words">{subline(selected)}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(true);
            }}
            className="min-h-[44px] px-2 inline-flex items-center gap-1 text-sm text-sky-700 hover:text-sky-900 touch-manipulation"
          >
            <X className="size-4" /> เปลี่ยน
          </button>
        </div>
      ) : (
        <div
          ref={boxRef}
          className="relative"
          onBlur={(e) => {
            if (!boxRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
          }}
        >
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                autoComplete="off"
                placeholder="พิมพ์ชื่อ เบอร์โทร ชื่อ Facebook หรือโซน"
                onFocus={() => setOpen(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (results[0]) pick(results[0].id);
                  } else if (e.key === "Escape") setOpen(false);
                }}
                className={`${inputClass} w-full pl-9 min-h-[44px]`}
              />
            </div>
            {newButton}
          </div>

          {open && needle && (
            <ul className="absolute z-20 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
              {results.slice(0, MAX_RESULTS).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(c.id)}
                    className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-sky-50 active:bg-sky-100 touch-manipulation"
                  >
                    <div className="text-sm font-medium text-slate-900 break-words">{label(c)}</div>
                    <div className="text-xs text-slate-500 break-words">{subline(c)}</div>
                  </button>
                </li>
              ))}
              {results.length > MAX_RESULTS && (
                <li className="px-3 py-2 text-xs text-slate-400">แสดง {MAX_RESULTS} จาก {results.length} ราย พิมพ์เพิ่มเพื่อกรอง</li>
              )}
              {results.length === 0 && (
                <li className="p-3 space-y-2">
                  <div className="text-sm text-slate-500">ไม่พบลูกค้าที่ตรงกับ “{query.trim()}”</div>
                  <div className="flex">{newButton}</div>
                </li>
              )}
            </ul>
          )}

          {quick.length > 0 && !needle && (
            <div className="mt-2 space-y-1.5">
              <div className="text-xs text-slate-400">ลูกค้าที่สั่งบ่อย / ล่าสุด</div>
              <div className="flex flex-wrap gap-2">
                {quick.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pick(c.id)}
                    className={`min-h-[44px] px-3 rounded-full border text-sm touch-manipulation active:scale-95 max-w-full truncate ${
                      c.isBlacklisted
                        ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-sky-50 hover:border-sky-300"
                    }`}
                  >
                    {label(c)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
