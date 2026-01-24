/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/ui/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        figma: {
          bg: '#1e1e1e',
          'bg-secondary': '#2c2c2c',
          'bg-tertiary': '#353535',
          border: '#3c3c3c',
          'border-hover': '#4c4c4c',
          text: '#ffffff',
          'text-secondary': '#b3b3b3',
          'text-tertiary': '#666666',
          primary: '#18a0fb',
          'primary-hover': '#0d8de5',
          'primary-active': '#0a7acc',
          success: '#1bc47d',
          error: '#f24822',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Courier New', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '1.4'],
        xs: ['11px', '1.4'],
        sm: ['13px', '1.4'],
      },
    },
  },
  plugins: [],
};
