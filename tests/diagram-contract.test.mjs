import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

async function validator() {
  try {
    return await import('../scripts/validate-svg.mjs');
  } catch (error) {
    assert.fail(`SVG validator must exist: ${error.message}`);
  }
}

const validSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="title description">
  <title id="title">Animesh architecture</title>
  <desc id="description">One daemon owns state and effects.</desc>
</svg>`;

test('responsive accessible static SVG passes the publication contract', async () => {
  const { validateSvg } = await validator();
  assert.doesNotThrow(() => validateSvg(validSvg, 'architecture.svg'));
});

test('fixed root dimensions are rejected because the page owns responsive sizing', async () => {
  const { validateSvg } = await validator();
  assert.throws(
    () => validateSvg(validSvg.replace('<svg ', '<svg width="1200" height="700" '), 'architecture.svg'),
    /root width or height/i,
  );
});

test('title, description, and image semantics are mandatory', async () => {
  const { validateSvg } = await validator();
  assert.throws(() => validateSvg('<svg viewBox="0 0 10 10"></svg>', 'bad.svg'), /role.*title.*desc/i);
});

test('diagram source languages are rejected instead of compiled', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'syntropic-diagram-source-'));
  try {
    const { validateAssetPath } = await validator();
    await writeFile(path.join(temp, 'architecture.d2'), 'a -> b');
    assert.throws(() => validateAssetPath(path.join(temp, 'architecture.d2')), /static SVG/i);
    assert.throws(() => validateAssetPath(path.join(temp, 'architecture.dot')), /static SVG/i);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
