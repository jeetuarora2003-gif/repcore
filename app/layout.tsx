import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/shared/app-toaster";
import { PwaRegister } from "@/components/shared/pwa-register";
import NextTopLoader from "nextjs-toploader";
import { ThemeInitScript } from "@/components/shared/theme-picker";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RepCore | Smart Gym Management for Indian Gyms",
    template: "%s | RepCore",
  },
  description: "The premium management software for modern Indian gyms. Track memberships, collect fees via UPI, and send auto-reminders on WhatsApp. Built for speed and simplicity.",
  keywords: ["gym management software", "Indian gym app", "gym billing software India", "fitness club management", "RepCore gym manager"],
  authors: [{ name: "RepCore Team" }],
  creator: "RepCore",
  publisher: "RepCore",
  applicationName: "RepCore",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://repcore.app",
    siteName: "RepCore",
    title: "RepCore | Next-Gen Gym Management",
    description: "Built for independent Indian gyms. Simple, powerful, and mobile-first.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RepCore - Smart Gym Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RepCore | Smart Gym Management",
    description: "Manage your gym from your phone. Built for the modern Indian fitness industry.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RepCore",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "RepCore",
    operatingSystem: "Android, iOS, Windows, macOS",
    applicationCategory: "BusinessApplication, HealthApplication",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "120",
    },
    offers: {
      "@type": "Offer",
      price: "0.00",
      priceCurrency: "INR",
    },
  };

  return (
    <html lang="en" className="dark">
      <head>
        <ThemeInitScript />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} min-h-screen bg-background font-sans text-foreground antialiased`}>
        {/* Top loader uses accent CSS variable so it matches whatever theme the gym picks */}
        <NextTopLoader color="var(--accent, #2563eb)" showSpinner={false} shadow="0 0 10px var(--accent, #2563eb), 0 0 5px var(--accent, #2563eb)" />
        <PwaRegister />
        {children}
        <Toaster />
        <SpeedInsights />
      </body>
    </html>
  );
}
