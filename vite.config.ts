import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Define process.env.API_KEY so the code doesn't crash in browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Polyfill process.env to avoid "process is not defined" errors
      'process.env': {}
    }
  }
})