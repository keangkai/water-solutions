import { Ban, ShieldCheck, PhoneOff, XCircle, Trash2, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/format-date";
import { blacklistPresets, incidentLabel, INCIDENT_SUGGEST_COUNT, INCIDENT_WINDOW_DAYS } from "@/lib/blacklist";
import type { IncidentKind } from "@/generated/prisma/client";
import { clearBlacklist, deleteIncident, logIncident, setBlacklist } from "./blacklist-actions";

type Incident = { id: string; kind: IncidentKind; note: string | null; createdAt: Date };

const field =
  "w-full border border-slate-300 rounded-xl px-3 min-h-[44px] text-base text-black bg-white focus:outline-none focus:ring-2 focus:ring-sky-200";

// ส่วนบัญชีดำของหน้าลูกค้า: สถานะ ขึ้น/ถอดบัญชีดำ และประวัติเหตุการณ์ (ยกเลิก/ติดต่อไม่ได้)
export function BlacklistSection({
  partnerId,
  isBlacklisted,
  reason,
  blacklistedAt,
  incidents,
  recentCount,
}: {
  partnerId: string;
  isBlacklisted: boolean;
  reason: string | null;
  blacklistedAt: Date | null;
  incidents: Incident[];
  recentCount: number;
}) {
  const suggest = !isBlacklisted && recentCount >= INCIDENT_SUGGEST_COUNT;

  return (
    <section className={`rounded-xl border p-5 shadow-sm space-y-4 ${isBlacklisted ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
      <div className="flex items-center gap-2">
        {isBlacklisted ? <Ban className="size-5 text-red-600" /> : <ShieldCheck className="size-5 text-slate-400" />}
        <h2 className="font-medium text-slate-900">บัญชีดำ และประวัติปัญหา</h2>
      </div>

      {isBlacklisted ? (
        <div className="space-y-3">
          <div className="text-sm text-red-800">
            <b>อยู่ในบัญชีดำ</b>
            {blacklistedAt && <> ตั้งแต่ {formatDate(blacklistedAt)}</>}
            {reason && <> · เหตุผล: {reason}</>}
            <div className="text-xs text-red-700 mt-1">การสร้างออเดอร์ใหม่ให้ลูกค้ารายนี้ต้องติ๊กยืนยันทุกครั้ง และคนขับจะเห็นป้ายเตือน</div>
          </div>
          <form action={clearBlacklist.bind(null, partnerId)}>
            <button className="min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white text-sm text-slate-700 touch-manipulation active:scale-95">
              ถอดออกจากบัญชีดำ
            </button>
          </form>
        </div>
      ) : (
        <>
          {suggest && (
            <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>
                ใน {INCIDENT_WINDOW_DAYS} วันที่ผ่านมามีปัญหา {recentCount} ครั้ง ควรพิจารณาขึ้นบัญชีดำ (ระบบไม่ขึ้นให้เอง ต้องกดยืนยันเอง)
              </span>
            </div>
          )}
          <details className="group">
            <summary className="min-h-[44px] inline-flex items-center gap-2 px-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium cursor-pointer touch-manipulation list-none">
              <Ban className="size-4" /> ขึ้นบัญชีดำ
            </summary>
            <form action={setBlacklist.bind(null, partnerId)} className="mt-3 space-y-3 max-w-md">
              <label className="flex flex-col gap-1.5 text-sm text-slate-700">
                เหตุผล
                <select name="preset" defaultValue={blacklistPresets[0]} className={field}>
                  {blacklistPresets.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-slate-700">
                หมายเหตุเพิ่มเติม (ถ้ามี)
                <input name="note" autoComplete="off" className={field} />
              </label>
              <button className="min-h-[44px] px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium touch-manipulation active:scale-95">
                ยืนยันขึ้นบัญชีดำ
              </button>
            </form>
          </details>
        </>
      )}

      <div className="space-y-2">
        <div className="text-sm font-medium text-slate-700">
          ประวัติ ({INCIDENT_WINDOW_DAYS} วันล่าสุด {recentCount} ครั้ง)
        </div>
        {incidents.length === 0 ? (
          <div className="text-sm text-slate-400">ยังไม่มีประวัติยกเลิกหรือติดต่อไม่ได้</div>
        ) : (
          <ul className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200">
            {incidents.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-slate-800">{incidentLabel[i.kind]}</span>
                  <span className="text-slate-400"> · {formatDate(i.createdAt)}</span>
                  {i.note && i.note !== incidentLabel[i.kind] && <div className="text-xs text-slate-500 break-words">{i.note}</div>}
                </div>
                <form action={deleteIncident.bind(null, partnerId, i.id)}>
                  <button className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-slate-300 hover:text-red-600 touch-manipulation" aria-label="ลบรายการนี้">
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <details>
          <summary className="min-h-[44px] inline-flex items-center text-sm text-sky-600 cursor-pointer touch-manipulation list-none">
            + บันทึกเหตุการณ์เอง
          </summary>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            {(["NO_ANSWER", "CANCELLED"] as const).map((kind) => (
              <form key={kind} action={logIncident.bind(null, partnerId, kind)} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  {kind === "NO_ANSWER" ? <PhoneOff className="size-4" /> : <XCircle className="size-4" />} {incidentLabel[kind]}
                </div>
                <input name="note" placeholder="หมายเหตุ (ถ้ามี)" autoComplete="off" className={field} />
                <button className="w-full min-h-[44px] rounded-xl border border-slate-300 text-sm text-slate-700 touch-manipulation active:scale-95">บันทึก</button>
              </form>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
