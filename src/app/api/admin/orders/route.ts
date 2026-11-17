import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { db, storage } from "@/lib/supabase";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 });
  const orders = await db<any[]>("orders?select=*&order=id.asc");
  const stats = orders.reduce((sum, order) => {
    sum.total++;
    sum[order.status] = (sum[order.status] || 0) + 1;
    return sum;
  }, { total: 0, booked: 0, completed: 0, cancelled: 0, no_show: 0 } as Record<string, number>);
  const withImages = await Promise.all(orders.map(async order => {
    if (!order.custom_image_path) return order;
    try {
      const signed = await storage(`object/sign/henna-orders/${order.custom_image_path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 900 }) });
      return { ...order, custom_image_url: `${process.env.SUPABASE_URL}/storage/v1${signed.signedURL}` };
    } catch { return order; }
  }));
  return NextResponse.json({ orders: withImages, stats });
}
