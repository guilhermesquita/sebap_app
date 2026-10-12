import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "sans-serif"],
      },
      fontSize: {
        smallCaption: "8px",
        caption: "12px",
        captionMedium: "14px",
        captionLarge: "20px",
        headline1: "32px",
        headline2: "28px"
      },
      colors: {
        primary: "#4A5D7C",
        secondary: "#AA9E90",
        white: "#FEF8F6",
        background: "#F0EDE8",
        neutral: "#ECE0D9",
        brown: {
          500: "#31271C",
          400: "#55402A",
          300: "#AA8154",
        },
        highlight: "#C7956B",
        success: "#6B8E7F",
        danger: "#E05E5A",
        info: "#7891A8",
        muted: "#8898AA",
      },
    },
  },
  plugins: [],
};

export default config;
