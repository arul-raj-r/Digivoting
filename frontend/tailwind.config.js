/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gov: {
          blue: '#0B3C5D',      // Primary Deep Navy
          darkblue: '#07253b',  // Accent Dark Navy
          gold: '#D9B310',      // Golden Yellow Highlight
          slate: '#328CC1',     // Slate Accent Blue
          light: '#F8FAFC',     // Light Background Gray
          dark: '#0F172A',      // Dark Mode Slate
          cardLight: '#FFFFFF', // Light Card
          cardDark: '#1E293B',  // Dark Card
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
