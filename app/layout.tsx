import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TMCPA · EMGT 5220",
  description: "Team Member Contribution & Professionalism Assessment — Northeastern University",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="tmcpa-root">
        <div className="grain" />
        {children}
      </body>
    </html>
  );
}
