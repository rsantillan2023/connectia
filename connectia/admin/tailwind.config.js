/** @type {import('tailwindcss').Config} */
/** Color base admin = lila Talent / AITalent (#8554C9) — Ola 36-j */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#8554C9',
          dark: '#6B3FA0',
          soft: '#F7F2FC',
        },
        /* Remapea teal-* legacy al lila de marca (vistas con clases Tailwind antiguas) */
        teal: {
          50: '#F7F2FC',
          100: '#EFE6FA',
          200: '#DDC9F4',
          300: '#C5A6EB',
          400: '#A87DDE',
          500: '#9263D4',
          600: '#8554C9',
          700: '#8554C9',
          800: '#6B3FA0',
          900: '#5A3488',
          950: '#3D2260',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
