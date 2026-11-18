import { NextRequest, NextResponse } from "next/server";
import { bookingDates, products } from "@/lib/config";
import { db, storage } from "@/lib/supabase";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const deviceId = request.headers.get("x-device-id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(deviceId)) return NextResponse.json({ error: "设备信息无效，请刷新页面重试。" }, { status: 400 });
  let customImagePath: string | null = null;
  try {
    const [bookingSetting] = await db<{ is_open: boolean }[]>("booking_settings?select=is_open&singleton=eq.true");
    if (!bookingSetting) throw new Error("Booking settings row is missing");
    if (!bookingSetting.is_open) return NextResponse.json({ error: "预约通道已关闭，暂时无法提交新的预约。" }, { status: 403 });
    const { appointmentDate, productId, imageData, name, phone } = await request.json();
    if (!bookingDates.includes(appointmentDate)) return NextResponse.json({ error: "请选择开放预约的日期。" }, { status: 400 });
    if (appointmentDate < new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date())) return NextResponse.json({ error: "过去日期不能预约。" }, { status: 400 });
    const product = productId ? products.find(item => item.id === productId) : null;
    if (productId && !product) return NextResponse.json({ error: "所选款式不存在。" }, { status: 400 });
    if (!product && !imageData) return NextResponse.json({ error: "请选择款式或上传自定义图片。" }, { status: 400 });
    if (!name?.trim() || !phone?.trim()) return NextResponse.json({ error: "请填写姓名和电话号码。" }, { status: 400 });
    if (imageData) {
      const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/.exec(imageData);
      if (!match) return NextResponse.json({ error: "图片格式不支持，请使用 PNG、JPG、WebP 或 GIF。" }, { status: 400 });
      const bytes = Buffer.from(match[2], "base64");
      customImagePath = `${deviceId}/${randomUUID()}`;
      await storage(`object/henna-orders/${customImagePath}`, { method: "POST", headers: { "Content-Type": match[1], "x-upsert": "false" }, body: bytes });
    }
    const [order] = await db<any[]>("rpc/create_booking", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ p_device_id: deviceId, p_appointment_date: appointmentDate, p_product_id: product?.id || null, p_product_name: product?.name || null, p_price: product?.price || null, p_custom_image_path: customImagePath, p_name: name.trim(), p_phone: phone.trim() })
    });
    return NextResponse.json({ order });
  } catch (error) {
    if (customImagePath) await storage(`object/henna-orders/${customImagePath}`, { method: "DELETE" }).catch(() => null);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("booking_channel_closed")) return NextResponse.json({ error: "预约通道已关闭，暂时无法提交新的预约。" }, { status: 403 });
    if (message.includes("one_active_booking_per_device_date") || message.includes("23505")) return NextResponse.json({ error: "此设备已经预约过该日期。" }, { status: 409 });
    console.error("Booking request failed", error);
    return NextResponse.json({ error: "预约暂时无法提交，请稍后重试。" }, { status: 503 });
  }
}
