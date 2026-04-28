import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { PortfolioProvider } from "@/contexts/PortfolioContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AppShell from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portofin — AI-Powered Portfolio Tracker",
  description: "Track your IDX stocks & crypto portfolio with AI-powered insights, real-time prices, and intelligent analysis in IDR and USD",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body suppressHydrationWarning>
        <LanguageProvider>
          <AuthProvider>
            <CurrencyProvider>
              <PortfolioProvider>
                <AppShell>{children}</AppShell>
              </PortfolioProvider>
            </CurrencyProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

