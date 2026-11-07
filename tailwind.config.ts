import type { Config } from "tailwindcss";

// Colour values live in globals.css as RGB triplets so light and dark share tokens.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const appleStack = [
  "-apple-system",
  "BlinkMacSystemFont",
  '"SF Pro Text"',
  "var(--font-geist-sans)",
  "system-ui",
  "sans-serif",
];

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmic: {
          DEFAULT: token("cosmic"),
          soft: token("cosmic-soft"),
          deep: token("cosmic-deep"),
        },
        "on-cosmic": token("on-cosmic"),
        solar: {
          DEFAULT: token("solar"),
          soft: token("solar-soft"),
        },
        zest: token("zest"),
        bloom: token("bloom"),
        orbit: {
          DEFAULT: token("orbit"),
          card: token("orbit-card"),
          muted: token("orbit-muted"),
        },
        space: {
          DEFAULT: token("space"),
          soft: token("space"),
          muted: token("space"),
        },
      },
      fontFamily: {
        sans: appleStack,
        display: appleStack,
        serif: ["var(--font-lora)", "Georgia", "serif"],
      },
      boxShadow: {
        satro: "var(--shadow-card)",
      },
    },
  },
  plugins: [],
};
export default config;
