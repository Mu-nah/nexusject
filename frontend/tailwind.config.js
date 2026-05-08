/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0a0f1a',
        },
        emerald: {
          950: '#022c22',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
