import type { Metadata } from "next";
import { getPublicAssetPath } from "@/lib/public-path";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarePal Agreement Generator",
  description:
    "Create and download service agreements for Carepalz Internet Private Limited.",
  icons: { icon: getPublicAssetPath("/carepal-logo.png") },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
