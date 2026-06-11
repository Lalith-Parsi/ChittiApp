import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light-premium base (warm off-white, never pure white)
        bg: "#F7F6F1",
        surface: "#FFFFFF",
        ink: "#10211A", // near-black with a green cast
        muted: "#5A6660",
        // Single accent — pulled from the app's forest green
        accent: {
          DEFAULT: "#1F5C3D",
          soft: "#E7F0E9",
          dark: "#163F2A",
        },
        line: "#E6E3DB",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["clamp(2.75rem, 7vw, 5.5rem)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
        section: ["clamp(1.9rem, 4vw, 3.25rem)", { lineHeight: "1.08", letterSpacing: "-0.02em" }],
      },
      maxWidth: {
        content: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
