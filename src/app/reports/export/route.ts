import { currentRole } from "@/lib/auth";
import { toCsv, type CsvCell } from "@/lib/csv";
import { buildPeriodReport, keyLabel, parseKey, parseView } from "@/lib/report-period";
import { orderStatusInfo, roundLabel } from "@/lib/delivery";

export async function GET(request: Request) {
  if ((await currentRole()) !== "admin") return new Response("Forbidden", { status: 403 });

  const params = new URL(request.url).searchParams;
  const view = parseView(params.get("view") ?? undefined);
  if (!view) return new Response("Bad request", { status: 400 });
  const key = parseKey(view, params.get("key") ?? undefined);
  const report = await buildPeriodReport(view, key);

  const rows: CsvCell[][] = [
    ["รายงาน", { day: "รายวัน", month: "รายเดือน", year: "รายปี" }[view], keyLabel(view, key)],
    [],
    ["สรุป"],
    ["ยอดขาย", report.revenue],
    ["ต้นทุนสินค้าที่ขาย", Math.round(report.cogs * 100) / 100],
    ["กำไรขั้นต้น", Math.round(report.grossProfit * 100) / 100],
    ["ค่าใช้จ่าย", report.expenses],
    ["กำไรสุทธิ", Math.round(report.netProfit * 100) / 100],
    ["จำนวนแพ็คที่ขาย", report.qty],
    ["ออเดอร์ทั้งหมด", report.orderCounts.total],
    ["ส่งแล้ว", report.orderCounts.delivered],
    ["รอส่ง", report.orderCounts.pending],
    ["ส่งไม่ได้", report.orderCounts.failed],
    ["ส่งแล้ว รอโอน (ออเดอร์)", report.unpaid.count],
    ["ส่งแล้ว รอโอน (บาท)", report.unpaid.amount],
    [],
    ["รายการขาย"],
    ["วันที่", "ลูกค้า", "สินค้า", "จำนวน (แพ็ค)", "ราคา/แพ็ค", "รวม", "มาจากออเดอร์"],
    ...report.saleLines.map((l) => [l.date, l.customer, l.product, l.quantity, l.unitPrice, l.total, l.fromOrder ? "ใช่" : "ไม่"]),
    [],
    ["ยอดขายแยกตามสินค้า"],
    ["สินค้า", "จำนวน (แพ็ค)", "ยอดขาย", "กำไรขั้นต้น"],
    ...report.sizes.map((s) => [s.label, s.qty, s.revenue, Math.round((s.revenue - s.cost) * 100) / 100]),
    [],
    ["ยอดขายแยกตามลูกค้า"],
    ["ลูกค้า", "จำนวน (แพ็ค)", "ยอดขาย"],
    ...report.customers.map((c) => [c.name, c.qty, c.revenue]),
    [],
    ["ค่าใช้จ่าย"],
    ["หมวด", "จำนวนเงิน"],
    ...report.expenseByCategory.map((e) => [e.category, e.amount]),
  ];

  if (report.series.length > 0) {
    rows.push([], [view === "month" ? "รายวัน" : "รายเดือน"], ["ช่วง", "ยอดขาย", "กำไรขั้นต้น"]);
    for (const s of report.series) rows.push([s.label, s.revenue, Math.round(s.profit * 100) / 100]);
  }

  if (view === "day") {
    rows.push([], ["ออเดอร์ที่ส่งวันนี้"], ["รอบ", "ลูกค้า", "สินค้า", "สถานะ", "ยอด", "โอนแล้ว", "เหตุผล"]);
    for (const o of report.orders) {
      rows.push([
        roundLabel(o.round),
        o.customer,
        o.lines.map((l) => `${l.label} x${l.delivered != null && l.delivered < l.quantity ? `${l.delivered}/${l.quantity}` : l.quantity}`).join("; "),
        orderStatusInfo[o.status].label,
        o.total,
        o.status === "DELIVERED" ? (o.paid ? "ใช่" : "ไม่") : "",
        o.issueReason ?? "",
      ]);
    }
  }

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-${view}-${key}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
