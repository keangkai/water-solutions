"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Droplets,
  LayoutDashboard,
  Package,
  Tag,
  Users,
  UserSearch,
  UserPlus,
  Contact,
  ClipboardCheck,
  Truck,
  Megaphone,
  Warehouse,
  ArrowLeftRight,
  ClipboardList,
  BarChart3,
  Repeat,
  Wallet,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { logout } from "@/app/login/actions";

const navLinks = [
  { href: "/", label: "หน้าหลัก", icon: LayoutDashboard },
  { href: "/products", label: "สินค้า", icon: Package },
  { href: "/brands", label: "ยี่ห้อ", icon: Tag },
  { href: "/customers/new", label: "เพิ่มลูกค้า", icon: UserPlus },
  { href: "/partners", label: "คู่ค้า", icon: Users },
  { href: "/customer-sources", label: "ช่องทางลูกค้า", icon: Megaphone },
  { href: "/warehouses", label: "คลัง", icon: Warehouse },
  { href: "/orders", label: "ออเดอร์", icon: ClipboardCheck },
  { href: "/driver", label: "หน้าคนขับ", icon: Truck },
  { href: "/movements", label: "รับเข้า/ขายออก", icon: ArrowLeftRight },
  { href: "/transfers", label: "โอนย้ายคลัง", icon: Repeat },
  { href: "/stock-counts", label: "นับสต็อก", icon: ClipboardList },
  { href: "/reports", label: "รายงาน", icon: BarChart3 },
  { href: "/customers/list", label: "รายชื่อลูกค้า", icon: Contact },
  { href: "/customers", label: "วิเคราะห์ลูกค้า", icon: UserSearch },
  { href: "/finance", label: "การเงิน", icon: Wallet },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // เปลี่ยนหน้าแล้วปิดเมนู (ปรับ state ระหว่าง render แทน setState ใน effect)
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // หน้าคนขับมีหัวของตัวเอง ไม่แสดงเมนูของ admin
  if (pathname === "/login" || pathname.startsWith("/driver")) return null;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <Link href="/" className="flex items-center gap-2 min-h-[44px] font-semibold text-slate-900">
            <Droplets className="size-5 text-sky-500" />
            <span>น้ำสต็อก</span>
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="size-11 -mr-2 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors touch-manipulation"
            aria-label="เปิดเมนู"
          >
            <Menu className="size-6" />
          </button>
        </div>
      </header>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-72 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <Droplets className="size-5 text-sky-500" />
            น้ำสต็อก
          </div>
          <button
            onClick={() => setOpen(false)}
            className="size-11 -mr-2 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors touch-manipulation"
            aria-label="ปิดเมนู"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors touch-manipulation ${
                  active
                    ? "bg-sky-50 text-sky-600 font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`size-5 shrink-0 ${active ? "text-sky-500" : "text-slate-400"}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-200">
          <form action={logout}>
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full touch-manipulation">
              <LogOut className="size-5 shrink-0" />
              ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
