import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#e6f4f1',
          100: '#c2e3db',
          500: '#1e9b80',
          600: '#137a63', // Main Accent Color from Reference
          700: '#0f5f4d',
          800: '#0b4639',
        },
        surface: {
          bg: '#f4f7f6', // Soft neutral canvas
          card: '#ffffff',
          border: '#e2e8f0',
        },
      },
      boxShadow: {
        card: '0px 4px 20px rgba(0, 0, 0, 0.03)',
        floating: '0px 8px 30px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;