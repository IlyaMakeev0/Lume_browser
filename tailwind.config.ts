import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#151412",
        shell: "#f6f2ea",
        ember: "#f06f3c",
        mint: "#6ec6a4",
        brass: "#b68b48"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(19, 18, 15, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
