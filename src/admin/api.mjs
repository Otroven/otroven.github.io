/**
 * 로컬 어드민 API. dev 서버 미들웨어로만 올라가므로 배포 산출물에는 없습니다.
 *
 * 인증이 없는 대신 아래를 전제로 합니다:
 *  - Vite dev 서버는 기본적으로 localhost에만 바인딩됩니다.
 *  - 모든 파일 경로는 src/content/<컬렉션> 안으로 해석되는지 검증합니다.
 *  - git 명령은 셸 없이 인자 배열로 실행하고, src/content 경로만 스테이징합니다.
 */

import { execFile } from 'node:child_process';
import { readFile, writeFile, readdir, unlink, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { parseFrontmatter, serialize } from './frontmatter.mjs';

const run = promisify(execFile);

export const COLLECTIONS = ['essays', 'tech', 'library'];

/** 슬러그 = 파일 이름. 한글은 허용하되 경로 구분자와 숨김 파일은 막습니다. */
const SLUG_RE = /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u;

/** 업로드 허용 확장자 */
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg']);
const MAX_UPLOAD = 10 * 1024 * 1024;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function collectionDir(root, collection) {
  if (!COLLECTIONS.includes(collection)) {
    throw new HttpError(400, `알 수 없는 컬렉션: ${collection}`);
  }
  return path.join(root, 'src', 'content', collection);
}

/** 슬러그 검증 + 디렉터리 탈출 방지. */
function postPath(root, collection, slug) {
  const dir = collectionDir(root, collection);
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    throw new HttpError(400, `슬러그에 쓸 수 없는 문자가 있습니다: ${slug}`);
  }
  const file = path.resolve(dir, `${slug}.md`);
  if (path.dirname(file) !== path.resolve(dir)) {
    throw new HttpError(400, '잘못된 경로입니다.');
  }
  return file;
}

async function listCollection(root, collection) {
  const dir = collectionDir(root, collection);
  let names = [];
  try {
    names = await readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }

  const posts = [];
  for (const name of names) {
    if (!/\.mdx?$/.test(name)) continue;
    const raw = await readFile(path.join(dir, name), 'utf8');
    const { data } = parseFrontmatter(raw);
    posts.push({
      collection,
      slug: name.replace(/\.mdx?$/, ''),
      title: data.title ?? name,
      pubDate: data.pubDate ?? '',
      draft: data.draft === true,
    });
  }
  return posts.sort((a, b) => String(b.pubDate).localeCompare(String(a.pubDate)));
}

async function git(root, args) {
  try {
    const { stdout } = await run('git', args, { cwd: root, maxBuffer: 1024 * 1024 });
    return stdout.trim();
  } catch (err) {
    throw new HttpError(500, (err.stderr || err.message || '').trim() || 'git 명령이 실패했습니다.');
  }
}

/** src/content 아래의 변경사항만 본다 — 작업 중인 다른 파일은 건드리지 않습니다. */
async function contentStatus(root) {
  const [branch, porcelain] = await Promise.all([
    git(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
    // core.quotePath=false: 한글 파일명이 8진수 escape로 나오지 않게 합니다.
    git(root, ['-c', 'core.quotePath=false', 'status', '--porcelain', '--', 'src/content']),
  ]);
  const files = porcelain
    .split('\n')
    .filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2).trim(), file: line.slice(3) }));
  return { branch, files };
}

