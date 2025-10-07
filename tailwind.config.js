module.exports = {
  darkMode: 'class', // use class strategy so we can toggle dark mode via document.documentElement
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // primary green brand color
        brand: {
          DEFAULT: '#10B981', // emerald-500
          600: '#059669',
          700: '#047857'
        }
      }
    },
  },
  plugins: [],
}
