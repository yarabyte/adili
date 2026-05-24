import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { NavigationProgress } from "@/components/navigation-progress";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Adili — Copilote juridique OHADA pour avocats et praticiens du droit",
  description:
    "Adili est le copilote juridique des avocats et praticiens du droit OHADA : recherche sémantique sourcée, synthèse IA avec citations vérifiables et re-ranking par feedback praticien.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={cn(
        dmSans.variable,
        cormorant.variable,
        "font-sans scroll-smooth"
      )}
    >
      <body className="antialiased">
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
