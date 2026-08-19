import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Relative asset paths, so a `dist/` build can be dropped in any subfolder
  // of a host (Netlify, GitHub Pages, a shared drive) without rewriting URLs.
  // It still needs to be *served* — Chrome blocks ES modules over file://,
  // so `npm run preview` rather than double-clicking dist/index.html.
  base: './',
  build: {
    // The horse photos are big; keep them as real files instead of base64.
    assetsInlineLimit: 0,
  },
})
