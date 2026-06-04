import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { CompanyProvider } from "@/lib/company-context";

export const metadata: Metadata = {
  title: "MyOPC — 多 Agent 项目操作系统",
  description: "MyOPC 将多 Agent 管理、项目知识、部署监控、支付运营和智能编码工作台收进一个统一系统。",
};

const UMAMI_WEBSITE_ID = "1aa4fe27-db12-4f9b-b8e9-c41a121e0691";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-50 antialiased">
        <Script
          defer
          src="http://127.0.0.1:3000/script.js"
          data-website-id={UMAMI_WEBSITE_ID}
        />
        <CompanyProvider>{children}</CompanyProvider>
      </body>
    </html>
  );
}
