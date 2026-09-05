import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/LACD-Platform";

export const viewport: Viewport = {
  themeColor: "#123f2a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Liberia Agency for Community Development | LACD",
  description: "Community-led programmes, public information, results and opportunities from the Liberia Agency for Community Development.",
  manifest: `${basePath}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LACD",
  },
  icons: {
    icon: `${basePath}/lacd-logo.jpg`,
    shortcut: `${basePath}/lacd-logo.jpg`,
    apple: `${basePath}/lacd-logo.jpg`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
