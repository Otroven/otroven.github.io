/**
 * 로컬 어드민 인테그레이션.
 *
 * command === 'dev' 일 때만 /admin 라우트와 /api/admin 미들웨어를 붙입니다.
 * 따라서 `astro build` 산출물(dist/)과 공개 사이트에는 어드민이 존재하지 않습니다.
 */

import { fileURLToPath } from 'node:url';
import { createAdminApi } from './api.mjs';

export default function localAdmin() {
  let root;

  return {
    name: 'local-admin',
    hooks: {
      'astro:config:setup': ({ command, config, injectRoute, logger }) => {
        if (command !== 'dev') return;
        root = fileURLToPath(config.root);
        injectRoute({
          pattern: '/admin',
          entrypoint: './src/admin/index.astro',
        });
        logger.info('어드민: http://localhost:4321/admin (dev 전용)');
      },

      'astro:server:setup': ({ server }) => {
        if (!root) return;
        server.middlewares.use('/api/admin', createAdminApi(root));
      },
    },
  };
}
