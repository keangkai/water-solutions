import Link from "next/link";
import { orderStatusInfo, roundLabel, shiftDateKey, todayInBangkok } from "@/lib/delivery";
import type { PeriodReport } from "@/lib/report-period";
import { PeriodSelect } from "./period-select";
import { AlertTriangle } from "lucide-react";

const money = (n: number) => Math.round(n).toLocaleString();
const profitTone = (n: number) => (n >= 0 ? "text-emerald-600" : "text-red-600");

function Card({ label, value, sub, tone = "text-slate-900" }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function Bars({ series }: { series: PeriodReport["series"] }) {
  const max = Math.max(1, ...series.map((s) => s.revenue));
  return (
    <div role="img" aria-label="กราฟยอดขายและกำไรขั้นต้น" className="flex items-end gap-0.5 sm:gap-1 h-40">
      {series.map((s) => (
        <div key={s.label} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full" title={`${s.label}: ขาย ${money(s.revenue)} กำไรขั้นต้น ${money(s.profit)}`}>
          <div className="w-full flex items-end gap-px h-full">
            <div className="flex-1 bg-sky-400 rounded-t" style={{ height: `${(s.revenue / max) * 100}%` }} />
            <div
              className={`flex-1 rounded-t ${s.profit >= 0 ? "bg-emerald-500" : "bg-red-400"}`}
              style={{ height: `${(Math.abs(s.profit) / max) * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate max-w-full">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function PeriodReportView({ report }: { report: PeriodReport }) {
  const { view, key } = report;
  const today = todayInBangkok();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <PeriodSelect view={view} value={key} options={report.options} />
        {view === "day" &&
          [
            ["เมื่อวาน", shiftDateKey(today, -1)],
            ["วันนี้", today],
            ["พรุ่งนี้", shiftDateKey(today, 1)],
          ].map(([label, k]) => (
            <Link
              key={k}
              href={`/reports?view=day&key=${k}`}
              className={`min-h-[44px] px-4 inline-flex items-center rounded-xl text-sm border touch-manipulation ${
                key === k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              {label}
            </Link>
          ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="ยอดขาย" value={money(report.revenue)} sub={`${report.qty.toLocaleString()} แพ็ค`} tone="text-sky-600" />
        <Card label="ต้นทุนสินค้าที่ขาย" value={money(report.cogs)} tone="text-amber-600" />
        <Card label="กำไรขั้นต้น" value={money(report.grossProfit)} sub="ยอดขาย − ต้นทุน" tone={profitTone(report.grossProfit)} />
        <Card
          label="กำไรสุทธิ"
          value={money(report.netProfit)}
          sub={`หักค่าใช้จ่าย ${money(report.expenses)}`}
          tone={profitTone(report.netProfit)}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="ออเดอร์ทั้งหมด" value={String(report.orderCounts.total)} sub={`ส่งแล้ว ${report.orderCounts.delivered}`} />
        <Card
          label="รอส่ง"
          value={String(report.orderCounts.pending)}
          sub={report.pendingValue > 0 ? `${money(report.pendingValue)} บาท (ยังไม่นับเป็นยอดขาย)` : undefined}
          tone={report.orderCounts.pending > 0 ? "text-sky-700" : "text-slate-900"}
        />
        <Card
          label="ส่งไม่ได้"
          value={String(report.orderCounts.failed)}
          tone={report.orderCounts.failed > 0 ? "text-red-600" : "text-slate-900"}
        />
        <Card
          label="ส่งแล้ว รอโอน"
          value={`${money(report.unpaid.amount)}`}
          sub={`${report.unpaid.count} ออเดอร์`}
          tone={report.unpaid.count > 0 ? "text-amber-700" : "text-slate-900"}
        />
      </div>

      {report.series.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-medium text-slate-500">{view === "month" ? "รายวัน" : "รายเดือน"}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-sky-400" /> ยอดขาย</span>
              <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-emerald-500" /> กำไรขั้นต้น</span>
            </div>
          </div>
          <Bars series={report.series} />
        </section>
      )}

      {report.issues.length > 0 && (
        <section className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h2 className="flex items-center gap-2 font-medium text-red-700">
            <AlertTriangle className="size-4" /> ส่งไม่ครบ / ส่งไม่ได้
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-red-800">
            {report.issues.map((o) => (
              <li key={o.id}>
                <b>{o.customer}</b> — {orderStatusInfo[o.status].label}: {o.issueReason ?? "-"}
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === "day" && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">ออเดอร์ที่ส่งวันนี้</h2>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 font-medium">รอบ</th>
                  <th className="py-3 px-4 font-medium">ลูกค้า</th>
                  <th className="py-3 px-4 font-medium">สินค้า</th>
                  <th className="py-3 px-4 font-medium text-right">ยอด</th>
                  <th className="py-3 px-4 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {report.orders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">{roundLabel(o.round)}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{o.customer}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {o.lines.map((l) => (
                        <div key={l.label}>
                          {l.label} × {l.delivered != null && l.delivered < l.quantity ? `${l.delivered}/${l.quantity}` : l.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">{money(o.total)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${orderStatusInfo[o.status].badge}`}>
                        {orderStatusInfo[o.status].label}
                      </span>
                      {o.status === "DELIVERED" && (
                        <span className={`ml-1 text-xs ${o.paid ? "text-emerald-700" : "text-amber-700"}`}>{o.paid ? "โอนแล้ว" : "รอโอน"}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {report.orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      ไม่มีออเดอร์ในวันนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-500">ยอดขายแยกตามสินค้า</h2>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 font-medium">สินค้า</th>
                <th className="py-3 px-4 font-medium text-right">แพ็ค</th>
                <th className="py-3 px-4 font-medium text-right">ยอดขาย</th>
                <th className="py-3 px-4 font-medium text-right">กำไรขั้นต้น</th>
              </tr>
            </thead>
            <tbody>
              {report.sizes.map((s) => (
                <tr key={s.label} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 px-4 font-medium text-slate-900">{s.label}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{s.qty.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{money(s.revenue)}</td>
                  <td className={`py-3 px-4 text-right font-medium ${profitTone(s.revenue - s.cost)}`}>{money(s.revenue - s.cost)}</td>
                </tr>
              ))}
              {report.sizes.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">
                    ยังไม่มียอดขายในช่วงนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report.topCustomers.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500 mb-2">ลูกค้าที่ซื้อมากสุด</h2>
            <ul className="space-y-1.5 text-sm">
              {report.topCustomers.map((c) => (
                <li key={c.name} className="flex justify-between gap-2">
                  <span className="text-slate-700">{c.name}</span>
                  <span className="text-slate-900 whitespace-nowrap">{money(c.revenue)} · {c.qty} แพ็ค</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {report.expenseByCategory.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500 mb-2">ค่าใช้จ่ายในช่วงนี้</h2>
            <ul className="space-y-1.5 text-sm">
              {report.expenseByCategory.map((e) => (
                <li key={e.category} className="flex justify-between gap-2">
                  <span className="text-slate-700">{e.category}</span>
                  <span className="text-slate-900">{money(e.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
