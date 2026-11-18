"use client";

import { useEffect, useState } from "react";
import { bookingDates, noticeItems, products } from "@/lib/config";

type Order = { id: number; appointment_date: string; product_name: string | null; price: string | null; custom_image_path: string | null; custom_image_url?: string; name: string; phone: string; status: string; created_at: string };
const maxImageSize = 2.5 * 1024 * 1024;

async function readResponse(response: Response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : { error: `服务器没有返回有效响应（${response.status}），请稍后重试。` }; }
  catch { return { error: `服务器返回了无效响应（${response.status}），请稍后重试。` }; }
}

function readImage(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("图片读取失败，请重新选择图片。"));
    reader.readAsDataURL(file);
  });
}

async function prepareImage(file: File) {
  if (file.size <= maxImageSize) return readImage(file);
  if (file.type === "image/gif") throw new Error("GIF 图片超过 2.5 MB，请压缩后再上传。");

  const image = await createImageBitmap(file);
  try {
    for (const maxSide of [1600, 1200]) {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("图片压缩失败，请换一张图片重试。");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.72, 0.62]) {
        const compressed = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
        if (compressed && compressed.size <= maxImageSize) return readImage(compressed);
      }
    }
  } finally {
    image.close();
  }
  throw new Error("图片压缩后仍过大，请选择较小的图片。");
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
        imageData = await prepareImage(customImage);
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
    {step === "success" && order && <section className="content narrow centered">
      <div className="success-mark">✓</div><div className="eyebrow">预约成功</div><h1>预约已记录</h1><p className="lead">请保存你的预约序号。</p>
      <div className="number-card"><small>预约序号</small><strong>{order.id}</strong></div>
      <div className="summary left"><span>{order.appointment_date}</span><strong>{order.product_name || "自定义图片（待联系报价）"}</strong><span>{order.name} · {order.phone}</span></div>
      <div className="care-guide">
        <h2>注意事项‼️</h2>
        <section className="care-section">
          <h3>刚画完（0–2小时）</h3>
          <ul>
            <li><strong>等晾干：</strong>期间不要摸、不要蹭，静置30分钟～1小时，直到完全干透、不粘手。</li>
            <li><strong>不碰水、不出汗：</strong>2小时内绝不沾水、不洗澡，也不要大量出汗。</li>
            <li><strong>不抠、不撕：</strong>干后可能起皮、裂块，别用手抠或撕；撕掉会让图案缺失、颜色变浅。</li>
          </ul>
        </section>
        <section className="care-section">
          <h3>清洗（2小时后）</h3>
          <ul>
            <li><strong>流动清水冲：</strong>轻轻冲洗并揉到没有滑腻感、没有膏体残留。</li>
            <li><strong>轻柔清洁：</strong>别用湿巾或毛巾大力擦，避免晕染、糊边。</li>
            <li><strong>别用指甲刮：</strong>容易染到指甲，也可能刮伤图案。</li>
            <li><strong>刚洗很淡是正常的哦～</strong></li>
          </ul>
        </section>
        <section className="care-section">
          <h3>反色期（1～2天）</h3>
          <ul>
            <li><strong>少泡水、少搓：</strong>洗手快速冲，不泡澡、不游泳、不蒸桑拿，避免加速掉色。</li>
            <li><strong>避免摩擦：</strong>少摸、少蹭衣服，少戴紧的手环或手套。</li>
            <li><strong>保湿但不油：</strong>可涂轻薄无香精乳液；别涂厚凡士林或橄榄油，以免影响留色。</li>
            <li><strong>注意防晒：</strong>暴晒会让颜色变浅、发黄。</li>
          </ul>
        </section>
        <section className="care-section care-warning">
          <h3>禁忌⚠️</h3>
          <ul>
            <li>❌ 不用酒精、卸妆水或湿巾擦拭，也别用湿巾／毛巾大力擦。</li>
            <li>❌ 不抠、不撕、不大力搓；不泡温泉、游泳或长时间泡水。</li>
            <li>❌ 不涂厚油，不暴晒。</li>
          </ul>
        </section>
        <p className="care-duration">留色参考：7–14天</p>
      </div>
      <button className="primary full" onClick={loadOrders}>查看我的预约</button>
    </section>}
    {step === "orders" && <section className="content"><div className="eyebrow">MY BOOKINGS</div><h1>我的预约</h1><p className="lead">仅显示此设备提交的预约。</p>{error && <p className="error">{error}</p>}{orders.length ? <div className="order-list">{orders.map(item => <article className="order-card" key={item.id}><div className="order-title"><strong>预约 #{item.id}</strong><span className={`status ${item.status}`}>{statusLabel(item.status)}</span></div><p>{item.appointment_date} · {item.product_name || "自定义图片"}</p><p>{item.name} · {item.phone}</p>{item.price && <p>{item.price}</p>}{item.custom_image_url && <a className="private-image" href={item.custom_image_url} target="_blank" rel="noreferrer"><img src={item.custom_image_url} alt="预约自定义图片" /><span>查看自定义图片</span></a>}</article>)}</div> : <div className="empty">此设备暂无预约记录。</div>}<button className="back-button" onClick={() => setStep("notice")}>返回首页</button></section>}
    <footer>海纳手绘预约</footer>
  </main>;
}

function statusLabel(status: string) {
  return ({ booked: "待处理", completed: "已完成", cancelled: "已取消", no_show: "未到场" } as Record<string, string>)[status] || status;
}
