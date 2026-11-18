import { NextRequest, NextResponse } from "next/server";
import { db, storage } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const deviceId = request.headers.get("x-device-id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(deviceId)) return NextResponse.json({ error: "设备信息无效。" }, { status: 400 });
  const orders = await db<any[]>(`orders?device_id=eq.${encodeURIComponent(deviceId)}&select=id,appointment_date,product_id,product_name,price,custom_image_path,name,phone,status,created_at&order=id.desc`);
  const withImages = await Promise.all(orders.map(async order => {
    if (!order.custom_image_path) return order;
    try {
      const signed = await storage(`object/sign/henna-orders/${order.custom_image_path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 900 }) });
      return { ...order, custom_image_url: `${process.env.SUPABASE_URL}/storage/v1${signed.signedURL}` };
    } catch { return order; }
  }));
  return NextResponse.json({ orders: withImages });
}
