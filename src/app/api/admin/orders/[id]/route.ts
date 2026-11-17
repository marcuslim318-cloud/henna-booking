import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/supabase";

const statuses = ["completed", "cancelled", "no_show"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 });
  const { status } = await request.json();
  if (!statuses.includes(status)) return NextResponse.json({ error: "订单状态无效。" }, { status: 400 });
  try {
    const [order] = await db<any[]>(`orders?id=eq.${encodeURIComponent(params.id)}&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status, updated_at: new Date().toISOString() }) });
    return NextResponse.json({ order });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "订单更新失败。" }, { status: 500 });
  }
}
