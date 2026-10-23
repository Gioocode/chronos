import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages serves this project under /chronos/.
  base: '/chronos/',
  plugins: [react()],
})
