import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

async function renderer() {
  try {
    return await import('../scripts/render-diagrams.mjs');
  } catch (error) {
    assert.fail(`diagram renderer must exist: ${error.message}`);
  }
}

const validD2 = `# @title Request flow
# @description A request travels from the CLI to the daemon.
direction: right
cli: CLI
daemon: daemon
cli -> daemon
`;

test('D2 diagrams compile with ELK to responsive accessible SVG', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'syntropic-diagram-'));
  const input = path.join(temp, 'flow.d2');
  const output = path.join(temp, 'flow.svg');
  await writeFile(input, validD2);

  try {
    const { renderDiagram } = await renderer();
    await renderDiagram(input, output);
    const svg = await readFile(output, 'utf8');

    const rootSvg = svg.match(/^<svg[^>]*>/)?.[0] ?? '';
    assert.match(rootSvg, /viewBox=/);
    assert.doesNotMatch(rootSvg, /\swidth=/);
    assert.doesNotMatch(rootSvg, /\sheight=/);
    assert.match(rootSvg, /role="img"/);
    assert.match(svg, /<title id="diagram-title">Request flow<\/title>/);
    assert.match(svg, /<desc id="diagram-description">A request travels from the CLI to the daemon\.<\/desc>/);
    assert.match(svg, /aria-labelledby="diagram-title diagram-description"/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('batch rendering mirrors D2 paths into the public media directory', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'syntropic-diagrams-'));
  const sourceDir = path.join(temp, 'source');
  const outputDir = path.join(temp, 'output');
  await mkdir(path.join(sourceDir, 'animesh'), { recursive: true });
  await writeFile(path.join(sourceDir, 'animesh', 'architecture.d2'), validD2);

  try {
    const { renderAllDiagrams } = await renderer();
    const count = await renderAllDiagrams({
      sourceDir: pathToFileURL(`${sourceDir}/`),
      outputDir: pathToFileURL(`${outputDir}/`),
    });
    assert.equal(count, 1);
    const svg = await readFile(path.join(outputDir, 'animesh', 'architecture.svg'), 'utf8');
    assert.match(svg, /<svg/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('diagram metadata is mandatory', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'syntropic-diagram-'));
  const input = path.join(temp, 'bad.d2');
  const output = path.join(temp, 'bad.svg');
  await writeFile(input, 'a -> b\n');

  try {
    const { renderDiagram } = await renderer();
    await assert.rejects(() => renderDiagram(input, output), /@title.*@description/i);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
