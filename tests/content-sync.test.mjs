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

const article = '---\ntitle: Test article\n---\n\nBody.\n';
const accessibleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" role="img" aria-labelledby="title description">
  <title id="title">Architecture</title>
  <desc id="description">A static project-owned diagram.</desc>
  <rect width="100" height="60"/>
</svg>
`;

function project(repository) {
  return {
    id: 'test-project',
    repository,
    rawRoot: 'https://raw.githubusercontent.com/example/project',
    ref: 'feat/public-docs',
    article: 'docs/public/article.md',
    assets: ['docs/public/assets/architecture.svg'],
  };
}

test('local project files are copied without a network request', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'syntropic-local-content-'));
  const repository = path.join(temp, 'project');
  const generated = path.join(temp, 'generated');
  const media = path.join(temp, 'media');
  await mkdir(path.join(repository, 'docs/public/assets'), { recursive: true });
  await writeFile(path.join(repository, 'docs/public/article.md'), article);
  await writeFile(path.join(repository, 'docs/public/assets/architecture.svg'), accessibleSvg);

  try {
    const { syncProject } = await importer();
    await syncProject(project(repository), {
      generatedRoot: generated,
      mediaRoot: media,
      fetcher: async () => assert.fail('local sync must not fetch'),
    });

    assert.equal(await readFile(path.join(generated, 'test-project.md'), 'utf8'), article);
    assert.equal(await readFile(path.join(media, 'test-project', 'architecture.svg'), 'utf8'), accessibleSvg);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('missing local files are downloaded from the configured raw Git ref', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'syntropic-remote-content-'));
  const generated = path.join(temp, 'generated');
  const media = path.join(temp, 'media');
  const requested = [];
  const responses = new Map([
    ['https://raw.githubusercontent.com/example/project/feat%2Fpublic-docs/docs/public/article.md', article],
    ['https://raw.githubusercontent.com/example/project/feat%2Fpublic-docs/docs/public/assets/architecture.svg', accessibleSvg],
  ]);
  const fetcher = async (url) => {
    requested.push(url);
    const body = responses.get(url);
    return { ok: body !== undefined, status: body === undefined ? 404 : 200, text: async () => body ?? '' };
  };

  try {
    const { syncProject } = await importer();
    await syncProject(project(path.join(temp, 'missing-project')), {
      generatedRoot: generated,
      mediaRoot: media,
      fetcher,
    });

    assert.deepEqual(requested, [...responses.keys()]);
    assert.equal(await readFile(path.join(generated, 'test-project.md'), 'utf8'), article);
    assert.equal(await readFile(path.join(media, 'test-project', 'architecture.svg'), 'utf8'), accessibleSvg);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('failed raw downloads stop the build', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'syntropic-failed-content-'));
  try {
    const { syncProject } = await importer();
    await assert.rejects(
      () => syncProject(project(path.join(temp, 'missing-project')), {
        generatedRoot: path.join(temp, 'generated'),
        mediaRoot: path.join(temp, 'media'),
        fetcher: async () => ({ ok: false, status: 404, text: async () => '' }),
      }),
      /HTTP 404/,
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
