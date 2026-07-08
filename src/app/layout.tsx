import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { env } from "@/lib/env";
import { Providers } from "./providers";
import "./globals.css";

// figmaSans -> Inter Variable, figmaMono -> JetBrains Mono (design-system substitutes).
// Exposed as the CSS vars tokens.css fronts in --font-sans / --font-mono.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

// The favicon mark is the real pathgrid glyph from Home.dc.html: the ascending
// polyline with two ink nodes and one lilac end-node ringed in black.
const faviconSvg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'%3E%3Cpath d='M4 24 L13 14 L24 4' stroke='%23000' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='4' cy='24' r='3.4' fill='%23000'/%3E%3Ccircle cx='13' cy='14' r='3.4' fill='%23000'/%3E%3Ccircle cx='24' cy='4' r='4' fill='%23c5b0f4' stroke='%23000' stroke-width='2.2'/%3E%3C/svg%3E";

export const metadata: Metadata = {
  metadataBase: env.appUrlObject,
  title: {
    default: "pathgrid — Visual learning paths",
    template: "%s · pathgrid",
  },
  description:
    "Visual learning paths for any tech skill — generated for you, tracked by you.",
  icons: { icon: faviconSvg },
  // Keep the temporary host out of search until the real domain goes live.
  robots: env.seoIndexingOn
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
