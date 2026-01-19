/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mmc: {
          primary: '#0f0f1a',
          secondary: '#1a1a2e',
          accent: '#e94560',
        },
        tier: {
          laureate: '#ffd700',
          authority: '#a855f7',
          master: '#3b82f6',
          diplomate: '#22c55e',
        },
        type: {
          scholar: '#3b82f6',
          maestro: '#ef4444',
          pioneer: '#f97316',
          guardian: '#22c55e',
          hexagon: '#a855f7',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
