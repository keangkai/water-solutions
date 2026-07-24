export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { createExpense, deleteExpense } from "./actions";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Sparkles,
  Plus,
  Trash2,
} from "lucide-react";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

const EXPENSE_CATEGORIES = ["ค่าเช่า", "ค่าน้ำมัน/ขนส่ง", "ค่าแรง/ค่าจ้าง", "ค่าไฟ", "ค่าน้ำ", "ค่าบรรจุภัณฑ์", "ค่าซ่อมบำรุง", "อื่นๆ"];

export default async function FinancePage() {
  const [movements, expenses] = await Promise.all([
    prisma.movement.findMany({ include: { lines: true } }),
    prisma.expense.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
  ]);

  // ต้นทุนเฉลี่ยต่อหน่วยต่อสินค้า (ตลอดทุกช่วงเวลา) ใช้คิด COGS ของยอดขายแต่ละเดือน
  const inboundByProduct = new Map<string, { qtyIn: number; costIn: number }>();
  for (const m of movements) {
    if (m.type !== "IN") continue;
    for (const l of m.lines) {
      const cur = inboundByProduct.get(l.productId) ?? { qtyIn: 0, costIn: 0 };
      cur.qtyIn += l.quantity;
      cur.costIn += l.quantity * l.unitPrice;
      inboundByProduct.set(l.productId, cur);
    }
  }
  const avgCost = (productId: string) => {
    const e = inboundByProduct.get(productId);
    return e && e.qtyIn > 0 ? e.costIn / e.qtyIn : 0;
  };

  type MonthStat = { key: string; revenue: number; cogs: number; expenses: number };
  const monthMap = new Map<string, MonthStat>();
  const getMonth = (key: string) => {
    if (!monthMap.has(key)) monthMap.set(key, { key, revenue: 0, cogs: 0, expenses: 0 });
    return monthMap.get(key)!;
  };

  for (const m of movements) {
    if (m.type !== "OUT") continue;
    const stat = getMonth(monthKey(m.date));
    for (const l of m.lines) {
      stat.revenue += l.quantity * l.unitPrice;
      stat.cogs += l.quantity * avgCost(l.productId);
    }
  }
  for (const e of expenses) {
    getMonth(monthKey(e.date)).expenses += e.amount;
  }

  const months = Array.from(monthMap.values())
    .map((s) => ({
      ...s,
      grossProfit: s.revenue - s.cogs,
      netProfit: s.revenue - s.cogs - s.expenses,
    }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));

  const currentKey = monthKey(new Date());
  const current = months.find((m) => m.key === currentKey) ?? {
    key: currentKey,
    revenue: 0,
    cogs: 0,
    expenses: 0,
    grossProfit: 0,
    netProfit: 0,
  };

  const recentMonths = months.slice(0, 3);
  const forecastKey = months[0] ? addMonths(months[0].key, 1) : addMonths(currentKey, 1);
  const forecast = {
    key: forecastKey,
    revenue: average(recentMonths.map((m) => m.revenue)),
    grossProfit: average(recentMonths.map((m) => m.grossProfit)),
    netProfit: average(recentMonths.map((m) => m.netProfit)),
    basedOn: recentMonths.length,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Wallet className="size-5 text-sky-500" />
        <h1 className="text-xl font-semibold text-slate-900">การเงิน</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-500">สรุปเดือนนี้ ({monthLabel(currentKey)})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <TrendingUp className="size-4" /> ยอดขาย
            </div>
            <div className="mt-1 text-xl font-semibold text-sky-600">{current.revenue.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <TrendingDown className="size-4" /> ต้นทุนขาย
            </div>
            <div className="mt-1 text-xl font-semibold text-amber-600">{current.cogs.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Wallet className="size-4" /> กำไรขั้นต้น
            </div>
            <div className={`mt-1 text-xl font-semibold ${current.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {current.grossProfit.toLocaleString()}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Receipt className="size-4" /> ค่าใช้จ่าย
            </div>
            <div className="mt-1 text-xl font-semibold text-red-500">{current.expenses.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Wallet className="size-4" /> กำไรสุทธิ
            </div>
            <div className={`mt-1 text-xl font-semibold ${current.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {current.netProfit.toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-violet-50 border border-violet-200 rounded-xl p-5">
        <h2 className="flex items-center gap-2 font-medium text-violet-700">
          <Sparkles className="size-4" /> พยากรณ์เดือนหน้า ({monthLabel(forecast.key)})
        </h2>
        {forecast.basedOn > 0 ? (
          <>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-violet-500">ยอดขายคาดการณ์</div>
                <div className="text-lg font-semibold text-violet-700">{Math.round(forecast.revenue).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-violet-500">กำไรขั้นต้นคาดการณ์</div>
                <div className="text-lg font-semibold text-violet-700">{Math.round(forecast.grossProfit).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-violet-500">กำไรสุทธิคาดการณ์</div>
                <div className="text-lg font-semibold text-violet-700">{Math.round(forecast.netProfit).toLocaleString()}</div>
              </div>
            </div>
            <div className="text-xs text-violet-500 mt-3">
              คำนวณจากค่าเฉลี่ย {forecast.basedOn} เดือนล่าสุดที่มีข้อมูล
            </div>
          </>
        ) : (
          <div className="text-sm text-violet-600 mt-2">ยังไม่มีข้อมูลพอที่จะพยากรณ์</div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-500">บันทึกค่าใช้จ่าย</h2>
        <form
          action={createExpense}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-wrap gap-3 items-end"
        >
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-slate-500">หมวด</label>
            <input
              name="category"
              required
              list="expense-categories"
              placeholder="เช่น ค่าเช่า"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 w-full sm:w-40"
            />
            <datalist id="expense-categories">
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-slate-500">จำนวนเงิน</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 w-full sm:w-32"
            />
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-slate-500">วันที่</label>
            <input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 w-full sm:w-auto"
            />
          </div>
          <div className="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-40">
            <label className="text-xs font-medium text-slate-500">โน้ต</label>
            <input
              name="note"
              placeholder="รายละเอียดเพิ่มเติม"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 w-full"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors w-full sm:w-auto justify-center">
            <Plus className="size-4" />
            เพิ่มค่าใช้จ่าย
          </button>
        </form>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 font-medium">วันที่</th>
                <th className="py-3 px-4 font-medium">หมวด</th>
                <th className="py-3 px-4 font-medium">โน้ต</th>
                <th className="py-3 px-4 font-medium text-right">จำนวนเงิน</th>
                <th className="py-3 px-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{e.date.toLocaleDateString("th-TH")}</td>
                  <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">{e.category}</td>
                  <td className="py-3 px-4 text-slate-500">{e.note ?? "-"}</td>
                  <td className="py-3 px-4 text-right text-red-600 font-medium whitespace-nowrap">{e.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">
                    <form action={deleteExpense.bind(null, e.id)}>
                      <button className="text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    ยังไม่มีรายการค่าใช้จ่าย
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-500">สรุปกำไร-ขาดทุนรายเดือน</h2>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 font-medium">เดือน</th>
                <th className="py-3 px-4 font-medium text-right">ยอดขาย</th>
                <th className="py-3 px-4 font-medium text-right">ต้นทุนขาย</th>
                <th className="py-3 px-4 font-medium text-right">กำไรขั้นต้น</th>
                <th className="py-3 px-4 font-medium text-right">ค่าใช้จ่าย</th>
                <th className="py-3 px-4 font-medium text-right">กำไรสุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {months.slice(0, 12).map((m) => (
                <tr key={m.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">{monthLabel(m.key)}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{m.revenue.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{m.cogs.toLocaleString()}</td>
                  <td className={`py-3 px-4 text-right ${m.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {m.grossProfit.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-red-500">{m.expenses.toLocaleString()}</td>
                  <td className={`py-3 px-4 text-right font-medium ${m.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {m.netProfit.toLocaleString()}
                  </td>
                </tr>
              ))}
              {months.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
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
