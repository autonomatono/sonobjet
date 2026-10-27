import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function mediapipeWasmPlugin(): Plugin {
  const wasmSrcDir = path.resolve(
    process.cwd(),
    'node_modules/@mediapipe/tasks-vision/wasm',
  );

  return {
    name: 'sonobjet-mediapipe-wasm',
    configureServer(server) {
      server.middlewares.use('/mediapipe-wasm', (req, res, next) => {
        const cleanUrl = (req.url ?? '/').split('?')[0].replace(/^\/+/, '');
        const filePath = path.join(wasmSrcDir, cleanUrl);
        if (cleanUrl && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          if (filePath.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
          } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
          }
          fs.createReadStream(filePath).pipe(res);
          return;
        }
        next();
      });
    },
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve(process.cwd(), 'dist');
      const targetDir = path.join(outDir, 'mediapipe-wasm');
      if (!fs.existsSync(wasmSrcDir)) return;
      fs.mkdirSync(targetDir, { recursive: true });
      for (const entry of fs.readdirSync(wasmSrcDir)) {
        fs.copyFileSync(path.join(wasmSrcDir, entry), path.join(targetDir, entry));
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [mediapipeWasmPlugin()],
  define: {
    __BUILD_SHA__: JSON.stringify(process.env.VITE_GIT_SHA ?? 'dev-local'),
    __BUILD_BRANCH__: JSON.stringify(
      process.env.VITE_GIT_BRANCH ?? 'arena/86769aaf-sonobjet',
    ),
    __BUILD_TIME__: JSON.stringify(
      process.env.VITE_BUILD_TIME ?? new Date().toISOString(),
    ),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 2600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('@mediapipe/tasks-vision')) return 'mediapipe';
          return undefined;
        },
      },
    },
  },
});
