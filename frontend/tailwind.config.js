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
        background: '#0B0E14',
        surface: '#151A23',
        surfaceHover: '#1D2432',
        border: '#232B3B',
        brand: {
          primary: '#820AD1', // Roxo Nu tech
          accent: '#A033EB',
          light: '#BA68C8'
        },
        trade: {
          buy: '#00C076',
          buyBg: 'rgba(0, 192, 118, 0.12)',
          sell: '#FF4D4F',
          sellBg: 'rgba(255, 77, 79, 0.12)',
          neutral: '#FAAD14',
          neutralBg: 'rgba(250, 173, 20, 0.12)'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
