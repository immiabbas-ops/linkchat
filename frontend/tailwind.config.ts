import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#00a884',
          light: '#25d366',
          dark: '#008069',
        },
        wa: {
          header: '#202c33',
          teal: '#008069',
          green: '#25d366',
          bubbleOut: '#005c4b',
          bubbleIn: '#202c33',
          chat: '#0b141a',
        },
      },
    },
  },
  plugins: [],
};

export default config;
