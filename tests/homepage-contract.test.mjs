import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const homepagePath = new URL('../src/pages/index.astro', import.meta.url);

async function homepageSource() {
  return readFile(homepagePath, 'utf8').catch(() => '');
}

test('homepage presents one chronological article list without internal taxonomy', async () => {
  const source = await homepageSource();

  assert.notEqual(source, '', 'src/pages/index.astro must exist');
  assert.equal(
    (source.match(/<ol\s+class="article-list"/g) ?? []).length,
    1,
    'homepage must contain exactly one article list',
  );
  assert.doesNotMatch(source, />\s*projects\s*</i);
  assert.doesNotMatch(source, /future note/i);
  assert.doesNotMatch(source, /working notes/i);
});

test('homepage tells a new visitor what the publication is before listing entries', async () => {
  const source = await homepageSource();

  const introduction = source.indexOf('Software systems, built and explained.');
  const articleList = source.indexOf('<ol class="article-list"');

  assert.ok(introduction >= 0, 'homepage needs a plain publication introduction');
  assert.ok(articleList > introduction, 'the explanation must precede the article list');
});
