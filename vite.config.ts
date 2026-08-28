import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // I test di logica pura girano in node; quelli sui componenti dichiarano
    // `@vitest-environment jsdom` nel proprio docblock.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
