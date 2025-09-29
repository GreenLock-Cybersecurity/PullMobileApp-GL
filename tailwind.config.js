/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        foreground: '#ffffff',
        muted: '#6b7280',
        'muted-foreground': '#9ca3af',
        border: '#374151',
        primary: '#10b981',
        'primary-foreground': '#ffffff',
        secondary: '#1f2937',
        'secondary-foreground': '#f9fafb',
        destructive: '#ef4444',
        'destructive-foreground': '#ffffff',
      },
    },
  },
  plugins: [],
};
