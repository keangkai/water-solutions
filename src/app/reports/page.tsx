export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { BarChart3, TrendingUp, TrendingDown, Wallet, AlertTriangle, Users } from "lucide-react";

export default async function ReportsPage() {
  const [products, movements] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.movement.findMany({ include: { partner: true, lines: { include: { product: true } } } }),
  ]);

  // กระจาย lines ของแต่ละใบให้พกพา type/partner/date ของ movement ติดไปด้วย
  const movementLines = movements.flatMap((m) =>
    m.lines.map((l) => ({ ...l, type: m.type, partnerId: m.partnerId, partnerName: m.partner.name, date: m.date }))
  );

  const stats = products.map((product) => {
    const productLines = movementLines.filter((l) => l.productId === product.id);
    const inLines = productLines.filter((l) => l.type === "IN");
    const outLines = productLines.filter((l) => l.type === "OUT");

    const qtyIn = inLines.reduce((sum, l) => sum + l.quantity, 0);
    const qtyOut = outLines.reduce((sum, l) => sum + l.quantity, 0);
    const costIn = inLines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    const revenue = outLines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

    // ต้นทุนเฉลี่ยต่อหน่วยจากที่รับเข้าจริง ใช้คิดต้นทุนของที่ขายไปแล้วเท่านั้น (COGS)
    // เพื่อไม่เอาต้นทุนของสต็อกที่ยังขายไม่ออกมาหักเป็นกำไรก่อนเวลา
    const avgCost = qtyIn > 0 ? costIn / qtyIn : 0;
    const costOfGoodsSold = avgCost * qtyOut;
    const realProfit = revenue - costOfGoodsSold;

    return {
      product,
      qtyIn,
      qtyOut,
      costIn,
      revenue,
      currentStock: qtyIn - qtyOut,
      realProfit,
      isLow: qtyIn - qtyOut < product.reorderPoint,
    };
  });

  const totalQtyIn = stats.reduce((sum, s) => sum + s.qtyIn, 0);
  const totalQtyOut = stats.reduce((sum, s) => sum + s.qtyOut, 0);
  const totalCostIn = stats.reduce((sum, s) => sum + s.costIn, 0);
  const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0);
  const totalRealProfit = stats.reduce((sum, s) => sum + s.realProfit, 0);
  const lowStock = stats.filter((s) => s.isLow);

  // ขายให้ใคร ราคาเท่าไหร่ จำนวนกี่แพ็ค เป็นเงินเท่าไหร่ แยกตามลูกค้า
  const salesByCustomer = new Map<
    string,
    { partnerName: string; total: number; qty: number; lines: typeof movementLines }
  >();
  for (const l of movementLines) {
    if (l.type !== "OUT") continue;
    const key = l.partnerId;
    if (!salesByCustomer.has(key)) {
      salesByCustomer.set(key, { partnerName: l.partnerName, total: 0, qty: 0, lines: [] });
    }
    const entry = salesByCustomer.get(key)!;
    entry.total += l.quantity * l.unitPrice;
    entry.qty += l.quantity;
    entry.lines.push(l);
  }
  const customerSales = Array.from(salesByCustomer.values())
    .map((c) => ({ ...c, lines: c.lines.sort((a, b) => b.date.getTime() - a.date.getTime()) }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">รายงาน</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <TrendingDown className="size-4" /> รับเข้า (ต้นทุน)
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-600">
            {totalCostIn.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{totalQtyIn.toLocaleString()} แพ็ค</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <TrendingUp className="size-4" /> ขายไป (ยอดขาย)
          </div>
          <div className="mt-2 text-2xl font-semibold text-sky-600">
            {totalRevenue.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{totalQtyOut.toLocaleString()} แพ็ค</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Wallet className="size-4" /> กำไรที่แท้จริง
          </div>
          <div
            className={`mt-2 text-2xl font-semibold ${
              totalRealProfit >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {totalRealProfit.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">หักต้นทุนเฉพาะของที่ขายไปแล้ว</div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <section className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="flex items-center gap-2 font-medium text-red-700">
            <AlertTriangle className="size-4" /> สต็อกต่ำกว่าจุดแจ้งเตือน
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-red-700">
            {lowStock.map((s) => (
              <li key={s.product.id} className="flex justify-between border-b border-red-100 last:border-0 pb-1.5 last:pb-0">
                <span>{s.product.name}</span>
                <span>
                  คงเหลือ <b>{s.currentStock}</b> {s.product.unit} (จุดแจ้งเตือน {s.product.reorderPoint})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {customerSales.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Users className="size-4" /> ยอดขายตามลูกค้า
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customerSales.map((c) => (
              <div key={c.partnerName} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900">{c.partnerName}</div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">ยอดรวม</div>
                    <div className="text-lg font-semibold text-sky-600">{c.total.toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">รวม {c.qty.toLocaleString()} แพ็ค</div>
                <div className="mt-3 space-y-1.5">
                  {c.lines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between text-sm border-t border-slate-100 pt-1.5 first:border-0 first:pt-0">
                      <div className="text-slate-600">
                        {line.date.toLocaleDateString("th-TH")} · {line.product.name}
                      </div>
                      <div className="text-slate-900 whitespace-nowrap">
                        {line.quantity} แพ็ค × {line.unitPrice.toLocaleString()} ={" "}
                        <b>{(line.quantity * line.unitPrice).toLocaleString()}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-500">รายละเอียดตามสินค้า</h2>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 font-medium">สินค้า</th>
                <th className="py-3 px-4 font-medium text-right">รับเข้า (จำนวน)</th>
                <th className="py-3 px-4 font-medium text-right">ต้นทุนรับเข้า</th>
                <th className="py-3 px-4 font-medium text-right">ขายไป (จำนวน)</th>
                <th className="py-3 px-4 font-medium text-right">ยอดขาย</th>
                <th className="py-3 px-4 font-medium text-right">คงเหลือ</th>
                <th className="py-3 px-4 font-medium text-right">กำไรที่แท้จริง</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.product.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">{s.product.name}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{s.qtyIn.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{s.costIn.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{s.qtyOut.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{s.revenue.toLocaleString()}</td>
                  <td className={`py-3 px-4 text-right ${s.isLow ? "text-red-600 font-medium" : "text-slate-600"}`}>
                    {s.currentStock} {s.product.unit}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-medium ${
                      s.realProfit >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {s.realProfit.toLocaleString()}
                  </td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    ยังไม่มีข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
