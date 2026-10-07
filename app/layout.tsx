import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/analytics";
import { CookieBanner } from "@/components/cookie-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const description =
  "Know where your time goes, what you earned, and what you actually made. Time tracking and profit for independent contractors and small service businesses.";

export const metadata: Metadata = {
  metadataBase: new URL("https://workworth.de"),
  title: { default: "WorkWorth", template: "%s · WorkWorth" },
  description,
  applicationName: "WorkWorth",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "WorkWorth", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "WorkWorth",
    title: "WorkWorth",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "WorkWorth",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0c1929",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Analytics />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
