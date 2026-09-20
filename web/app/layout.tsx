import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "学生发展优势测评",
  description: "发现优势，理解自己，探索未来。完成测评，补充个人信息，生成我的发展报告。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased"><a className="skip-link" href="#main-content">跳到主要内容</a>{children}</body>
    </html>
  );
}
