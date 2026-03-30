import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const litegraphRoot = path.resolve(__dirname, 'litegraph')
const bridgeRoot = path.resolve(__dirname, 'src/comfy-bridge')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@\/lib\/litegraph\/(.*)/,
        replacement: `${litegraphRoot.replace(/\\/g, '/')}/$1`
      },
      { find: 'vue', replacement: path.join(bridgeRoot, 'vue-shim.ts') },
      { find: /^@\//, replacement: `${bridgeRoot.replace(/\\/g, '/')}/` }
    ]
  },
  server: {
    port: 7000,
    fs: {
      allow: [__dirname, litegraphRoot, bridgeRoot, path.resolve(__dirname, 'src')]
    }
  }
})
