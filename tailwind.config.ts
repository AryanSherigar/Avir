import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        severity: {
          severe: "#dc2626",
          veryPoor: "#9333ea",
          poor: "#ea580c",
          moderate: "#d97706",
          good: "#059669",
        },
      },
    },
  },
  plugins: [],
};

export default config;
