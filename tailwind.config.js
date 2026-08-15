/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wood-dark': '#8B3A3A',
        'wood-light': '#C97B63',
        'gold': '#B8860B',
        'ink': '#2C1810',
        'rice': '#F5E6C8',
        'cinnabar': '#C41E3A',
        'bamboo': '#4A6741',
      },
      fontFamily: {
        'xingkai': ['STXingkai', '华文行楷', 'cursive'],
        'kaiti': ['KaiTi', '楷体', 'serif'],
        'lishu': ['STLiti', '隶书', 'serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'ink-drop': 'inkDrop 0.6s ease-out',
        'piece-place': 'piecePlace 0.3s ease-out',
        'flash-red': 'flashRed 0.8s ease-in-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        inkDrop: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        piecePlace: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        flashRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(196, 30, 58, 0)' },
          '50%': { boxShadow: '0 0 30px 10px rgba(196, 30, 58, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}