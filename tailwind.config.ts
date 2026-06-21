import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15120E",
        raise: "#221E18",
        line: "#37302A",
        bone: "#E9E2D3",
        paper: "#F3EEE2",
        marker: "#FF5631",
        teal: "#5BA8A0",
        muted: "#9A8F7E",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: { xl2: "1.1rem" },
    },
  },
  plugins: [],
};
export default config;
