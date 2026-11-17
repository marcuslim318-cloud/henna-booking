import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "海纳手绘预约",
  description: "海纳手绘预约与订单查询"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hans"><body>{children}</body></html>;
}
