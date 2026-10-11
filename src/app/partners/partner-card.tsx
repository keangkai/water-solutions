"use client";

import { useState } from "react";
import { Pencil, Trash2, Save, X, Phone, MapPin } from "lucide-react";
import { updatePartner, deletePartner } from "./actions";
import { PartnerFields, type PartnerValues, type SourceOption } from "./partner-fields";
import { segmentLabel } from "@/lib/customer-labels";

type Partner = PartnerValues & { id: string; source: { name: string } | null };

const typeLabel = { SUPPLIER: "ซัพพลายเออร์", CUSTOMER: "ลูกค้า" } as const;
const typeBadge = {
  SUPPLIER: "bg-amber-50 text-amber-700 border-amber-200",
  CUSTOMER: "bg-teal-50 text-teal-700 border-teal-200",
} as const;

export function PartnerCard({
  partner,
  sources,
  zones,
}: {
  partner: Partner;
  sources: SourceOption[];
  zones: string[];
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium text-slate-900">{partner.name}</div>
            {partner.companyName && <div className="text-xs text-slate-500">{partner.companyName}</div>}
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${typeBadge[partner.type]}`}>
              {typeLabel[partner.type]}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="text-slate-400 hover:text-sky-600 transition-colors p-1"
            >
              <Pencil className="size-4" />
            </button>
            <form action={deletePartner.bind(null, partner.id)}>
              <button className="text-slate-400 hover:text-red-600 transition-colors p-1">
                <Trash2 className="size-4" />
              </button>
            </form>
          </div>
        </div>
        <div className="mt-3 space-y-1 text-sm text-slate-500">
          {partner.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="size-3.5" /> {partner.phone}
            </div>
          )}
          {partner.address && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" /> <span className="whitespace-pre-line wrap-anywhere min-w-0">{partner.address}</span>
            </div>
          )}
          {partner.mapUrl && (
            <a
              href={partner.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-[44px] text-sky-600 hover:text-sky-700 touch-manipulation"
            >
              <MapPin className="size-3.5" /> เปิดแผนที่{partner.latitude == null && " (ยังไม่มีพิกัด)"}
            </a>
          )}
          {partner.type === "CUSTOMER" && (partner.segment || partner.zone || partner.source) && (
            <div className="text-xs text-slate-400">
              {[
                partner.segment && segmentLabel[partner.segment],
                partner.zone && `โซน ${partner.zone}`,
                partner.source && `มาจาก${partner.source.name}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-sky-50/40 border border-sky-200 rounded-xl p-4 shadow-sm">
      <form
        action={async (formData) => {
          await updatePartner(partner.id, formData);
          setEditing(false);
        }}
        className="space-y-3"
      >
        <div className="flex flex-wrap gap-2">
          <PartnerFields partner={partner} sources={sources} zones={zones} />
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg px-3 py-1.5 transition-colors">
            <Save className="size-3.5" />
            บันทึก
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <X className="size-3.5" />
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  );
}
