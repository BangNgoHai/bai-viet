/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(52, 211, 153, .35), 0 0 30px -6px rgba(16, 185, 129, .55)',
      },
    },
  },
  plugins: [],
};
