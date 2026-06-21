import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdMaker — AI video ads for the rest of us",
  description:
    "Ideate with a creative director, storyboard into model-sized scenes, generate, and assemble a finished ad. Bring your own keys.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="relative">{children}</body>
    </html>
  );
}
