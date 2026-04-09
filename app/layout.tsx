import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/shared/app-toaster";
import { PwaRegister } from "@/components/shared/pwa-register";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RepCore",
    template: "%s | RepCore",
  },
  description: "Premium gym management SaaS for independent Indian gyms.",
  applicationName: "RepCore",
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
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} min-h-screen bg-background font-sans text-foreground antialiased`}>
        <PwaRegister />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
