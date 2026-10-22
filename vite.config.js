import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['TMBD_TOKEN', 'TMBD_KEY', 'TMB_TOKEN', 'TMB_KEY'])
  return {
    plugins: [react()],
    // These aliases are public browser credentials, just like VITE_TMDB_*.
    // Expose only the requested names rather than the entire process environment.
    define: {
      'import.meta.env.TMBD_TOKEN': JSON.stringify(env.TMBD_TOKEN || ''),
      'import.meta.env.TMBD_KEY': JSON.stringify(env.TMBD_KEY || ''),
      'import.meta.env.TMB_TOKEN': JSON.stringify(env.TMB_TOKEN || ''),
      'import.meta.env.TMB_KEY': JSON.stringify(env.TMB_KEY || ''),
    },
  }
})
