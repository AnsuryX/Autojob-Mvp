import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This shim allows the Gemini SDK to access process.env in the browser
    'process.env': {
      API_KEY: JSON.stringify(process.env.API_KEY || ''),
      SUPABASE_URL: JSON.stringify(process.env.SUPABASE_URL || ''),
      SUPABASE_ANON_KEY: JSON.stringify(process.env.SUPABASE_ANON_KEY || ''),
      SERP_API_KEY: JSON.stringify(process.env.SERP_API_KEY || '')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});