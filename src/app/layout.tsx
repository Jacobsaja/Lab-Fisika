import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css";

export const metadata: Metadata = {
  title: "Lab Fisika Virtual",
  description:
    "Laboratorium fisika virtual interaktif 2D. Jelajahi eksperimen fisika secara bebas atau ikuti praktikum terpandu.",
  keywords: ["fisika", "laboratorium virtual", "praktikum", "sains", "pendidikan"],
  openGraph: {
    title: "Lab Fisika Virtual",
    description: "Laboratorium fisika virtual interaktif 2D untuk pembelajaran sains.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
