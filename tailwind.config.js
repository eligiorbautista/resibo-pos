/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-black": "#000000",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      screens: {
        'tablet': '768px',
        'desktop': '1440px',
      },
    },
  },
  plugins: [],
};
