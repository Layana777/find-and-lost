import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    // الاختبارات تعمل دائمًا على المخزن التجريبي، فلا تتغيّر نتائجها بحسب ما
    // في ملف .env عند كل مطوّر ولا تلمس مشروع Supabase حقيقيًا.
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
})
