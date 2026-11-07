"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy } from "lucide-react";

const STORAGE_KEY = "lapsed-message-template";
const EVENT = "lapsed-template-change";
export const DEFAULT_TEMPLATE =
  "สวัสดีครับ {ชื่อ} ไม่ได้คุยกันนานเลยครับ ครั้งก่อนสั่ง {สินค้า} ตอนนี้ต้องการสั่งเพิ่มไหมครับ ส่งให้ได้เลยครับ";

function readTemplate() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

function useTemplate() {
  return useSyncExternalStore(subscribe, readTemplate, () => DEFAULT_TEMPLATE);
}

// สำรองสำหรับเบราว์เซอร์ที่ไม่ให้ใช้ clipboard API
function copyWithSelection(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

export function fillTemplate(template: string, name: string, items: string) {
  return template.replaceAll("{ชื่อ}", name).replaceAll("{สินค้า}", items || "น้ำ");
}

// ข้อความทักที่ทุกการ์ดใช้ร่วมกัน แก้ได้และจำไว้ในเครื่องนี้
export function TemplateEditor() {
  const template = useTemplate();
  const save = (value: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor="lapsed-template">
        ข้อความทักลูกค้า
      </label>
      <textarea
        id="lapsed-template"
        value={template}
        onChange={(e) => save(e.target.value)}
        rows={3}
        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-base text-black bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>ใช้ {"{ชื่อ}"} และ {"{สินค้า}"} (สินค้าที่สั่งครั้งล่าสุด) ระบบเติมให้แต่ละราย แล้วกดปุ่มคัดลอกข้อความที่การ์ดเพื่อไปวางในไลน์</span>
        <button type="button" onClick={() => save(DEFAULT_TEMPLATE)} className="text-sky-600 hover:text-sky-700 min-h-[44px] px-2">
          คืนค่าเริ่มต้น
        </button>
      </div>
    </div>
  );
}

export function CopyMessageButton({ name, items }: { name: string; items: string }) {
  const template = useTemplate();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    const text = fillTemplate(template, name, items);
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState(copyWithSelection(text) ? "copied" : "failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 touch-manipulation active:scale-95"
    >
      {state === "copied" ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
      {state === "copied" ? "คัดลอกแล้ว" : state === "failed" ? "คัดลอกไม่ได้" : "คัดลอกข้อความ"}
    </button>
  );
}
