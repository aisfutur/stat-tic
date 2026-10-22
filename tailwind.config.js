/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /**
       * Les couleurs pointent vers des variables CSS définies dans
       * `src/index.css`, une fois pour le thème sombre et une fois pour le
       * thème clair. Le format « canaux RVB » (`26 29 30`) est ce qui permet
       * à Tailwind de garder les modificateurs d'opacité (`bg-steel/20`).
       *
       * Les noms décrivent le rôle, pas la teinte : `concrete-900` est
       * toujours le fond de page et `chalk` toujours la couleur du texte,
       * clairs ou sombres selon le thème.
       */
      colors: {
        concrete: {
          900: 'rgb(var(--c-concrete-900) / <alpha-value>)', // fond
          800: 'rgb(var(--c-concrete-800) / <alpha-value>)', // carte
          700: 'rgb(var(--c-concrete-700) / <alpha-value>)', // carte surélevée
          600: 'rgb(var(--c-concrete-600) / <alpha-value>)', // bordure
        },
        chalk: 'rgb(var(--c-chalk) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        steel: 'rgb(var(--c-steel) / <alpha-value>)',
        ember: 'rgb(var(--c-ember) / <alpha-value>)',
        moss: 'rgb(var(--c-moss) / <alpha-value>)',
        locked: 'rgb(var(--c-locked) / <alpha-value>)',
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
        halo: '0 0 0 4px rgb(var(--c-steel) / 0.18)',
        lift: '0 8px 24px -12px rgb(var(--c-shadow) / 0.6)',
      },
      keyframes: {
        'pulse-halo': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--c-steel) / 0.35)' },
          '50%': { boxShadow: '0 0 0 8px rgb(var(--c-steel) / 0)' },
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
