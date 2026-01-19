/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Billboard-inspired professional palette
        mmc: {
          bg: '#ffffff',
          surface: '#f8f9fa',
          border: '#e5e7eb',
          primary: '#111827',
          secondary: '#6b7280',
          accent: '#dc2626', // Billboard red
        },
        tier: {
          laureate: '#b8860b', // Dark gold - prestigious
          authority: '#7c3aed', // Purple
          master: '#2563eb', // Blue
          diplomate: '#059669', // Green
        },
        type: {
          scholar: '#1d4ed8',
          maestro: '#dc2626',
          pioneer: '#ea580c',
          guardian: '#059669',
          hexagon: '#7c3aed',
        },
        rank: {
          gold: '#b8860b',
          silver: '#6b7280',
          bronze: '#b45309',
        }
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
      boxShadow: {
        'chart': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'chart-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      }
    },
  },
  plugins: [],
};
