/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mindlock: {
          50: '#eef8ff',
          100: '#d9efff',
          500: '#3b82f6',
          700: '#1d4ed8',
          900: '#0f172a',
        },
      },
    },
  },
  plugins: [],
};
