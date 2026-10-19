/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        concrete: {
          900: '#1A1D1E', // fond
          800: '#24282A', // carte
          700: '#2C3133', // carte surélevée
          600: '#363B3D', // bordure
        },
        chalk: '#EDEAE2',
        muted: '#9CA6A3',
        steel: '#6E9BC7',
        ember: '#C1502E',
        moss: '#7A9A63',
        locked: '#4A4E4F',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '18px',
        soft: '12px',
      },
      boxShadow: {
        halo: '0 0 0 4px rgba(110, 155, 199, 0.18)',
        lift: '0 8px 24px -12px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        'pulse-halo': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(110,155,199,0.35)' },
          '50%': { boxShadow: '0 0 0 8px rgba(110,155,199,0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-halo': 'pulse-halo 2.4s ease-out infinite',
        'slide-up': 'slide-up 220ms ease-out both',
      },
    },
  },
  plugins: [],
}
