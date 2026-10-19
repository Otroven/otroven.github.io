/**
 * `pnpm write` — 글쓰기 시작용.
 *
 * 개발 서버를 띄우고(이미 떠 있으면 그대로 둠) 브라우저로 어드민을 엽니다.
 * `astro dev --background` 는 멱등해서, 이미 떠 있으면 그 주소를 알려주고 끝납니다.
 */

import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);
const require = createRequire(import.meta.url);

/** 설치된 astro 의 실행 파일 경로. PATH 에 의존하지 않습니다. */
function astroBin() {
  const pkgPath = require.resolve('astro/package.json');
  const { bin } = require('astro/package.json');
  const entry = typeof bin === 'string' ? bin : bin.astro;
  return path.resolve(path.dirname(pkgPath), entry);
}

/** 플랫폼별 브라우저 열기 명령 */
function opener(url) {
  if (process.platform === 'darwin') return ['open', [url]];
  if (process.platform === 'win32') return ['cmd', ['/c', 'start', '', url]];
  return ['xdg-open', [url]];
}

async function main() {
  const { stdout } = await run(process.execPath, [astroBin(), 'dev', '--background'], {
    cwd: process.cwd(),
  });

  const url = stdout.match(/https?:\/\/localhost:\d+/)?.[0];
  if (!url) {
    console.error('개발 서버 주소를 찾지 못했습니다. 아래 출력을 확인해주세요:\n');
    console.error(stdout.trim());
    process.exit(1);
  }

  const admin = `${url}/admin`;
  console.log(`\n  사이트    ${url}/`);
  console.log(`  글쓰기    ${admin}\n`);
  console.log('  서버 끄기  pnpm dev:stop');
  console.log('  로그      pnpm dev:logs\n');

  const [cmd, args] = opener(admin);
  try {
    await run(cmd, args);
  } catch {
    // 브라우저를 못 열어도 주소는 위에 찍혔으니 치명적이지 않습니다.
    console.log(`  (브라우저를 자동으로 열지 못했습니다 — 위 주소를 직접 열어주세요)\n`);
  }
}

main().catch((err) => {
  console.error(err.stderr?.trim() || err.message);
  process.exit(1);
});
