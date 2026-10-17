import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
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

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portofin | IDX Stock & Crypto Portfolio Ledger",
  description: "Track your IDX stocks and crypto portfolio with real-time market prices, risk analytics, and multi-currency ledger in IDR and USD.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
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

