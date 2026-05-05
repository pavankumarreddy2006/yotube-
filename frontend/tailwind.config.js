/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#111A2E",
      },
      boxShadow: {
        panel: "0 24px 60px rgba(0, 0, 0, 0.28)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Sora", "sans-serif"],
      }
    }
  },
  plugins: []
};
