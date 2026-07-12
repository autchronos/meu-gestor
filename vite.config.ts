/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Sem globals: cada teste importa describe/it/expect de 'vitest'.
    // Globais de teste vazariam para o type-check de src/ tambem.
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
})
