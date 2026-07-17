import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Kaushan_Script } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-hanken",
});

const kaushan = Kaushan_Script({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-kaushan",
});

export const metadata: Metadata = {
  title: "WhichGameToBuy: find your next game by talking",
  description:
    "Describe how you play and get honest Steam game recommendations, with the reason behind each pick.",
};

export const viewport: Viewport = {
  themeColor: "#0d110c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bricolage.variable} ${hanken.variable} ${kaushan.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
