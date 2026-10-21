import { defineConfig } from 'vite';

// Relative paths support /, /repository-name/, and downloaded static hosting.
// Runtime assets always resolve through import.meta.env.BASE_URL.
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 4173, strictPort: true, allowedHosts: ['terminal.local'] },
  build: { target: 'es2022', chunkSizeWarningLimit: 800,
    rolldownOptions: {
      input: { game: 'index.html', connectionTest: 'network-test.html' },
      output: { manualChunks(id) { if(id.includes('/node_modules/three/'))return 'three'; if(id.includes('/node_modules/peerjs/'))return 'peerjs'; } }
    }
  }
});
