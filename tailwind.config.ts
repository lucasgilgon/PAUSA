import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#056783",
          dk: "#044e64",
          lt: "#e0f4f9",
          fg: "#ffffff",
          700: "#045570",
        },
        secondary: {
          DEFAULT: "#146b59",
          lt: "#e5f4f0",
          fg: "#ffffff",
          container: "rgba(164,242,219,0.3)",
          "container-foreground": "#033d2d",
        },
        sc: {
          DEFAULT: "#a4f2db",
          lt: "#d0faf0",
          fg: "#033d2d",
        },
        error: {
          DEFAULT: "#a83836",
          lt: "#fdeaea",
          fg: "#ffffff",
          border: "#f29b9a",
        },
        warning: {
          DEFAULT: "#a0610a",
          lt: "#fff4e5",
          fg: "#ffffff",
        },
        success: {
          DEFAULT: "#1a6e45",
          lt: "#e8f5ee",
          fg: "#ffffff",
        },
        surface: {
          DEFAULT: "#ffffff",
          secondary: "#f0f6f7",
          tertiary: "#e4eef1",
        },
        border: {
          DEFAULT: "#d0e4ea",
          strong: "#bcd6de",
          subtle: "#e8f1f4",
        },
        text: {
          primary: "#0e2a30",
          secondary: "#456070",
          tertiary: "#7da0ae",
          disabled: "#a8c4cc",
        },
        bg: "#f5f8f9",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Public Sans", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "14px",
        xl: "18px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(5, 103, 131, 0.06)",
        md: "0 4px 16px rgba(5, 103, 131, 0.10)",
        lg: "0 8px 32px rgba(5, 103, 131, 0.12)",
        risk: "0 0 0 3px rgba(168, 56, 54, 0.20)",
        focus: "0 0 0 2px rgba(5, 103, 131, 0.40)",
      },
      maxWidth: {
        app: "430px",
      },
      zIndex: {
        nav: "50",
        topbar: "60",
        alert: "70",
        raised: "30",
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px" }],
      },
    },
  },
  plugins: [],
};

export default config;
