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
  Warehouse,
  ArrowLeftRight,
  ClipboardList,
  BarChart3,
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
  { href: "/partners", label: "คู่ค้า", icon: Users },
  { href: "/warehouses", label: "คลัง", icon: Warehouse },
  { href: "/movements", label: "รับเข้า/ขายออก", icon: ArrowLeftRight },
  { href: "/stock-counts", label: "นับสต็อก", icon: ClipboardList },
  { href: "/reports", label: "รายงาน", icon: BarChart3 },
  { href: "/finance", label: "การเงิน", icon: Wallet },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (pathname === "/login") return null;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <Droplets className="size-5 text-sky-500" />
            <span>น้ำสต็อก</span>
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="p-2 -mr-2 text-slate-600 hover:text-slate-900 transition-colors touch-manipulation"
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
