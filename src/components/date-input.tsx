"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";

const isoToDisplay = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
};

const displayToIso = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return "";
  const [, d, m, y] = match;
  const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  const valid = date.getUTCFullYear() === +y && date.getUTCMonth() + 1 === +m && date.getUTCDate() === +d;
  return valid ? `${y}-${m}-${d}` : "";
};

// ช่องกรอกวันที่รูปแบบ dd/mm/yyyy (พิมพ์เองหรือกดไอคอนเลือกจากปฏิทิน) ส่งค่า yyyy-mm-dd ผ่าน hidden input ชื่อเดียวกัน
export function DateInput({
  name,
  defaultValue,
  min,
  className,
}: {
  name: string;
  defaultValue: string;
  min?: string;
  className?: string;
}) {
  const [text, setText] = useState(isoToDisplay(defaultValue));
  const iso = displayToIso(text);
  const tooEarly = !!min && !!iso && iso < min;

  const onChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
    setText(parts.join("/"));
  };

  return (
    <>
      <input type="hidden" name={name} value={iso} />
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          maxLength={10}
          required
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={`${className ?? ""} pr-11`}
          aria-invalid={!iso || tooEarly}
          ref={(el) => {
            el?.setCustomValidity(!iso ? "กรอกวันที่เป็น dd/mm/yyyy" : tooEarly ? "ย้อนหลังไม่ได้" : "");
          }}
        />
        {/* ไอคอนปฏิทิน: ช่อง date จริงโปร่งใสวางทับ กดแล้วเปิดปฏิทินของเบราว์เซอร์ (ใช้ได้ทั้งมือถือและเดสก์ท็อป) */}
        <div className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400">
          <CalendarDays className="size-5" aria-hidden />
          <input
            type="date"
            value={iso}
            min={min}
            aria-label="เลือกวันที่จากปฏิทิน"
            onChange={(e) => e.target.value && setText(isoToDisplay(e.target.value))}
            onClick={(e) => {
              try {
                e.currentTarget.showPicker?.();
              } catch {
                // เบราว์เซอร์ที่ไม่รองรับ จะเปิดจากตัวช่องเองอยู่แล้ว
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          />
        </div>
      </div>
    </>
  );
}
