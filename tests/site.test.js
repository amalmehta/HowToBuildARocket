import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { SOURCES } from '../js/data.js';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const scripts = readdirSync(new URL('js/', root)).map((f) => readFileSync(new URL(`js/${f}`, root), 'utf8')).join('\n');

test('every #id the scripts look up exists in index.html', () => {
  // Template lookups like `#chart-${key}` end in "-" here; they're checked below.
  const wanted = new Set([...scripts.matchAll(/(?:\$\(['"`]#|getElementById\(['"])([\w-]+)/g)].map((m) => m[1]).filter((id) => !id.endsWith('-')));
  for (const key of ['dev', 'kg', 'flight', 'dv']) wanted.add(`chart-${key}`);
  for (const id of wanted) assert.ok(ids.has(id), `missing #${id}`);
  assert.ok(wanted.size > 20);
});

test('every local file the page references exists', () => {
  const refs = [...html.matchAll(/\s(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
  for (const r of refs) assert.ok(existsSync(new URL(r, root)), `missing ${r}`);
});

test('every source key used on the page is defined', () => {
  const used = [...html.matchAll(/data-src="(\w+)"/g)].map((m) => m[1]);
  for (const k of used) assert.ok(SOURCES[k], `unknown source ${k}`);
});

test('nav links point to sections', () => {
  const nav = html.match(/<nav\b[^>]*aria-label="Sections"[\s\S]*?<\/nav>/)[0];
  const targets = [...nav.matchAll(/href="#([\w-]+)"/g)].map((m) => m[1]);
  assert.ok(targets.length >= 6);
  for (const id of targets) assert.ok(ids.has(id), `nav → #${id}`);
});

test('README and docs only link to files that exist', () => {
  const docs = ['README.md', ...readdirSync(new URL('docs/', root)).filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`)];
  for (const doc of docs) {
    const text = readFileSync(new URL(doc, root), 'utf8');
    const base = new URL(doc, root);
    for (const [, link] of text.matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+)/g)) {
      assert.ok(existsSync(new URL(link, base)), `${doc} → ${link}`);
    }
  }
});

test('the 404 page and share image exist', () => {
  assert.ok(existsSync(new URL('404.html', root)));
  const og = html.match(/property="og:image" content="([^"]+)"/)[1];
  assert.match(og, /^https:\/\//);
  assert.ok(existsSync(new URL(og.split('/').pop(), root)), 'share image file is missing');
});
