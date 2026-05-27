import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { AppProvider } from "@/context/AppContext";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

// Removed Google font imports to avoid build-time network fetch failures

export const metadata: Metadata = {
  title: "Casefy.ai - Legal Case Management",
  description:
    "AI-powered legal case management and document analysis platform",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-background text-foreground">
        <AuthContextProvider>
          <AppProvider>
            {children}
            <Toaster richColors position="top-right" />

            {process.env.NODE_ENV === "production" && <Analytics />}
          </AppProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}
