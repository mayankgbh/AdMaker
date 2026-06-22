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
      <body className="relative">
        <a
          href="https://www.gatherhq.com/?utm_source=admaker&utm_medium=banner&utm_campaign=topbar"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative z-20 block w-full border-b border-line bg-gradient-to-r from-[#FF5631]/20 via-raise to-raise"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-5 py-2 text-center text-[13px] leading-tight">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-marker">Built by Gather</span>
            <span className="text-bone/90">Primary research at AI speed. Interview real or synthetic buyers and turn the answers into decisions.</span>
            <span className="whitespace-nowrap font-medium text-marker group-hover:underline">gatherhq.com →</span>
          </div>
        </a>
        {children}
      </body>
    </html>
  );
}
