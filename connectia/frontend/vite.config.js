import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/apple-touch-icon.png',
        'icons/favicon.png',
        'icons/favicon-32.png',
        'branding/connectyx/connectyx-mark.svg',
        'branding/connectyx/favicon1.png',
      ],
      manifest: {
        id: '/',
        name: 'Connectyx',
        short_name: 'Connectyx',
        description: 'Tu comunidad: información y trámites, fácil.',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#8453C8',
        theme_color: '#8453C8',
        lang: 'es',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        importScripts: ['/push-sw.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkOnly',
          },
        ],
      },      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/branding': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
