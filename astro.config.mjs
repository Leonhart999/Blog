// Astro config for the Leonhart Manor blog, deployed to GitHub Pages at
// https://leonhart999.github.io/Blog/ (project site, so every URL lives under /Blog).
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://leonhart999.github.io',
  base: '/Blog',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    // remark/rehype pipeline so posts can use $inline$ and $$display$$ math.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: false }]],
    }),
    shikiConfig: {
      themes: { light: 'gruvbox-light-soft', dark: 'gruvbox-dark-medium' },
      defaultColor: false,
      wrap: false,
    },
  },
});
