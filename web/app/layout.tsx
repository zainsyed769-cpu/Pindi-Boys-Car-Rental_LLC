import type { Metadata } from "next";
import "./globals.css";
import Layout from "@/components/Layout";
import { Montserrat, Playfair_Display } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat"
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair"
});

export const metadata: Metadata = {
  title: "Pindi Boys Car Rental",
  description: "Premium Dubai car rental services with luxury and reliability."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${montserrat.variable} ${playfair.variable}`}>
      <body className="bg-brand-cloud font-sans text-brand-midnight">
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
