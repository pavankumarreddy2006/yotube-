/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#08111f",
        shell: "#0e1a2d",
        panel: "#10223b",
        panelSoft: "#142a46",
        accent: "#00d1b2",
        highlight: "#f97316",
        success: "#22c55e",
        warning: "#facc15",
        danger: "#f43f5e"
      },
      boxShadow: {
        glow: "0 22px 70px rgba(2, 10, 24, 0.45)",
        soft: "0 20px 60px rgba(4, 14, 30, 0.28)"
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        body: ["'Noto Sans Telugu'", "Manrope", "sans-serif"]
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        pulseLine: "pulseLine 1.4s ease-in-out infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        pulseLine: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" }
        }
      }
    }
  },
  plugins: []
};
