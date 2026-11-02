"use server";

import { prisma } from "@/lib/prisma";
import { currentRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DELIVERY_ROUNDS, earliestDeliveryDate, shiftDateKey, todayInBangkok } from "@/lib/delivery";
import { coordsFromMapLink } from "@/lib/maps-link";
import { recentIncidentCounts } from "@/lib/incidents";
import { digitsOnly, parseLineOrder, resolveDate, roundFromTime, splitOrders } from "@/lib/parse-line-order";

// ถ้ามีสินค้าหลายยี่ห้อในขนาดเดียวกัน เลือกยี่ห้อนี้ก่อน (ยังเปลี่ยนในฟอร์มได้)
const PREFERRED_PRODUCT_HINT = "ocean";

export type PastedCustomerRef = { id: string; name: string; phone: string | null; address: string | null; mapUrl: string | null };

export type PastedOrder = {
  key: number;
  name: string | null;
  phone: string | null;
  address: string | null;
  mapUrl: string | null;
  // ลูกค้าที่ตรงแน่ (เบอร์โทร หรือชื่อตรง) / ที่ชื่อใกล้เคียงให้ admin เลือกเอง
  customer: PastedCustomerRef | null;
  matchedBy: "phone" | "name" | null;
  candidates: PastedCustomerRef[];
  deliveryDate: string | null;
  deliveryRound: string | null;
  lines: { productId: string; productName: string; quantity: number; unitPrice: number; choices: number }[];
  missingProducts: string[]; // ขนาดที่หาสินค้าไม่เจอ
  deliveryAddress: string | null; // ที่อยู่ในข้อความต่างจากที่บันทึกไว้ ใช้เฉพาะออเดอร์นี้
  canFillAddress: boolean; // ลูกค้าเดิมยังไม่มีที่อยู่/หมุด เติมจากข้อความได้
  unparsed: string[];
  warnings: string[];
};

const normName = (s: string) => s.replace(/^คุณ/, "").replace(/\s+/g, "").toLowerCase();
const sameAddress = (a: string, b: string) => {
  const x = a.replace(/\s+/g, ""), y = b.replace(/\s+/g, "");
  return x === y || x.includes(y) || y.includes(x);
};

function sizeKeyOf(size: string | null) {
  if (!size) return null;
  const m = size.toLowerCase().replace(/\s+/g, "").match(/^(\d+(?:\.\d+)?)(ml|มล\.?|l|ลิตร|cc)$/);
  if (!m) return null;
  const n = Number(m[1]);
  return `${Math.round(m[2] === "l" || m[2] === "ลิตร" ? n * 1000 : n)}ml`;
}

