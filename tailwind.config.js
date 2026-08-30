/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fondali: dal nero del canvas WebGL alle superfici sollevate.
        base: {
          900: '#05070c',
          800: '#0a0e17',
          700: '#111827',
        },
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.03)',
          raised: 'rgba(255, 255, 255, 0.05)',
          strong: 'rgba(15, 23, 42, 0.72)',
        },
        edge: {
          DEFAULT: 'rgba(148, 163, 184, 0.12)',
          strong: 'rgba(148, 163, 184, 0.22)',
        },
        /*
         * Testo secondario. Non si usano slate-500 e slate-600: misurati
         * contro base-900 danno 4,23:1 e 2,66:1, cioe sotto la soglia WCAG AA
         * di 4,5:1 per il testo normale. Questi due la superano mantenendo la
         * gerarchia. `src/index.contrast.test.ts` li ricontrolla a ogni run.
         */
        muted: '#8291a6',
        subtle: '#74839a',
        accent: {
          DEFAULT: '#38bdf8',
          soft: '#0ea5e9',
          dim: 'rgba(56, 189, 248, 0.12)',
          glow: 'rgba(56, 189, 248, 0.28)',
        },
      },
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-l': 'env(safe-area-inset-left)',
        'safe-r': 'env(safe-area-inset-right)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px -12px rgba(0, 0, 0, 0.6)',
        glow: '0 0 0 1px rgba(56, 189, 248, 0.25), 0 8px 32px -8px rgba(56, 189, 248, 0.35)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 240ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
        'slide-in': 'slide-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
