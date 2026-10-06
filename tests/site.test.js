import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { SOURCES } from '../js/data.js';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const scripts = readdirSync(new URL('js/', root)).map((f) => readFileSync(new URL(`js/${f}`, root), 'utf8')).join('\n');

test('every #id the scripts look up exists in index.html', () => {
  const wanted = new Set([...scripts.matchAll(/\$\('#([\w-]+)/g)].map((m) => m[1]));
  for (const id of wanted) assert.ok(ids.has(id), `missing #${id}`);
  assert.ok(wanted.size > 20);
});

test('every local file the page references exists', () => {
  const refs = [...html.matchAll(/\s(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
  for (const r of refs) assert.ok(existsSync(new URL(r, root)), `missing ${r}`);
});

test('every source key used on the page is defined', () => {
  const used = [...html.matchAll(/data-src="(\w+)"/g)].map((m) => m[1]);
  const usedInData = [...readFileSync(new URL('js/data.js', root), 'utf8').matchAll(/src: '(\w+)'/g)].map((m) => m[1]);
  for (const k of [...used, ...usedInData]) assert.ok(SOURCES[k], `unknown source ${k}`);
});

test('nav links point to sections', () => {
  const nav = html.match(/<nav class="nav"[\s\S]*?<\/nav>/)[0];
  for (const [, id] of nav.matchAll(/href="#([\w-]+)"/g)) assert.ok(ids.has(id), `nav → #${id}`);
});
