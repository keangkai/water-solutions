"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { Droplets, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-sky-500 shadow-lg mb-4">
            <Droplets className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">น้ำสต็อก</h1>
          <p className="text-slate-500 text-sm mt-1">ระบบจัดการสต็อกน้ำ</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {state?.error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-5">
              <AlertCircle className="size-4 shrink-0" />
              {state.error}
            </div>
          )}

          <form action={action} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">ชื่อผู้ใช้</label>
              <input
                name="username"
                required
                autoComplete="username"
                autoCapitalize="none"
                className="border border-slate-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">รหัสผ่าน</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="border border-slate-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 w-full pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <button
              disabled={pending}
              className="w-full bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-60 text-white font-medium rounded-xl px-4 py-3 transition-colors text-sm touch-manipulation"
            >
              {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
