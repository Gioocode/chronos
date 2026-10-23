import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // The repository is named "chronos", so project Pages is served under /chronos/.
  base: '/chronos/',
  plugins: [react()],
})
