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
        primary:      '#1C1917',
        secondary:    '#10B981',
        ink:          'rgb(var(--color-ink) / <alpha-value>)',
        muted:        'rgb(var(--color-muted) / <alpha-value>)',
        surface:      'rgb(var(--color-surface) / <alpha-value>)',
        'surface-hi': 'rgb(var(--color-surface-hi) / <alpha-value>)',
        page:         'rgb(var(--color-page) / <alpha-value>)',
      },
      boxShadow: {
        soft:   '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        lift:   '0 4px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
        glow:   '0 0 0 3px rgba(28,25,23,0.08), 0 4px 20px rgba(28,25,23,0.10)',
        'glow-dark': '0 0 0 3px rgba(245,245,247,0.10), 0 4px 20px rgba(245,245,247,0.08)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      transitionDuration: {
        250: '250ms',
      },
    },
  },
  plugins: [],
};
