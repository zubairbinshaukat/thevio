import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { BRAND_COLORS } from "@/config/brand";
import { siteConfig } from "@/config/site";
import { Preloader, PreloaderHead } from "@/features/preloader/preloader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Mono is never in the first paint, so don't let it compete with LCP.
const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: BRAND_COLORS.dark },
  ],
};

// The <head> script sets `.dark` and a colour-scheme style on <html> before
// first paint, so <html> differs from the server markup on purpose.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <PreloaderHead />
      </head>
      <body className="flex min-h-full flex-col">
        <Preloader />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
