/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          900: '#05070c',
          800: '#0a0e17',
          700: '#111827',
        },
        accent: {
          DEFAULT: '#38bdf8',
          soft: '#0ea5e9',
        },
      },
    },
  },
  plugins: [],
}
