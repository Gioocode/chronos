import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // The public deployment repository is named "chronos-site".
  base: '/chronos-site/',
  plugins: [react()],
})
