import type { Metadata, Viewport } from "next";
import { Lora } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Nav, BottomNav, DisclaimerBanner } from "@/components/Nav";
import { Providers } from "@/components/Providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });

export const metadata: Metadata = {
  title: "Satro Calendar",
  description:
    "Plan with the stars, talk with a guide. A Tuto project by Pluto Theory.",
  appleWebApp: { capable: true, title: "Satro", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets env(safe-area-inset-*) report real values
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EAF3EF" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1A18" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${lora.variable} font-sans antialiased`}>
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-orbit-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-cosmic"
          >
            Skip to content
          </a>
          <Nav />
          <DisclaimerBanner />
          <main
            id="main"
            className="mx-auto max-w-5xl px-4 py-4 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:py-6 md:pb-6"
          >
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
