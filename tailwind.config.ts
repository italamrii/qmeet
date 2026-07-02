/**
 * tailwind.config.ts
 * ------------------
 * Purpose: Tailwind theme for the QIMAM Meet design language.
 *   - Cinematic near-black surfaces (#0a0a0f family), never pure black.
 *   - Electric teal/blue accent used sparingly (live indicators, focus, active speaker).
 *   - shadcn/ui-compatible HSL CSS-variable tokens (defined in src/app/globals.css).
 * Depends on: src/app/globals.css (CSS variable definitions), tailwindcss-animate.
 * Security notes: none (build-time only).
 */
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        /** Signature accent: electric teal glow. Use sparingly. */
        glow: {
          DEFAULT: "hsl(var(--glow))",
          soft: "hsl(var(--glow) / 0.35)",
          faint: "hsl(var(--glow) / 0.12)",
        },
        /** Live/recording indicator red. */
        live: "hsl(var(--live))",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-arabic)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        header: "0.12em",
        wide2: "0.2em",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        /** Soft accent glow for active video tiles / focused controls. */
        glow: "0 0 0 1px hsl(var(--glow) / 0.55), 0 0 24px 2px hsl(var(--glow) / 0.25)",
        "glow-sm": "0 0 0 1px hsl(var(--glow) / 0.4), 0 0 12px 1px hsl(var(--glow) / 0.18)",
        "live": "0 0 0 1px hsl(var(--live) / 0.6), 0 0 16px 2px hsl(var(--live) / 0.25)",
      },
      backgroundImage: {
        /** Cinematic radial ambience for page backgrounds. */
        "cinematic":
          "radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--glow) / 0.10), transparent), radial-gradient(ellipse 60% 40% at 80% 110%, hsl(222 60% 20% / 0.25), transparent)",
        "tile-sheen":
          "linear-gradient(160deg, hsl(240 15% 12% / 0.9), hsl(240 20% 7% / 0.95))",
      },
      keyframes: {
        "pulse-live": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "speaking-ring": {
          "0%, 100%": { boxShadow: "0 0 0 1px hsl(var(--glow) / 0.5), 0 0 16px 1px hsl(var(--glow) / 0.2)" },
          "50%": { boxShadow: "0 0 0 2px hsl(var(--glow) / 0.8), 0 0 28px 4px hsl(var(--glow) / 0.35)" },
        },
      },
      animation: {
        "pulse-live": "pulse-live 1.6s ease-in-out infinite",
        "speaking-ring": "speaking-ring 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
