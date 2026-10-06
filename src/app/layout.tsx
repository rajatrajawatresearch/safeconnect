import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
} from "next/font/google";
import { DemoBanner } from "@/components/layout/demo-banner";
import { Providers } from "@/components/layout/providers";
import { deployment } from "@/config/deployment";
import { THEME_INIT_SCRIPT } from "@/hooks/use-theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
// Indic faces load only when Gujarati or Hindi text is actually on screen.
const indicGujarati = Noto_Sans_Gujarati({
  variable: "--font-indic-gu",
  subsets: ["gujarati"],
  preload: false,
  display: "swap",
});
const indicHindi = Noto_Sans_Devanagari({
  variable: "--font-indic-hi",
  subsets: ["devanagari"],
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${deployment.productName} — ${deployment.productTagline}`,
    template: `%s · ${deployment.productName}`,
  },
  description:
    "One platform connecting citizens, emergency operators, field responders and command teams. Demonstration prototype — not connected to real emergency services.",
  applicationName: deployment.productName,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a101c" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${indicGujarati.variable} ${indicHindi.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <DemoBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
