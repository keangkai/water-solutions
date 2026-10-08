// อ่านรายการสินค้าจากฟอร์มที่ตั้งชื่อช่องเป็น lines.<ลำดับ>.productId / quantity / unitPrice
export function parseLines(formData: FormData) {
  const lineMap = new Map<number, { productId?: string; quantity?: number; unitPrice?: number }>();
  for (const [key, value] of formData.entries()) {
    const match = key.match(/^lines\.(\d+)\.(productId|quantity|unitPrice)$/);
    if (!match) continue;
    const idx = Number(match[1]);
    const current = lineMap.get(idx) ?? {};
    if (match[2] === "productId") current.productId = String(value);
    else if (match[2] === "quantity") current.quantity = Number(value);
    else current.unitPrice = Number(value);
    lineMap.set(idx, current);
  }

  return Array.from(lineMap.values()).filter(
    (l): l is { productId: string; quantity: number; unitPrice: number } =>
      !!l.productId && typeof l.quantity === "number" && l.quantity > 0 && typeof l.unitPrice === "number" && l.unitPrice >= 0
  );
}
