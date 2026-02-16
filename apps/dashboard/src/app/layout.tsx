import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

const mainFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-main" });
const monoFont = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
import "./globals.css";



export const metadata: Metadata = {
  title: "Orbit",
  description: "One click deployment for your projects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${mainFont.variable} ${monoFont.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
