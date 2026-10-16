"use client";

import { useState } from "react";
import { segmentLabel, type CustomerSegment } from "@/lib/customer-labels";

export type PartnerValues = {
  name: string;
  type: "SUPPLIER" | "CUSTOMER";
  companyName: string | null;
  facebookName: string | null;
  phone: string | null;
  address: string | null;
  segment: CustomerSegment | null;
  zone: string | null;
  sourceId: string | null;
  mapUrl: string | null;
  latitude: number | null;
  longitude: number | null;
};
export type SourceOption = { id: string; name: string; isActive: boolean };

const inputClass =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-white";

export function PartnerFields({
  partner,
  sources,
  zones,
}: {
  partner?: PartnerValues;
  sources: SourceOption[];
  zones: string[];
}) {
  const [type, setType] = useState<"SUPPLIER" | "CUSTOMER">(partner?.type ?? "SUPPLIER");
  // ช่องทางที่ปิดใช้งานแล้วยังต้องแสดง ถ้าลูกค้ารายนี้ใช้อยู่
  const visibleSources = sources.filter((s) => s.isActive || s.id === partner?.sourceId);

  return (
    <>
      <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
        <label className="text-xs font-medium text-slate-500">ชื่อ</label>
        <input name="name" required defaultValue={partner?.name} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <label className="text-xs font-medium text-slate-500">ประเภท</label>
        <select
          name="type"
          required
          value={type}
          onChange={(e) => setType(e.target.value as "SUPPLIER" | "CUSTOMER")}
          className={inputClass}
        >
          <option value="SUPPLIER">ซัพพลายเออร์</option>
          <option value="CUSTOMER">ลูกค้า</option>
        </select>
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
        <label className="text-xs font-medium text-slate-500">ชื่อบริษัท (ถ้ามี)</label>
        <input name="companyName" defaultValue={partner?.companyName ?? ""} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
        <label className="text-xs font-medium text-slate-500">เบอร์โทร</label>
        <input name="phone" type="tel" defaultValue={partner?.phone ?? ""} className={inputClass} />
      </div>
      {type === "CUSTOMER" && (
        <>
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-slate-500">ชื่อ Facebook (ถ้ามี)</label>
            <input name="facebookName" defaultValue={partner?.facebookName ?? ""} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-slate-500">ประเภทลูกค้า</label>
            <select name="segment" defaultValue={partner?.segment ?? ""} className={inputClass}>
              <option value="">ไม่ระบุ</option>
              {Object.entries(segmentLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-slate-500">โซน</label>
            <input
              name="zone"
              list="partner-zones"
              defaultValue={partner?.zone ?? ""}
              placeholder="เช่น ตำบล หรือหมู่บ้าน"
              className={inputClass}
            />
            <datalist id="partner-zones">
              {zones.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-slate-500">รู้จักร้านจาก</label>
            <select name="sourceId" defaultValue={partner?.sourceId ?? ""} className={inputClass}>
              <option value="">ไม่ทราบ</option>
              {visibleSources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      <div className="flex flex-col gap-1 w-full">
        <label className="text-xs font-medium text-slate-500">ที่อยู่</label>
        <textarea name="address" rows={2} defaultValue={partner?.address ?? ""} className={inputClass} />
      </div>
      {type === "CUSTOMER" && (
        <div className="flex flex-col gap-1 w-full">
          <label className="text-xs font-medium text-slate-500">หมุดแผนที่ (วางลิงก์ Google Maps)</label>
          <input
            name="mapUrl"
            type="url"
            inputMode="url"
            defaultValue={partner?.mapUrl ?? ""}
            placeholder="https://maps.app.goo.gl/..."
            className={inputClass}
          />
          {partner?.mapUrl && (
            <span className={`text-xs ${partner.latitude != null ? "text-emerald-600" : "text-amber-600"}`}>
              {partner.latitude != null
                ? `บันทึกพิกัดแล้ว ${partner.latitude.toFixed(5)}, ${partner.longitude?.toFixed(5)}`
                : "อ่านพิกัดจากลิงก์นี้ไม่ได้ ลองใช้ลิงก์จากปุ่มแชร์ใน Google Maps"}
            </span>
          )}
        </div>
      )}
    </>
  );
}
