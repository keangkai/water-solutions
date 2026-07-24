"use client";

import { useState } from "react";
import { Pencil, Trash2, Save, X } from "lucide-react";
import { updateProduct, deleteProduct } from "./actions";

const sizePresets = ["1.5L", "600ml", "350ml"];

type Brand = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  unit: string;
  size: string | null;
  brandId: string | null;
  brand: Brand | null;
  defaultCostPrice: number | null;
  defaultSellPrice: number | null;
  reorderPoint: number;
};

export function ProductRow({ product, brands }: { product: Product; brands: Brand[] }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
        <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">{product.name}</td>
        <td className="py-3 px-4 text-slate-600">
          {product.brand ? (
            <span className="inline-block text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5">
              {product.brand.name}
            </span>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </td>
        <td className="py-3 px-4 text-slate-600">{product.size ?? "-"}</td>
        <td className="py-3 px-4 text-slate-600">{product.unit}</td>
        <td className="py-3 px-4 text-slate-600">
          {product.defaultCostPrice ?? "-"} / {product.defaultSellPrice ?? "-"}
        </td>
        <td className="py-3 px-4 text-slate-600">{product.reorderPoint}</td>
        <td className="py-3 px-4 text-right whitespace-nowrap">
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-slate-400 hover:text-sky-600 transition-colors mr-2"
          >
            <Pencil className="size-4" />
          </button>
          <form action={deleteProduct.bind(null, product.id)} className="inline">
            <button className="inline-flex items-center gap-1 text-slate-400 hover:text-red-600 transition-colors">
              <Trash2 className="size-4" />
            </button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-100 last:border-0 bg-sky-50/40">
      <td colSpan={7} className="py-3 px-4">
        <form
          action={async (formData) => {
            await updateProduct(product.id, formData);
            setEditing(false);
          }}
          className="flex flex-wrap gap-2 items-end"
        >
          <input
            name="name"
            defaultValue={product.name}
            required
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
          <select
            name="brandId"
            defaultValue={product.brandId ?? ""}
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          >
            <option value="">ไม่ระบุยี่ห้อ</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input
            name="size"
            defaultValue={product.size ?? ""}
            list="product-size-presets-edit"
            placeholder="ขนาด"
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-black w-24 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
          <datalist id="product-size-presets-edit">
            {sizePresets.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <input
            name="unit"
            defaultValue={product.unit}
            required
            placeholder="หน่วย"
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-black w-20 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
          <input
            name="defaultCostPrice"
            type="number"
            step="0.01"
            min={0}
            defaultValue={product.defaultCostPrice ?? ""}
            placeholder="ต้นทุน"
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-black w-20 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
          <input
            name="defaultSellPrice"
            type="number"
            step="0.01"
            min={0}
            defaultValue={product.defaultSellPrice ?? ""}
            placeholder="ขาย"
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-black w-20 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
          <input
            name="reorderPoint"
            type="number"
            defaultValue={product.reorderPoint}
            placeholder="จุดแจ้งเตือน"
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-black w-24 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
          <button className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700">
            <Save className="size-4" />
          </button>
          <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700">
            <X className="size-4" />
          </button>
        </form>
      </td>
    </tr>
  );
}
