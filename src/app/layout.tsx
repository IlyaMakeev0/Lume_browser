import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lume",
  description: "A Tauri 2 browser shell with a Rust core."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
