import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

/*
 * Articles are synchronized from their canonical project repositories into
 * src/generated/ by scripts/sync-content.mjs. This collection is the single
 * reader of that directory: pages, the homepage list, and the feed all query
 * it instead of restating article metadata.
 *
 * The schema is a build gate. Frontmatter that a project repository gets wrong
 * fails here, naming the file and field, rather than rendering as undefined.
 */
const writing = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/generated' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    published: z.date(),
    project: z.string().min(1),
    repository: z.url(),
    sourceCommit: z.string().min(7),
    // Project repositories may also ship an editorial status and their own
    // `date`. Declared so neither is silently stripped; `published` remains
    // the field the site orders and displays.
    status: z.enum(['draft', 'published']).default('published'),
    date: z.date().optional(),
  }),
});

export const collections = { writing };
