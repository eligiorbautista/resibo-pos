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
        'laptop': '1024px',
        'desktop': '1440px',
        'wide': '1920px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          tablet: '1.5rem',
          laptop: '2rem',
          desktop: '2.5rem',
        },
      },
    },
  },
  plugins: [],
};
