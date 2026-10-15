import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://minime.cloud',

  // Estático por padrão: cada ferramenta vira um HTML indexável, com o texto
  // de SEO presente no documento servido e não injetado por JavaScript.
  output: 'static',

  integrations: [react()],

  vite: {
    plugins: [tailwind()],
  },
});
