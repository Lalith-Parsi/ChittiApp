import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lalith-parsi.github.io/ChittiApp/"),
  title: "Chitti — Run your chit funds with confidence",
  description:
    "Chitti digitizes your chit funds end to end — track members, record payments, conduct draws, and keep every rupee accounted for.",
  keywords: ["chit fund", "chitti", "chit fund app", "foreman", "chit fund tracker"],
  openGraph: {
    title: "Chitti — Run your chit funds with confidence",
    description:
      "Replace the paper register and WhatsApp chaos. Track members, record payments, conduct fair draws — all from your phone.",
    type: "website",
    siteName: "Chitti",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chitti — Run your chit funds with confidence",
    description:
      "Replace the paper register and WhatsApp chaos. Track members, record payments, conduct fair draws — all from your phone.",
  },
};

export const viewport: Viewport = {
  themeColor: "#1F5C3D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
