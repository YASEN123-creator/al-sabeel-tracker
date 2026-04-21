import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "السبيل - Sabeel | إدارة الوقت والإنتاجية",
  description: "نظام متكامل لإدارة الوقت وتتبع الإنتاجية والبومودورو",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-[Tajawal] bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
