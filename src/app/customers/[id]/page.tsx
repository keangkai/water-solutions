export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format-date";
import { segmentLabel, deliveryLabel } from "@/lib/customer-labels";
import { behaviorInfo, classifyBehavior } from "@/lib/customer-behavior";
import { ArrowLeft, Phone, MapPin, Warehouse as WarehouseIcon } from "lucide-react";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const customer = await prisma.partner.findUnique({
    where: { id },
    include: {
      source: true,
      movements: {
        where: { type: "OUT" },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: { warehouse: true, lines: { include: { product: true } } },
      },
    },
  });
  if (!customer) notFound();

  const orders = customer.movements.map((m) => ({
    ...m,
    total: m.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
  }));
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const behavior = classifyBehavior(orders.map((o) => o.date));
  const info = behaviorInfo[behavior.status];

  // จำนวนที่ซื้อแยกตามสินค้า เพราะหน่วยของแต่ละสินค้าไม่เหมือนกัน
  const byProduct = new Map<string, { name: string; unit: string; qty: number; total: number }>();
  for (const line of orders.flatMap((o) => o.lines)) {
    const entry = byProduct.get(line.productId) ?? { name: line.product.name, unit: line.product.unit, qty: 0, total: 0 };
    entry.qty += line.quantity;
    entry.total += line.quantity * line.unitPrice;
    byProduct.set(line.productId, entry);
  }
  const products = Array.from(byProduct.values()).sort((a, b) => b.total - a.total);

  const tags = [
    customer.segment && segmentLabel[customer.segment],
    customer.zone && `โซน ${customer.zone}`,
    customer.source && `มาจาก${customer.source.name}`,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" /> วิเคราะห์ลูกค้า
      </Link>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">{customer.name}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${info.badge}`}>{info.label}</span>
        </div>
        {tags.length > 0 && <div className="text-xs text-slate-400 mt-1">{tags.join(" · ")}</div>}
        <div className="mt-3 space-y-1 text-sm text-slate-500">
          {customer.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="size-3.5" /> {customer.phone}
            </div>
          )}
          {customer.address && (
            <div className="flex items-start gap-1.5">
              <MapPin className="size-3.5 mt-0.5 shrink-0" />
              <span className="whitespace-pre-line">{customer.address}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-sm text-slate-600">
        {info.hint}
        {behavior.avgGapDays != null && (
          <>
            {" "}· ซื้อเฉลี่ยทุก <b className="text-slate-900">{behavior.avgGapDays.toLocaleString()}</b> วัน
          </>
        )}
        {behavior.nextExpected && (
          <>
            {" "}· คาดว่าจะสั่งรอบหน้า <b className="text-slate-900">{formatDate(behavior.nextExpected)}</b>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-slate-500 text-sm">สั่งซื้อ</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {orders.length.toLocaleString()}
            <span className="text-sm font-normal text-slate-400"> ครั้ง</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-slate-500 text-sm">ยอดซื้อรวม</div>
          <div className="mt-2 text-2xl font-semibold text-sky-600">
            {totalRevenue.toLocaleString()}
            <span className="text-sm font-normal text-slate-400"> บาท</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-slate-500 text-sm">ซื้อล่าสุด</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {orders.length > 0 ? formatDate(orders[0].date) : "-"}
          </div>
        </div>
      </div>

      {products.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">สินค้าที่ซื้อ</h2>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1.5">
            {products.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between text-sm border-t border-slate-100 pt-1.5 first:border-0 first:pt-0"
              >
                <div className="text-slate-600">{p.name}</div>
                <div className="text-slate-900 whitespace-nowrap">
                  {p.qty.toLocaleString()} {p.unit} · <b>{p.total.toLocaleString()}</b> บาท
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-500">ประวัติการซื้อ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {orders.map((o) => (
            <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-900">{formatDate(o.date)}</div>
                <div className="font-semibold text-slate-900">{o.total.toLocaleString()} บาท</div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <WarehouseIcon className="size-3" /> {o.warehouse.name}
                {o.deliveryMethod && <span>· {deliveryLabel[o.deliveryMethod]}</span>}
              </div>
              {o.note && <div className="text-xs text-slate-400 mt-1">{o.note}</div>}
              <div className="mt-3 space-y-1.5">
                {o.lines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between text-sm border-t border-slate-100 pt-1.5 first:border-0 first:pt-0"
                  >
                    <div className="text-slate-600">{line.product.name}</div>
                    <div className="text-slate-900 whitespace-nowrap">
                      {line.quantity} {line.product.unit} × {line.unitPrice.toLocaleString()} ={" "}
                      <b>{(line.quantity * line.unitPrice).toLocaleString()}</b>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="col-span-full text-center text-slate-400 py-10">ยังไม่มีประวัติการซื้อ</div>
          )}
        </div>
      </section>
    </div>
  );
}
