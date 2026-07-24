/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#0a0a0f',
          900: '#0f0f16',
          850: '#141420',
          800: '#1a1a26',
          700: '#26263a',
        },
        brand: {
          400: '#8b7cf6',
          500: '#7c5cf0',
          600: '#6a3ce8',
        },
      },
    },
  },
  plugins: [],
};
