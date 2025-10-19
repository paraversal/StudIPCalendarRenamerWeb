import { defineConfig } from 'vite';

export default defineConfig({
  base: '/StudIPCalendarRenamerWeb/',
  optimizeDeps: {
    include: ['ical.js']
  }
});
