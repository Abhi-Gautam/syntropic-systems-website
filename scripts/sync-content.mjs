import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderDiagram } from './render-diagrams.mjs';

const websiteRoot = fileURLToPath(new URL('../', import.meta.url));

async function pathExists(target) {
  try {
    await readFile(target);
    return true;
  } catch (error) {
    if (error.code === 'EISDIR') return true;
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function syncAssets(sourceRoot, outputRoot) {
  await mkdir(outputRoot, { recursive: true });
  const entries = await readdir(sourceRoot, { recursive: true, withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const input = path.join(entry.parentPath, entry.name);
    const relative = path.relative(sourceRoot, input);
    if (entry.name.endsWith('.dot')) {
      throw new Error(`Graphviz sources are not supported: ${input}. Use D2.`);
    }
    if (entry.name.endsWith('.d2')) {
      await renderDiagram(input, path.join(outputRoot, relative.replace(/\.d2$/, '.svg')));
      continue;
    }
    const output = path.join(outputRoot, relative);
    await mkdir(path.dirname(output), { recursive: true });
    await cp(input, output);
  }
}

export async function syncProject(project, {
  generatedRoot = path.join(websiteRoot, 'src/generated'),
  mediaRoot = path.join(websiteRoot, 'public/media'),
} = {}) {
  const repository = project.repository;
  const articlePath = path.join(repository, project.article);
  if (!(await pathExists(articlePath))) {
    throw new Error(`${project.id}: missing canonical article at ${articlePath}`);
  }

  await mkdir(generatedRoot, { recursive: true });
  const article = await readFile(articlePath, 'utf8');
  await writeFile(path.join(generatedRoot, `${project.id}.md`), article);

  const projectMedia = path.join(mediaRoot, project.id);
  await rm(projectMedia, { recursive: true, force: true });
  await syncAssets(path.join(repository, project.assets), projectMedia);

  return { id: project.id, article: articlePath, media: projectMedia };
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
