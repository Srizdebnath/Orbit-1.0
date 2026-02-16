import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const mainFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-main" });
const monoFont = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

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
    <html lang="en" className={`${mainFont.variable} ${monoFont.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-white dark:bg-[#0a0a0f] text-black dark:text-gray-100 transition-colors duration-300">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
