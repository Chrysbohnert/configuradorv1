import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Configuração de variáveis de ambiente
  define: {
    // Variáveis globais
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  
  // Configurações de build
  build: {
    // Otimizações de build
    target: 'es2015',
    minify: 'terser',
    sourcemap: false,
    
    // Configurações de rollup
    rollupOptions: {
      output: {
        // ⚡ Chunk splitting otimizado para melhor performance
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // Router
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          // Supabase
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          // PDF (carregado apenas quando necessário)
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('qrcode')) {
            return 'vendor-pdf';
          }
          // Date utilities
          if (id.includes('date-fns') || id.includes('dayjs')) {
            return 'vendor-date';
          }
          // Lucide icons
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          // Outros node_modules
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
        },
        
        // Nomes de arquivos otimizados
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    
    // Configurações de terser
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  
  // Configurações de servidor de desenvolvimento
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    open: true,
  },
  
  // Configurações de preview
  preview: {
    port: 4173,
    host: true,
  },
  
  // Resolução de módulos
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@styles': resolve(__dirname, 'src/styles'),
      '@config': resolve(__dirname, 'src/config'),
    },
  },
  
  // Configurações de otimização
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'jspdf',
      'html2canvas',
      'qrcode',
    ],
  },
})
