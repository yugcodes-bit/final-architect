import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This exposes the app to your Wi-Fi
    port: 5173  // Keeps the port standard
  }
})