import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateAssetPath, validateSvg } from './validate-svg.mjs';

const websiteRoot = fileURLToPath(new URL('../', import.meta.url));

function rawUrl(project, relativePath) {
  const root = project.rawRoot.replace(/\/$/, '');
  const ref = encodeURIComponent(project.ref);
  const file = relativePath.split('/').map(encodeURIComponent).join('/');
  return `${root}/${ref}/${file}`;
}

async function readProjectFile(project, relativePath, fetcher) {
  const localPath = path.join(project.repository, relativePath);
  try {
    return { content: await readFile(localPath, 'utf8'), source: localPath };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (!project.rawRoot || !project.ref) {
    throw new Error(`${project.id}: missing local file ${localPath} and no raw GitHub source is configured.`);
  }

  const url = rawUrl(project, relativePath);
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`${project.id}: HTTP ${response.status} while downloading ${url}`);
  }
  return { content: await response.text(), source: url };
}

export async function syncProject(project, {
  generatedRoot = path.join(websiteRoot, 'src/generated'),
  mediaRoot = path.join(websiteRoot, 'public/media'),
  fetcher = globalThis.fetch,
} = {}) {
  const article = await readProjectFile(project, project.article, fetcher);
  await mkdir(generatedRoot, { recursive: true });
  await writeFile(path.join(generatedRoot, `${project.id}.md`), article.content);

  const projectMedia = path.join(mediaRoot, project.id);
  await rm(projectMedia, { recursive: true, force: true });
  await mkdir(projectMedia, { recursive: true });

  const sources = [article.source];
  for (const assetPath of project.assets) {
    validateAssetPath(assetPath);
    const asset = await readProjectFile(project, assetPath, fetcher);
    if (assetPath.toLowerCase().endsWith('.svg')) {
      validateSvg(asset.content, asset.source);
    }
    await writeFile(path.join(projectMedia, path.basename(assetPath)), asset.content);
    sources.push(asset.source);
  }

  return { id: project.id, sources };
}

export async function syncAllProjects(configPath = path.join(websiteRoot, 'content-sources.json')) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const results = [];
  for (const project of config.projects) {
    results.push(await syncProject(project));
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = await syncAllProjects();
  console.log(`Synchronized ${results.length} project${results.length === 1 ? '' : 's'}.`);
}
