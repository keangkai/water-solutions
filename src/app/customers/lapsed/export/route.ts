import { currentRole } from "@/lib/auth";
import { toCsv, type CsvCell } from "@/lib/csv";
import { behaviorInfo } from "@/lib/customer-behavior";
import { filterAndSortLapsed, loadLapsedCustomers, parseLapsedSort, parseLapsedStatus } from "@/lib/lapsed-query";
import { formatDate } from "@/lib/format-date";

// รายชื่อลูกค้าที่หายไปสำหรับทำการตลาด (ส่งข้อความหา/โทร) ไม่รวมบัญชีดำ คนที่ไม่มีเบอร์ยังอยู่ในไฟล์เพื่อติดต่อช่องทางอื่น
export async function GET(request: Request) {
  if ((await currentRole()) !== "admin") return new Response("Forbidden", { status: 403 });

  const params = new URL(request.url).searchParams;
  const status = parseLapsedStatus(params.get("status"));
  const sort = parseLapsedSort(params.get("sort"));
  const customers = filterAndSortLapsed(await loadLapsedCustomers(), status, sort).filter((c) => !c.isBlacklisted);

  const rows: CsvCell[][] = [
    ["ลูกค้า", "เบอร์โทร", "โซน", "กลุ่ม", "ซื้อล่าสุด", "เงียบมา (วัน)", "ปกติสั่งทุก (วัน)", "เลยรอบ (วัน)", "สั่งล่าสุด", "ซื้อมา (ครั้ง)", "ยอดสะสม (บาท)"],
    ...customers.map((c) => [
      c.name,
      c.phone,
      c.zone,
      behaviorInfo[c.status].label,
      formatDate(c.lastDate),
      c.daysSinceLast,
      c.avgGapDays,
      c.daysOverdue,
      c.lastItems,
      c.orders,
      c.total,
    ]),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lapsed-customers.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
