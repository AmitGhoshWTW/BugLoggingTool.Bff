import { defineConfig }                             from "vite";
import react                                        from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname }                         from 'path';
import { fileURLToPath }                            from 'url';

// ESM-safe __dirname (required — package.json has "type":"module")
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Single source of truth ────────────────────────────────────────────────────
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));
const BUILD_ID   = `${pkg.version}-${Date.now()}`;
const CACHE_KEY  = `blt-cache-${BUILD_ID}`;   // injected into sw.js at build time

export default defineConfig({
  plugins: [
    react(),

    // ── Build-time SW version injection + version.json generator ──────────────
    {
      name: 'blt-build-assets',
      writeBundle() {
        // VITE_OUT_DIR is set by build-bff.ps1 to point to BLT.Bff/wwwroot
        // Falls back to 'dist' for standalone React builds
        const distDir = process.env.VITE_OUT_DIR
          ? resolve(process.env.VITE_OUT_DIR)
          : resolve(__dirname, 'dist');

        // Ensure output dir exists (wwwroot may not be created by vite when VITE_OUT_DIR is set)
        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true });
        }

        // 1. Copy sw.js → dist, then inject CACHE_KEY into placeholder
        const swSrc  = resolve(__dirname, 'public/sw.js');
        const swDest = resolve(distDir, 'sw.js');
        if (existsSync(swSrc)) {
          let swContent = readFileSync(swSrc, 'utf8');
          // swContent = swContent.replace('__SW_CACHE_VERSION__', CACHE_KEY);
          swContent = swContent.replaceAll('__SW_CACHE_VERSION__', CACHE_KEY);
          writeFileSync(swDest, swContent);
          console.log(`\n✅ sw.js injected with cache key: ${CACHE_KEY}\n`);
        } else {
          console.error('\n❌ ERROR: public/sw.js not found!\n');
        }

        // 2. Generate version.json (overwrites any static copy)
        const versionData = {
          version:     pkg.version,
          buildId:     BUILD_ID,
          deployedAt:  new Date().toISOString(),
          forceReload: false,           // ops team flips to true for critical updates
          releaseNotes: []              // fill in manually or via CI
        };
        writeFileSync(
          resolve(distDir, 'version.json'),
          JSON.stringify(versionData, null, 2)
        );
        console.log(`✅ version.json generated: v${pkg.version} (${BUILD_ID})\n`);
      }
    }
  ],

  define: {
    // ── Inject build-time constants into the React app ─────────────────────
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__:    JSON.stringify(BUILD_ID),
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },

  resolve: {
    alias: { pouchdb: 'pouchdb-browser' }
  },

  optimizeDeps: {
    include: ['pouchdb-browser', 'pouchdb-find', 'pouchdb-upsert'],
    esbuildOptions: { target: 'esnext' },
    force: true
  },

  base: '/',    // BFF: served from root by .NET Kestrel
               // For Electron builds use: VITE_BASE='./' in electron build script

  build: {
    target: 'esnext',
    assetsDir: 'assets',
    outDir: process.env.VITE_OUT_DIR || '../wwwroot',  // outputs to BugLoggingTool.Bff/wwwroot/
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // ── Content-hashed filenames — old cached files can never collide ──
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/pouchdb/, /node_modules/]
    }
  },

  publicDir: 'public',
  server: {
    port: 5173,
    strictPort: true
  }
});
