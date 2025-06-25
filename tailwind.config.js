/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          600: '#4F6DF5',
          700: '#3B5BDB',
          800: '#3A52C4', // Added darker blue for gradients
          50: '#F0F4FF',
          100: '#E0ECFF'
        },
        gray: {
          50: '#FAFAFA',
          600: '#4B4E57'
        },
        black: '#000000',
        white: '#FFFFFF'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
};