import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  globalCss: {
    'html, body': {
      margin: 0,
      padding: 0,
      minHeight: '100vh',
    },
    '#root': {
      minHeight: '100vh',
    },
  },
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#EEF2FF' },
          100: { value: '#E0E7FF' },
          200: { value: '#C7D2FE' },
          300: { value: '#A5B4FC' },
          400: { value: '#818CF8' },
          500: { value: '#6366F1' },
          600: { value: '#4F46E5' },
          700: { value: '#4338CA' },
          800: { value: '#3730A3' },
          900: { value: '#312E81' },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
