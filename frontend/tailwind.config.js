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
        graphite: {
          950: '#0e1013',
          900: '#14171b',
          800: '#1b1e24',
          700: '#262a32',
          600: '#383d47',
          500: '#555c68',
        },
        ivory: {
          50: '#fcfbf9',
          100: '#f7f5f0',
          200: '#eeebe3',
          300: '#ded9cd',
        },
        forest: {
          900: '#133325',
          800: '#1a4231',
          700: '#235942',
          600: '#2e7356',
          500: '#3c936f',
        },
        sage: {
          100: '#edf2ee',
          200: '#dce5df',
          300: '#c5d4c9',
          700: '#425b4d',
        },
        civic: {
          graphite: '#14171b',
          forest: '#1a4231',
          emerald: '#10b981',
          amber: '#d97706',
          ivory: '#f7f5f0',
          terracotta: '#c25e4e',
          cardLight: '#ffffff',
          cardDark: '#171a20',
          borderLight: '#e6e2d8',
          borderDark: '#272b34',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
