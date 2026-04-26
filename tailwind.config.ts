import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        shell: "rgb(var(--color-shell) / <alpha-value>)",
        ember: "rgb(var(--color-ember) / <alpha-value>)",
        mint: "rgb(var(--color-mint) / <alpha-value>)",
        brass: "rgb(var(--color-brass) / <alpha-value>)"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(19, 18, 15, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
