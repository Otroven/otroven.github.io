// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import localAdmin from './src/admin/integration.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://otroven.github.io',
  integrations: [
    expressiveCode({
      themes: ['github-dark', 'github-light'],
      useDarkModeMediaQuery: false,
      themeCssSelector: (theme) => `[data-theme="${theme.type}"]`,
      styleOverrides: {
        borderRadius: '0.5rem',
        codeFontFamily:
          "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
      },
    }),
    sitemap(),
    // dev 서버에서만 /admin 을 띄웁니다. 빌드 산출물에는 포함되지 않습니다.
    localAdmin(),
  ],
});
