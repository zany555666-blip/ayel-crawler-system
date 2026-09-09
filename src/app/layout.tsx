import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/auth/Provider";
import { LangProvider } from "@/i18n/LangContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ayel Technology - 外贸供应链智能管理平台",
  description: "Ayel Technology - AI驱动外贸供应链管理系统，主营电子元件、机顶盒、扬声器、通信设备",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("theme")==="light")document.documentElement.classList.add("theme-light")}catch(e){}`,
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <LangProvider>{children}</LangProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
