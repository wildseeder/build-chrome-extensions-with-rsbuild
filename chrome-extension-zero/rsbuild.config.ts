import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// const isProd = process.env.NODE_ENV === 'production';
const port = 3000;

export default defineConfig({
  dev: {
    client: {
      port,
      host: '0.0.0.0',
      protocol: 'ws',
    },
    writeToDisk: true,
  },
  server: {
    port,
    strictPort: true,
    publicDir: {
      copyOnBuild: false,
    },
  },
  output: {
    filenameHash: false,
  },
  environments: {
    web: {
      plugins: [pluginReact()],
      source: {
        entry: {
          main: './src/main/index.tsx',
          components: './src/components/index.tsx',
        },
      },
      html: {
        title: '',
      },
      output: {
        target: 'web',
        copy: [{ from: './public' }],
      },
    },
    webworker: {
      plugins: [pluginReact()],
      source: {
        entry: {
          background: './src/background/index.ts',
          contentScript: './src/contentScript/index.tsx',
        },
      },
      output: {
        target: 'web-worker',
      },
    },
  },
});