const routes = {
  'GET /posts': async ({ root }) => {
    const all = await Promise.all(COLLECTIONS.map((c) => listCollection(root, c)));
    return { posts: all.flat() };
  },

  'GET /post': async ({ root, query }) => {
    const file = postPath(root, query.get('collection'), query.get('slug'));
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') throw new HttpError(404, '글을 찾을 수 없습니다.');
      throw err;
    }
    return parseFrontmatter(raw);
  },

  'PUT /post': async ({ root, body }) => {
    const { collection, slug, originalSlug, data, body: markdown } = body;
    const file = postPath(root, collection, slug);

    if (!data?.title) throw new HttpError(400, '제목은 비워둘 수 없습니다.');
    if (!data?.pubDate) throw new HttpError(400, '날짜는 비워둘 수 없습니다.');

    // 슬러그를 바꾼 경우: 새 파일을 쓴 뒤 예전 파일을 지웁니다.
    const renamed = originalSlug && originalSlug !== slug;
    if (!renamed) {
      // 새 글인데 같은 이름이 이미 있으면 덮어쓰지 않고 막습니다.
      const isNew = !originalSlug;
      if (isNew) {
        const exists = await readFile(file, 'utf8').then(() => true, () => false);
        if (exists) throw new HttpError(409, `이미 같은 슬러그의 글이 있습니다: ${slug}`);
      }
    }

    await writeFile(file, serialize(collection, data, markdown), 'utf8');
    if (renamed) {
      await unlink(postPath(root, collection, originalSlug)).catch(() => {});
    }
    return { ok: true, slug, path: path.relative(root, file) };
  },

  'DELETE /post': async ({ root, query }) => {
    const file = postPath(root, query.get('collection'), query.get('slug'));
    await unlink(file);
    return { ok: true };
  },

  'POST /upload': async ({ root, query, raw }) => {
    const collection = query.get('collection');
    const dir = path.join(collectionDir(root, collection), 'images');

    if (!raw?.length) throw new HttpError(400, '빈 파일입니다.');
    if (raw.length > MAX_UPLOAD) {
      throw new HttpError(413, `파일이 너무 큽니다 (최대 ${MAX_UPLOAD / 1024 / 1024}MB).`);
    }

    const ext = (query.get('name') || '').split('.').pop()?.toLowerCase() ?? '';
    if (!IMAGE_EXT.has(ext)) {
      throw new HttpError(400, `이미지 파일만 올릴 수 있습니다 (${[...IMAGE_EXT].join(', ')}).`);
    }

    // 파일 이름 정리: 한글은 남기고 경로가 될 수 있는 문자는 전부 치환합니다.
    const base =
      (query.get('name') || 'image')
        .replace(/\.[^.]*$/, '')
        .replace(/[^\p{L}\p{N}._-]+/gu, '-')
        .replace(/^[.-]+|[.-]+$/g, '')
        .slice(0, 60) || 'image';

    await mkdir(dir, { recursive: true });

    // 같은 이름이 있으면 -2, -3 … 으로 비켜 씁니다.
    let name = `${base}.${ext}`;
    for (let n = 2; ; n += 1) {
      const candidate = path.resolve(dir, name);
      if (path.dirname(candidate) !== path.resolve(dir)) {
        throw new HttpError(400, '잘못된 파일 이름입니다.');
      }
      const taken = await access(candidate).then(() => true, () => false);
      if (!taken) break;
      name = `${base}-${n}.${ext}`;
    }

    await writeFile(path.join(dir, name), raw);
    return {
      // 상대경로로 넣어야 Astro 이미지 파이프라인이 최적화합니다.
      markdown: `./images/${name}`,
      file: path.relative(root, path.join(dir, name)),
    };
  },

  'GET /git': async ({ root }) => contentStatus(root),

  'POST /git': async ({ root, body }) => {
    const { files } = await contentStatus(root);
    if (files.length === 0) throw new HttpError(409, '커밋할 변경사항이 없습니다.');

    const message = String(body?.message || '').trim();
    if (!message) throw new HttpError(400, '커밋 메시지를 입력해주세요.');

    await git(root, ['add', '--', 'src/content']);
    await git(root, ['commit', '-m', message, '--', 'src/content']);
    const pushed = await git(root, ['push']);
    return { ok: true, committed: files.length, output: pushed || '푸시 완료' };
  },
};

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_UPLOAD * 2) {
        reject(new HttpError(413, '파일이 너무 큽니다.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('error', reject);
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('error', reject);
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new HttpError(400, '요청 본문이 올바른 JSON이 아닙니다.'));
      }
    });
  });
}

/** Vite dev 서버 미들웨어. `/api/admin` 접두사는 이미 제거된 상태로 들어옵니다. */
export function createAdminApi(root) {
  return async function adminApi(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const key = `${req.method} ${url.pathname.replace(/\/$/, '') || '/'}`;
    const handler = routes[key];

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    if (!handler) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: `알 수 없는 엔드포인트: ${key}` }));
      return;
    }

    try {
      const isUpload = url.pathname.replace(/\/$/, '') === '/upload';
      const noBody = req.method === 'GET' || req.method === 'DELETE';
      const raw = isUpload ? await readRaw(req) : null;
      const body = isUpload || noBody ? {} : await readJson(req);
      const result = await handler({ root, query: url.searchParams, body, raw });
      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (err) {
      res.statusCode = err.status ?? 500;
      res.end(JSON.stringify({ error: err.message ?? String(err) }));
      if (!err.status) console.error('[admin]', err);
    }
  };
}
