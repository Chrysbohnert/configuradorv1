// vite.config.js
import { defineConfig } from "file:///C:/Users/Chrystian/Downloads/configuradorv1/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Chrystian/Downloads/configuradorv1/node_modules/@vitejs/plugin-react/dist/index.js";
import { resolve } from "path";
var __vite_injected_original_dirname = "C:\\Users\\Chrystian\\Downloads\\configuradorv1";
var vite_config_default = defineConfig({
  plugins: [react()],
  // Configuração de variáveis de ambiente
  define: {
    // Variáveis globais
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify((/* @__PURE__ */ new Date()).toISOString())
  },
  // Configurações de build
  build: {
    // Otimizações de build
    target: "es2015",
    minify: "terser",
    sourcemap: false,
    // Configurações de rollup
    rollupOptions: {
      output: {
        // Chunk splitting para melhor performance
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          pdf: ["jspdf", "html2canvas", "qrcode"]
        },
        // Nomes de arquivos otimizados
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]"
      }
    },
    // Configurações de terser
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  // Configurações de servidor de desenvolvimento
  server: {
    port: 5173,
    host: true,
    open: true
  },
  // Configurações de preview
  preview: {
    port: 4173,
    host: true
  },
  // Resolução de módulos
  resolve: {
    alias: {
      "@": resolve(__vite_injected_original_dirname, "src"),
      "@components": resolve(__vite_injected_original_dirname, "src/components"),
      "@pages": resolve(__vite_injected_original_dirname, "src/pages"),
      "@utils": resolve(__vite_injected_original_dirname, "src/utils"),
      "@styles": resolve(__vite_injected_original_dirname, "src/styles"),
      "@config": resolve(__vite_injected_original_dirname, "src/config")
    }
  },
  // Configurações de otimização
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "jspdf",
      "html2canvas",
      "qrcode"
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxDaHJ5c3RpYW5cXFxcRG93bmxvYWRzXFxcXGNvbmZpZ3VyYWRvcnYxXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxDaHJ5c3RpYW5cXFxcRG93bmxvYWRzXFxcXGNvbmZpZ3VyYWRvcnYxXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9DaHJ5c3RpYW4vRG93bmxvYWRzL2NvbmZpZ3VyYWRvcnYxL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJ1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICBcbiAgLy8gQ29uZmlndXJhXHUwMEU3XHUwMEUzbyBkZSB2YXJpXHUwMEUxdmVpcyBkZSBhbWJpZW50ZVxuICBkZWZpbmU6IHtcbiAgICAvLyBWYXJpXHUwMEUxdmVpcyBnbG9iYWlzXG4gICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5ucG1fcGFja2FnZV92ZXJzaW9uKSxcbiAgICBfX0JVSUxEX1RJTUVfXzogSlNPTi5zdHJpbmdpZnkobmV3IERhdGUoKS50b0lTT1N0cmluZygpKSxcbiAgfSxcbiAgXG4gIC8vIENvbmZpZ3VyYVx1MDBFN1x1MDBGNWVzIGRlIGJ1aWxkXG4gIGJ1aWxkOiB7XG4gICAgLy8gT3RpbWl6YVx1MDBFN1x1MDBGNWVzIGRlIGJ1aWxkXG4gICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICBtaW5pZnk6ICd0ZXJzZXInLFxuICAgIHNvdXJjZW1hcDogZmFsc2UsXG4gICAgXG4gICAgLy8gQ29uZmlndXJhXHUwMEU3XHUwMEY1ZXMgZGUgcm9sbHVwXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIC8vIENodW5rIHNwbGl0dGluZyBwYXJhIG1lbGhvciBwZXJmb3JtYW5jZVxuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICB2ZW5kb3I6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICAgICAgcm91dGVyOiBbJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICBwZGY6IFsnanNwZGYnLCAnaHRtbDJjYW52YXMnLCAncXJjb2RlJ10sXG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICAvLyBOb21lcyBkZSBhcnF1aXZvcyBvdGltaXphZG9zXG4gICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL2pzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2Fzc2V0cy9qcy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6ICdhc3NldHMvW2V4dF0vW25hbWVdLVtoYXNoXS5bZXh0XScsXG4gICAgICB9LFxuICAgIH0sXG4gICAgXG4gICAgLy8gQ29uZmlndXJhXHUwMEU3XHUwMEY1ZXMgZGUgdGVyc2VyXG4gICAgdGVyc2VyT3B0aW9uczoge1xuICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLFxuICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBcbiAgLy8gQ29uZmlndXJhXHUwMEU3XHUwMEY1ZXMgZGUgc2Vydmlkb3IgZGUgZGVzZW52b2x2aW1lbnRvXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgaG9zdDogdHJ1ZSxcbiAgICBvcGVuOiB0cnVlLFxuICB9LFxuICBcbiAgLy8gQ29uZmlndXJhXHUwMEU3XHUwMEY1ZXMgZGUgcHJldmlld1xuICBwcmV2aWV3OiB7XG4gICAgcG9ydDogNDE3MyxcbiAgICBob3N0OiB0cnVlLFxuICB9LFxuICBcbiAgLy8gUmVzb2x1XHUwMEU3XHUwMEUzbyBkZSBtXHUwMEYzZHVsb3NcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjJyksXG4gICAgICAnQGNvbXBvbmVudHMnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9jb21wb25lbnRzJyksXG4gICAgICAnQHBhZ2VzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvcGFnZXMnKSxcbiAgICAgICdAdXRpbHMnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy91dGlscycpLFxuICAgICAgJ0BzdHlsZXMnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9zdHlsZXMnKSxcbiAgICAgICdAY29uZmlnJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvY29uZmlnJyksXG4gICAgfSxcbiAgfSxcbiAgXG4gIC8vIENvbmZpZ3VyYVx1MDBFN1x1MDBGNWVzIGRlIG90aW1pemFcdTAwRTdcdTAwRTNvXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFtcbiAgICAgICdyZWFjdCcsXG4gICAgICAncmVhY3QtZG9tJyxcbiAgICAgICdyZWFjdC1yb3V0ZXItZG9tJyxcbiAgICAgICdqc3BkZicsXG4gICAgICAnaHRtbDJjYW52YXMnLFxuICAgICAgJ3FyY29kZScsXG4gICAgXSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZULFNBQVMsb0JBQW9CO0FBQzFWLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7QUFGeEIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBO0FBQUEsRUFHakIsUUFBUTtBQUFBO0FBQUEsSUFFTixpQkFBaUIsS0FBSyxVQUFVLFFBQVEsSUFBSSxtQkFBbUI7QUFBQSxJQUMvRCxnQkFBZ0IsS0FBSyxXQUFVLG9CQUFJLEtBQUssR0FBRSxZQUFZLENBQUM7QUFBQSxFQUN6RDtBQUFBO0FBQUEsRUFHQSxPQUFPO0FBQUE7QUFBQSxJQUVMLFFBQVE7QUFBQSxJQUNSLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQTtBQUFBLElBR1gsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBO0FBQUEsUUFFTixjQUFjO0FBQUEsVUFDWixRQUFRLENBQUMsU0FBUyxXQUFXO0FBQUEsVUFDN0IsUUFBUSxDQUFDLGtCQUFrQjtBQUFBLFVBQzNCLEtBQUssQ0FBQyxTQUFTLGVBQWUsUUFBUTtBQUFBLFFBQ3hDO0FBQUE7QUFBQSxRQUdBLGdCQUFnQjtBQUFBLFFBQ2hCLGdCQUFnQjtBQUFBLFFBQ2hCLGdCQUFnQjtBQUFBLE1BQ2xCO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFHQSxlQUFlO0FBQUEsTUFDYixVQUFVO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxlQUFlO0FBQUEsTUFDakI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFHQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBO0FBQUEsRUFHQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBO0FBQUEsRUFHQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLE1BQzdCLGVBQWUsUUFBUSxrQ0FBVyxnQkFBZ0I7QUFBQSxNQUNsRCxVQUFVLFFBQVEsa0NBQVcsV0FBVztBQUFBLE1BQ3hDLFVBQVUsUUFBUSxrQ0FBVyxXQUFXO0FBQUEsTUFDeEMsV0FBVyxRQUFRLGtDQUFXLFlBQVk7QUFBQSxNQUMxQyxXQUFXLFFBQVEsa0NBQVcsWUFBWTtBQUFBLElBQzVDO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFHQSxjQUFjO0FBQUEsSUFDWixTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
