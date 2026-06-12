/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF3FC',
          100: '#D7E2F5',
          200: '#B2C4EB',
          300: '#8AA5DE',
          400: '#6081CC',
          500: '#3A5CA8',
          600: '#2F4A8C',
          700: '#253B71',
          800: '#1B2C56',
          900: '#121F3D',
        },
      },
    },
  },
  plugins: [typography],
}
