import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function xml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function metadata(source) {
  const title = source.match(/^\s*#\s*@title\s+(.+)$/m)?.[1]?.trim();
  const description = source.match(/^\s*#\s*@description\s+(.+)$/m)?.[1]?.trim();
  if (!title || !description) {
    throw new Error('Every diagram requires # @title and # @description metadata.');
  }
  return { title, description };
}

function makeAccessible(svg, { title, description }) {
  return svg.replace(/<svg\b([^>]*)>/, (_match, attributes) => {
    const responsiveAttributes = attributes
      .replace(/\s(?:width|height)="[^"]*"/g, '')
      .replace(/\s(?:role|aria-labelledby)="[^"]*"/g, '');

    return `<svg${responsiveAttributes} role="img" aria-labelledby="diagram-title diagram-description">\n<title id="diagram-title">${xml(title)}</title>\n<desc id="diagram-description">${xml(description)}</desc>`;
  });
}

export async function renderDiagram(input, output) {
  const source = await readFile(input, 'utf8');
  const details = metadata(source);
  await mkdir(path.dirname(output), { recursive: true });
  await execFileAsync('d2', ['validate', input]);
  await execFileAsync('d2', [
    '--layout', 'elk',
    '--theme', '0',
    '--pad', '24',
    '--no-xml-tag',
    '--omit-version',
    input,
    output,
  ]);
  const generated = await readFile(output, 'utf8');
  await writeFile(output, makeAccessible(generated, details));
}

export async function renderAllDiagrams({
  sourceDir = new URL('../src/diagrams/', import.meta.url),
  outputDir = new URL('../public/media/', import.meta.url),
} = {}) {
  const sourcePath = fileURLToPath(sourceDir);
  const outputPath = fileURLToPath(outputDir);
  const entries = await readdir(sourcePath, { recursive: true, withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });

  const diagrams = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.d2'));
  for (const entry of diagrams) {
    const input = path.join(entry.parentPath, entry.name);
    const relative = path.relative(sourcePath, input).replace(/\.d2$/, '.svg');
    await renderDiagram(input, path.join(outputPath, relative));
  }
  return diagrams.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const count = await renderAllDiagrams();
  console.log(`Rendered ${count} D2 diagram${count === 1 ? '' : 's'}.`);
}
