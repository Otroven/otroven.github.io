/**
 * 프론트매터 파싱 / 직렬화.
 *
 * 범용 YAML 파서가 아니라 content.config.ts 스키마가 실제로 쓰는 부분집합만
 * 다룹니다 — 문자열, 숫자, 불린, YYYY-MM-DD 날짜, 문자열 배열.
 * 읽을 때는 flow(`['a', 'b']`)와 block(`- a`) 배열 모두 받고,
 * 쓸 때는 기존 콘텐츠 파일과 같은 스타일(단일 인용부호 + flow 배열)로 맞춥니다.
 */

/** 컬렉션별 키 순서. 저장할 때마다 같은 순서로 나오게 고정합니다. */
const KEY_ORDER = {
  essays: ['title', 'description', 'pubDate', 'updatedDate', 'tags', 'draft'],
  tech: ['title', 'description', 'pubDate', 'updatedDate', 'tags', 'draft'],
  library: ['title', 'author', 'status', 'rating', 'pubDate', 'tags', 'draft'],
};

/** 인용부호 없이 그대로 쓰는 키 (YYYY-MM-DD) */
const DATE_KEYS = new Set(['pubDate', 'updatedDate']);

function parseScalar(raw) {
  const s = raw.trim();
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\(["\\])/g, '$1');
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

/** `['a', 'b']` — 인용부호 안의 쉼표는 구분자로 보지 않습니다. */
function parseFlowArray(raw) {
  const inner = raw.trim().slice(1, -1);
  const items = [];
  let cur = '';
  let quote = null;

  for (const ch of inner) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      cur += ch;
      quote = ch;
    } else if (ch === ',') {
      items.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) items.push(cur);

  return items.map(parseScalar).filter((v) => v !== '');
}

/**
 * 원본 마크다운을 { data, body }로 분리합니다.
 * 프론트매터가 없으면 data는 빈 객체, body는 원본 전체입니다.
 */
export function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(raw);
  if (!match) return { data: {}, body: raw };

  const data = {};
  let pendingListKey = null;

  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && pendingListKey) {
      data[pendingListKey].push(parseScalar(item[1]));
      continue;
    }

    const kv = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/.exec(line);
    if (!kv) continue;

    const [, key, rest] = kv;
    const value = rest.trim();
    pendingListKey = null;

    if (value === '') {
      // 다음 줄부터 block 배열이 올 자리. 값이 비어있는 키는 이 스키마에 없습니다.
      data[key] = [];
      pendingListKey = key;
    } else if (value.startsWith('[')) {
      data[key] = parseFlowArray(value);
    } else {
      data[key] = parseScalar(value);
    }
  }

  // 구분자 뒤의 빈 줄 한 줄은 프론트매터 패딩이므로 본문에서 제외합니다.
  return { data, body: raw.slice(match[0].length).replace(/^\r?\n/, '') };
}

function quote(value) {
  const s = String(value);
  // 단일 인용부호가 없으면 기존 파일과 같은 스타일로, 있으면 이중 인용부호로.
  if (!s.includes("'") && !s.includes('\n')) return `'${s}'`;
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

function emit(key, value) {
  if (DATE_KEYS.has(key)) return `${key}: ${String(value).slice(0, 10)}`;
  if (typeof value === 'boolean' || typeof value === 'number') return `${key}: ${value}`;
  if (Array.isArray(value)) return `${key}: [${value.map(quote).join(', ')}]`;
  return `${key}: ${quote(value)}`;
}

/** 값이 "없는 것과 같은지" — 빈 문자열, 빈 배열, false인 draft는 파일에 쓰지 않습니다. */
function isOmittable(key, value) {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (key === 'draft' && value === false) return true;
  return false;
}

/** { data, body } → 파일에 쓸 마크다운 문자열 */
export function serialize(collection, data, body) {
  const order = KEY_ORDER[collection] ?? Object.keys(data);
  const keys = [...order, ...Object.keys(data).filter((k) => !order.includes(k))];

  const lines = [];
  for (const key of keys) {
    if (!(key in data)) continue;
    if (isOmittable(key, data[key])) continue;
    lines.push(emit(key, data[key]));
  }

  const text = String(body ?? '').replace(/^\s*\n/, '').replace(/\s*$/, '');
  return `---\n${lines.join('\n')}\n---\n\n${text}\n`;
}
