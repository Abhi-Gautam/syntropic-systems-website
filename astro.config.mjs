import { satteri } from '@astrojs/markdown-satteri';
import { defineConfig } from 'astro/config';
import mediaPlugin from './src/plugins/satteri-media.mjs';

export default defineConfig({
  site: 'https://syntropicsystems.dev',
  output: 'static',
  devToolbar: {
    enabled: false,
  },
  build: {
    format: 'directory',
  },
  markdown: {
    processor: satteri({
      hastPlugins: [mediaPlugin],
    }),
  },
});
