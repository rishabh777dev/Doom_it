/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1E60FF',
          dark: '#0B0F19',
          card: '#FFFFFF',
          accent: '#FF3366',
          amber: '#F59E0B',
          soft: '#F8FAFC'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 10px 30px -5px rgba(0, 0, 0, 0.05), 0 5px 15px -5px rgba(0, 0, 0, 0.03)',
        'float': '0 20px 35px -10px rgba(0, 0, 0, 0.15)',
        'solid': '3px 3px 0px #0F172A',
        'solid-lg': '5px 5px 0px #0F172A',
      }
    },
  },
  plugins: [],
}
