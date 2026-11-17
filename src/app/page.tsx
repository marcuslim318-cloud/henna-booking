"use client";

import { useEffect, useState } from "react";
import { bookingDates, noticeItems, products } from "@/lib/config";

type Order = { id: number; appointment_date: string; product_name: string | null; price: string | null; custom_image_path: string | null; custom_image_url?: string; name: string; phone: string; status: string; created_at: string };

async function readResponse(response: Response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : { error: `服务器没有返回有效响应（${response.status}），请稍后重试。` }; }
  catch { return { error: `服务器返回了无效响应（${response.status}），请稍后重试。` }; }
}

function getDeviceId() {
  let id = localStorage.getItem("henna_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("henna_device_id", id);
  }
  return id;
}

export default function Home() {
  const [step, setStep] = useState<"notice" | "booking" | "details" | "success" | "orders">("notice");
  const [date, setDate] = useState("");
  const [choice, setChoice] = useState("");
  const [customImage, setCustomImage] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("henna_last_order");
    if (saved) {
      try { setOrder(JSON.parse(saved) as Order); } catch {}
    }
  }, []);

  async function loadOrders() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/orders", { headers: { "x-device-id": getDeviceId() } });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || "暂时无法读取订单");
      setOrders(data.orders);
      setStep("orders");
    } catch (e) { setError(e instanceof Error ? e.message : "暂时无法读取订单"); }
    finally { setBusy(false); }
  }

  async function submitBooking(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      let imageData: string | null = null;
      if (customImage) {
          imageData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("图片读取失败"));
          reader.readAsDataURL(customImage);
        });
      }
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-device-id": getDeviceId() },
        body: JSON.stringify({ appointmentDate: date, productId: choice || null, imageData, name, phone })
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || "预约提交失败");
      setOrder(data.order); sessionStorage.setItem("henna_last_order", JSON.stringify(data.order)); setStep("success");
    } catch (e) { setError(e instanceof Error ? e.message : "预约提交失败"); }
    finally { setBusy(false); }
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date());
  const availableDates = bookingDates.filter(d => d >= today);

  return <main className="shell">
    <header className="topbar"><a className="brand" href="/">海纳 <span>手绘预约</span></a><button className="text-button" onClick={loadOrders} disabled={busy}>我的预约</button></header>
    {step === "notice" && <section className="hero"><div className="heritage-banner"><div className="banner-copy"><span>HENNA ART · MALAYSIA</span><strong>海纳手绘</strong><i>以花纹，留住一刻南洋时光</i></div></div><div className="eyebrow">HENNA · APPOINTMENT</div><h1>预约前，请先了解这些事项</h1><p className="lead">让我们为你的手绘预约安排得更顺利。</p><div className="notice-card"><ol>{noticeItems.map(item => <li key={item}>{item}</li>)}</ol><button className="primary full" onClick={() => setStep("booking")}>已阅读并同意</button></div><a className="admin-link" href="/admin">管理员入口</a></section>}
    {step === "booking" && <section className="content"><div className="eyebrow">STEP 01 · 选择预约内容</div><h1>选一个预约日期</h1><p className="lead">可预约 2026 年 11 月 21 日或 22 日。</p><div className="date-grid">{availableDates.map(d => <button key={d} className={`date-card ${date === d ? "selected" : ""}`} onClick={() => setDate(d)}><span>{d.slice(5).replace("-", " / ")}</span><small>2026 年 11 月</small></button>)}</div>{availableDates.length === 0 && <p className="empty">目前没有可预约日期。</p>}
      <h2>选择手绘款式 <small>单选</small></h2><div className="product-grid">{products.length ? products.map(product => <button key={product.id} className={`product-card ${choice === product.id ? "selected" : ""}`} onClick={() => { setChoice(product.id); setCustomImage(null); }}>{product.imageUrl ? <img className="image-placeholder" src={product.imageUrl} alt={product.name} /> : <span className="image-placeholder">图片待补</span>}<strong>{product.name}</strong><span>{product.price}</span></button>) : <div className="empty wide">款式目录暂未填写，当前可提交自定义图片预约。</div>}</div>
      <h2>自定义图片 <small>可选</small></h2><label className={`upload-box ${customImage ? "uploaded" : ""}`}><input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0] || null; setCustomImage(file); if (file) setChoice(""); }} /><span className="upload-icon">＋</span><strong>{customImage ? customImage.name : "上传你想绘制的图片"}</strong><small>管理员会联系你报价，图片仅你和管理员可见</small></label>
      {error && <p className="error">{error}</p>}<button className="primary" disabled={!date || (!choice && !customImage)} onClick={() => setStep("details")}>继续填写资料</button><button className="back-button" onClick={() => setStep("notice")}>返回注意事项</button></section>}
    {step === "details" && <section className="content narrow"><div className="eyebrow">STEP 02 · 联系方式</div><h1>填写预约资料</h1><p className="lead">预约日期：{date}</p><form onSubmit={submitBooking} className="form"><label>姓名<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="请输入姓名" /></label><label>电话号码<input required type="tel" maxLength={40} value={phone} onChange={e => setPhone(e.target.value)} placeholder="请输入电话号码" /></label><div className="summary"><span>预约内容</span><strong>{customImage ? `自定义图片：${customImage.name}（待联系报价）` : products.find(p => p.id === choice)?.name}</strong></div>{error && <p className="error">{error}</p>}<button className="primary full" disabled={busy}>{busy ? "正在提交…" : "确认预约"}</button><button type="button" className="back-button" onClick={() => setStep("booking")}>返回修改</button></form></section>}
    {step === "success" && order && <section className="content narrow centered"><div className="success-mark">✓</div><div className="eyebrow">预约成功</div><h1>预约已记录</h1><p className="lead">请保存你的预约序号。</p><div className="number-card"><small>预约序号</small><strong>{order.id}</strong></div><div className="summary left"><span>{order.appointment_date}</span><strong>{order.product_name || "自定义图片（待联系报价）"}</strong><span>{order.name} · {order.phone}</span></div><button className="primary full" onClick={loadOrders}>查看我的预约</button></section>}
    {step === "orders" && <section className="content"><div className="eyebrow">MY BOOKINGS</div><h1>我的预约</h1><p className="lead">仅显示此设备提交的预约。</p>{error && <p className="error">{error}</p>}{orders.length ? <div className="order-list">{orders.map(item => <article className="order-card" key={item.id}><div className="order-title"><strong>预约 #{item.id}</strong><span className={`status ${item.status}`}>{statusLabel(item.status)}</span></div><p>{item.appointment_date} · {item.product_name || "自定义图片"}</p><p>{item.name} · {item.phone}</p>{item.price && <p>{item.price}</p>}{item.custom_image_url && <a className="private-image" href={item.custom_image_url} target="_blank" rel="noreferrer"><img src={item.custom_image_url} alt="预约自定义图片" /><span>查看自定义图片</span></a>}</article>)}</div> : <div className="empty">此设备暂无预约记录。</div>}<button className="back-button" onClick={() => setStep("notice")}>返回首页</button></section>}
    <footer>海纳手绘预约</footer>
  </main>;
}

function statusLabel(status: string) {
  return ({ booked: "待处理", completed: "已完成", cancelled: "已取消", no_show: "未到场" } as Record<string, string>)[status] || status;
}
