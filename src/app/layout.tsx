import type { Metadata } from "next";
import "@/app/globals.css";

const siteName = "QR Code Generator";
const siteDescription = "Generate QR codes from URLs in seconds.";

// - If NEXT_PUBLIC_SITE_URL is set, use it (recommended when you have a custom domain).
// - Else, on Vercel, use VERCEL_URL.
// - Else, fallback to localhost.
function getSiteUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return envUrl || "http://localhost:3000";
}

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: siteName,
    template: `%s • ${siteName}`,
  },

  description: siteDescription,

  applicationName: siteName,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",

  keywords: [
    "QR Code",
    "QR Code Generator",
    "QRCode",
    "URL to QR",
    "PNG QR Code",
    "Free QR Generator",
  ],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    title: siteName,
    description: siteDescription,
    url: "/",
    siteName,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: `${siteName} preview`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["/og.png"],
  },

  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },

  // This only links the manifest — you still must create the file in /public.
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
