import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [setting] = await db<{ is_open: boolean }[]>("booking_settings?select=is_open&singleton=eq.true");
    if (!setting) throw new Error("Booking settings row is missing");
    return NextResponse.json({ isOpen: setting.is_open });
  } catch (error) {
    console.error("Booking status request failed", error);
    return NextResponse.json({ error: "暂时无法读取预约状态，请稍后重试。" }, { status: 503 });
  }
}
