import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 });
  try {
    const { isOpen } = await request.json();
    if (typeof isOpen !== "boolean") return NextResponse.json({ error: "预约通道状态无效。" }, { status: 400 });
    const [setting] = await db<{ is_open: boolean }[]>("booking_settings?singleton=eq.true", {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ is_open: isOpen, updated_at: new Date().toISOString() })
    });
    if (!setting) throw new Error("Booking settings row is missing");
    return NextResponse.json({ isOpen: setting.is_open });
  } catch (error) {
    console.error("Admin booking status update failed", error);
    return NextResponse.json({ error: "无法更新预约通道，请检查数据库设置。" }, { status: 503 });
  }
}
