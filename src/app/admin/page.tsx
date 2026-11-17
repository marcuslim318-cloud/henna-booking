"use client";

import { useCallback, useEffect, useState } from "react";

type Order = { id: number; appointment_date: string; product_name: string | null; price: string | null; custom_image_path: string | null; custom_image_url?: string; name: string; phone: string; status: string; created_at: string };
type Stats = { total: number; booked: number; completed: number; cancelled: number; no_show: number };
const labels: Record<string, string> = { booked: "待处理", completed: "已完成", cancelled: "已取消", no_show: "未到场" };

export default function Admin() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, booked: 0, completed: 0, cancelled: 0, no_show: 0 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setBusy(true);
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) { setLoggedIn(false); return; }
      if (!response.ok) throw new Error(data.error || "读取订单失败");
      setOrders(data.orders); setStats(data.stats); setLoggedIn(true); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "读取订单失败"); }
    finally { if (!quiet) setBusy(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "登录失败");
      setPassword(""); await refresh(true);
    } catch (e) { setError(e instanceof Error ? e.message : "登录失败"); }
    finally { setBusy(false); }
  }

  async function changeStatus(order: Order, status: string) {
    if (status === "cancelled" && !window.confirm(`确定取消预约 #${order.id}？该设备可重新预约此日期。`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "更新失败");
      await refresh(true);
    } catch (e) { setError(e instanceof Error ? e.message : "更新失败"); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }); setLoggedIn(false); setOrders([]);
  }

  if (!loggedIn) return <main className="shell"><header className="topbar"><a className="brand" href="/">海纳 <span>管理员后台</span></a><a className="text-button" href="/">预约首页</a></header><section className="content narrow"><div className="eyebrow">ADMIN ACCESS</div><h1>管理员登录</h1><p className="lead">此入口仅供管理员使用。</p><form className="form" onSubmit={login}><label>账号<input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required /></label><label>密码<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>{error && <p className="error">{error}</p>}<button className="primary full" disabled={busy}>{busy ? "正在登录…" : "登录后台"}</button></form></section><footer>海纳手绘 · 管理员入口</footer></main>;

  return <main className="shell admin-shell"><header className="topbar"><a className="brand" href="/">海纳 <span>订单后台</span></a><div className="admin-actions"><button className="text-button" disabled={busy} onClick={() => refresh()}>{busy ? "更新中…" : "⟳ 下拉 / 点击刷新"}</button><button className="text-button" onClick={logout}>退出</button></div></header><section className="admin-content"><div className="admin-heading"><div><div className="eyebrow">ADMIN DASHBOARD</div><h1>预约订单</h1></div><span className="live-pill"><i /> 实时数据</span></div>{error && <p className="error">{error}</p>}<div className="stats-grid"><Stat label="全部订单" value={stats.total}/><Stat label="待处理" value={stats.booked}/><Stat label="已完成" value={stats.completed}/><Stat label="已取消" value={stats.cancelled}/><Stat label="未到场" value={stats.no_show}/></div><div className="section-heading"><h2>订单列表</h2><small>按预约序号排列 · 新订单可下拉刷新</small></div><div className="admin-list">{orders.map(order => <article className="admin-order" key={order.id}><div className="admin-order-main"><div className="order-title"><strong className="order-number">#{order.id}</strong><span className={`status ${order.status}`}>{labels[order.status] || order.status}</span></div><div className="admin-details"><p><b>预约日期</b>{order.appointment_date}</p><p><b>预约者</b>{order.name}</p><p><b>电话</b><a href={`tel:${order.phone}`}>{order.phone}</a></p><p><b>内容</b>{order.product_name || "自定义图片"}{order.price ? ` · ${order.price}` : ""}</p>{order.status === "booked" && !order.product_name && <p className="quote-note">待联系预约者报价</p>}</div>{order.custom_image_url && <a className="private-image" href={order.custom_image_url} target="_blank" rel="noreferrer"><img src={order.custom_image_url} alt="预约者提交的自定义参考图片" /><span>查看自定义图片</span></a>}</div>{order.status === "booked" && <div className="order-actions"><button className="action complete" disabled={busy} onClick={() => changeStatus(order, "completed")}>完成</button><button className="action" disabled={busy} onClick={() => changeStatus(order, "no_show")}>未到场</button><button className="action cancel" disabled={busy} onClick={() => changeStatus(order, "cancelled")}>取消</button></div>}</article>)}{!orders.length && <div className="empty">暂时没有预约订单。</div>}</div></section><footer>海纳手绘 · 管理员后台</footer></main>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>; }
