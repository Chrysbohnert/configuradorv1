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
    // Expor variáveis de ambiente para o cliente
    'process.env': process.env
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
        // Chunk splitting para melhor performance
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          pdf: ['jspdf', 'html2canvas', 'qrcode'],
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
    host: true,
    open: true,
    
    // Configurações de proxy (para futuras APIs)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
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
      '@contexts': resolve(__dirname, 'src/contexts'),
      '@data': resolve(__dirname, 'src/data'),
    },
  },
  
  // Configurações de CSS
  css: {
    // Minificação de CSS
    postcss: {
      plugins: [
        // Adicionar autoprefixer se necessário
        // require('autoprefixer'),
      ],
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
  
  // Configurações de esbuild
  esbuild: {
    // Remover console.log em produção
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
})