export async function parsePastedOrders(text: string): Promise<{ orders: PastedOrder[] } | { error: string }> {
  if ((await currentRole()) !== "admin") return { error: "กรุณาเข้าสู่ระบบใหม่" };
  const chunks = splitOrders(text.slice(0, 20000));
  if (chunks.length === 0) return { error: "ยังไม่ได้วางข้อความ" };
  if (chunks.length > 20) return { error: "วางได้ครั้งละไม่เกิน 20 ออเดอร์" };

  const [customers, products] = await Promise.all([
    prisma.partner.findMany({ where: { type: "CUSTOMER" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
  ]);
  const today = todayInBangkok();
  const earliest = earliestDeliveryDate(today);
  const roundKeys = DELIVERY_ROUNDS.map((r) => r.key);

  const orders = chunks.map((chunk, key): PastedOrder => {
    const p = parseLineOrder(chunk);
    const warnings: string[] = [];
    const ref = (c: (typeof customers)[number]): PastedCustomerRef => ({ id: c.id, name: c.name, phone: c.phone, address: c.address, mapUrl: c.mapUrl });

    // หาลูกค้า: เบอร์โทรตรง > ชื่อตรง (ตัด "คุณ") > ชื่อใกล้เคียงให้เลือกเอง
    let customer: PastedCustomerRef | null = null;
    let matchedBy: PastedOrder["matchedBy"] = null;
    let candidates: PastedCustomerRef[] = [];
    const phoneDigits = p.phone ? digitsOnly(p.phone) : "";
    const byPhone = phoneDigits.length >= 9 ? customers.filter((c) => c.phone && digitsOnly(c.phone).endsWith(phoneDigits.slice(-9))) : [];
    if (byPhone.length === 1) {
      customer = ref(byPhone[0]);
      matchedBy = "phone";
    } else if (p.name) {
      const needle = normName(p.name);
      const names = (c: (typeof customers)[number]) => [c.name, c.companyName, c.facebookName].filter((v): v is string => !!v).map(normName);
      const exact = customers.filter((c) => names(c).includes(needle));
      if (exact.length === 1) {
        customer = ref(exact[0]);
        matchedBy = "name";
      } else {
        candidates = (exact.length > 1 ? exact : customers.filter((c) => needle.length >= 2 && names(c).some((n) => n.includes(needle) || needle.includes(n)))).slice(0, 6).map(ref);
      }
    }
    if (byPhone.length > 1) {
      candidates = byPhone.slice(0, 6).map(ref);
      warnings.push("มีลูกค้าหลายรายใช้เบอร์นี้ เลือกให้ตรงกับคนที่สั่ง");
    }
    const chosen = customer ? customers.find((c) => c.id === customer!.id) : null;
    if (chosen?.isBlacklisted) warnings.push(`ลูกค้ารายนี้อยู่ในบัญชีดำ${chosen.blacklistReason ? `: ${chosen.blacklistReason}` : ""}`);

    // สินค้า: เทียบตามขนาด ยี่ห้อที่ชอบมาก่อน
    const lines: PastedOrder["lines"] = [];
    const missingProducts: string[] = [];
    for (const l of p.lines) {
      const options = products.filter((pr) => sizeKeyOf(pr.size) === l.sizeKey);
      const pick = options.find((o) => o.name.toLowerCase().includes(PREFERRED_PRODUCT_HINT)) ?? options[0];
      if (!pick) {
        missingProducts.push(l.sizeText);
        continue;
      }
      lines.push({ productId: pick.id, productName: pick.name, quantity: l.quantity, unitPrice: pick.defaultSellPrice ?? 0, choices: options.length });
    }
    if (p.lines.length === 0) warnings.push("ไม่พบรายการสินค้าในข้อความ");
    if (missingProducts.length > 0) warnings.push(`ไม่พบสินค้าขนาด ${missingProducts.join(", ")} ในระบบ (เพิ่มรายการเองในฟอร์มได้)`);
    if (lines.some((l) => l.unitPrice === 0)) warnings.push("สินค้าบางรายการยังไม่มีราคาขายตั้งต้น ตรวจราคาในฟอร์ม");

    const deliveryDate = resolveDate(p.date, today, earliest, shiftDateKey);
    if (!deliveryDate) warnings.push(p.date ? "อ่านวันส่งไม่ได้หรือเป็นวันที่ผ่านมานานเกินไป เลือกวันส่งเอง" : "ไม่พบวันส่งในข้อความ เลือกวันส่งเอง");
    const deliveryRound = roundFromTime(p.time, roundKeys);
    if (!deliveryRound) warnings.push("ไม่พบรอบส่งในข้อความ เลือกรอบเอง");

    // ที่อยู่: ลูกค้าเดิมที่ยังไม่มีที่อยู่/หมุดเติมให้ได้ ถ้ามีแล้วแต่ต่างจากข้อความ ใช้เฉพาะออเดอร์นี้
    const hasAddr = chosen ? !!(chosen.address || chosen.mapUrl) : false;
    const canFillAddress = !!chosen && !hasAddr && !!(p.address || p.mapUrl);
    const deliveryAddress = chosen && chosen.address && p.address && !sameAddress(chosen.address, p.address) ? p.address : null;

    return {
      key,
      name: p.name,
      phone: p.phone,
      address: p.address,
      mapUrl: p.mapUrl,
      customer,
      matchedBy,
      candidates,
      deliveryDate,
      deliveryRound,
      lines,
      missingProducts,
      deliveryAddress,
      canFillAddress,
      unparsed: p.unparsed,
      warnings,
    };
  });

  return { orders };
}

// ลูกค้าใหม่จากข้อความ: ใช้ชื่อ เบอร์ ที่อยู่ และหมุดตามที่ admin ตรวจแก้ในฟอร์ม
export async function createCustomerFromPaste(formData: FormData) {
  if ((await currentRole()) !== "admin") return { error: "กรุณาเข้าสู่ระบบใหม่" } as const;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "กรอกชื่อลูกค้า" } as const;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const mapUrl = String(formData.get("mapUrl") ?? "").trim() || null;
  const coords = mapUrl ? await coordsFromMapLink(mapUrl) : null;

  const created = await prisma.partner.create({
    data: { name, type: "CUSTOMER", phone, address, mapUrl, latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null },
  });
  revalidatePath("/customers/list");
  revalidatePath("/orders");
  return { customer: { ...created, recentIncidents: 0 } } as const;
}

// เติมที่อยู่/หมุดให้ลูกค้าเดิมที่ยังไม่มี (ไม่ทับของที่มีอยู่)
export async function fillCustomerAddress(id: string, address: string | null, mapUrl: string | null) {
  if ((await currentRole()) !== "admin") return { error: "กรุณาเข้าสู่ระบบใหม่" } as const;
  const current = await prisma.partner.findUnique({ where: { id } });
  if (!current) return { error: "ไม่พบลูกค้า" } as const;
  if (current.address || current.mapUrl) return { error: "ลูกค้ามีที่อยู่แล้ว" } as const;
  const coords = mapUrl ? await coordsFromMapLink(mapUrl) : null;
  const updated = await prisma.partner.update({
    where: { id },
    data: { address, mapUrl, latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null },
  });
  revalidatePath("/customers/list");
  revalidatePath(`/customers/${id}`);
  revalidatePath("/orders");
  const counts = await recentIncidentCounts([id]);
  return { customer: { ...updated, recentIncidents: counts.get(id) ?? 0 } } as const;
}
