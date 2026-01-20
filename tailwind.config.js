/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Modern Medical Directory Palette
        mmc: {
          bg: '#f8fafc',
          surface: '#ffffff',
          border: '#e2e8f0',
          primary: '#0f172a',
          secondary: '#64748b',
          muted: '#94a3b8',
          accent: '#0891b2', // Teal/Cyan - trustworthy, medical
          'accent-light': '#ecfeff',
          'accent-dark': '#0e7490',
          success: '#10b981',
          warning: '#f59e0b',
        },
        // Strength colors for gauges
        strength: {
          academic: '#6366f1', // Indigo
          clinical: '#10b981', // Emerald
          career: '#f59e0b',   // Amber
          safety: '#06b6d4',   // Cyan
          activity: '#8b5cf6', // Violet
        },
        // Doctor type colors
        type: {
          scholar: '#6366f1',
          maestro: '#ef4444',
          pioneer: '#f97316',
          guardian: '#10b981',
          hexagon: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 4px 16px -4px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 4px 12px -2px rgba(0, 0, 0, 0.06), 0 8px 24px -4px rgba(0, 0, 0, 0.1)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
