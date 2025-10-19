import { defineConfig } from 'vite';

export default defineConfig({
  base: '/StudIPCalendarRenamerWeb/', 
build: {
    rollupOptions: {
      external: ['ical.js'],
    },
  },
});