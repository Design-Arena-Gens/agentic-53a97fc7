import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Mind Map Generator",
  description: "Convert PDF notes to interactive mind maps with AI-powered medical verification",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
