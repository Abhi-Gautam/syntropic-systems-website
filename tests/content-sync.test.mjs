import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

async function importer() {
  try {
    return await import('../scripts/sync-content.mjs');
  } catch (error) {
    assert.fail(`content importer must exist: ${error.message}`);
  }
}

test('project-owned Markdown and D2 assets become website build inputs', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'syntropic-content-'));
  const repository = path.join(temp, 'project');
  const generated = path.join(temp, 'generated');
  const media = path.join(temp, 'media');
  await mkdir(path.join(repository, 'docs/public/assets'), { recursive: true });
  await writeFile(path.join(repository, 'docs/public/article.md'), '---\ntitle: Test article\n---\n\nBody.\n');
  await writeFile(
    path.join(repository, 'docs/public/assets/architecture.d2'),
    '# @title Architecture\n# @description A generated test diagram.\na -> b\n',
  );

  try {
    const { syncProject } = await importer();
    const result = await syncProject(
      {
        id: 'test-project',
        repository,
        article: 'docs/public/article.md',
        assets: 'docs/public/assets',
      },
      { generatedRoot: generated, mediaRoot: media },
    );

    assert.equal(result.id, 'test-project');
    assert.match(await readFile(path.join(generated, 'test-project.md'), 'utf8'), /Test article/);
    const svg = await readFile(path.join(media, 'test-project', 'architecture.svg'), 'utf8');
    assert.match(svg, /<svg[^>]+viewBox=/);
    assert.match(svg, /role="img"/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
