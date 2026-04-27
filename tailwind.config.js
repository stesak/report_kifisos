/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
    "./store/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        govblue: "#003476",
        govcyan: "#00AEEF",
        govgray: "#F2F2F2",
        ink: "#1D1D1B",
        asphalt: "#20252b",
        lane: "#f5c542",
        signal: "#D4351C",
        teal: "#006736",
      },
      boxShadow: {
        panel: "0 2px 0 rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
