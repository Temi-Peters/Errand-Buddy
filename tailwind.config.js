/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Fixed brand colours
        primary:   '#7C3AED',
        secondary: '#10B981',
        // Adaptive colours — RGB triplet format so Tailwind opacity modifiers work
        ink:          'rgb(var(--color-ink) / <alpha-value>)',
        muted:        'rgb(var(--color-muted) / <alpha-value>)',
        surface:      'rgb(var(--color-surface) / <alpha-value>)',
        'surface-hi': 'rgb(var(--color-surface-hi) / <alpha-value>)',
        page:         'rgb(var(--color-page) / <alpha-value>)',
      },
      boxShadow: {
        soft: '0 4px 24px rgba(0,0,0,0.07)',
        lift: '0 12px 48px rgba(0,0,0,0.14)',
        glow: '0 0 0 1px rgba(124,58,237,0.15), 0 8px 32px rgba(124,58,237,0.25)',
      },
    },
  },
  plugins: [],
};
