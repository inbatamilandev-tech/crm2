/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          blue: '#095D95',
          cyan: '#50B1B9',
          orange: '#DF7F09',
          light: '#D2E7E7',
        },
        primary: {
          50: '#D2E7E7',
          100: '#50B1B9',
          500: '#095D95',
          600: '#084d7a',
          700: '#063c60',
        }
      }
    },
  },
  plugins: [],
}
