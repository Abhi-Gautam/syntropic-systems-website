import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const articles = (await getCollection('writing')).sort(
    (a, b) => b.data.published.getTime() - a.data.published.getTime(),
  );

  return rss({
    title: 'Syntropic Systems',
    description:
      'Abhishek Gautam writes about software systems, engineering projects, and what he learns while building them.',
    site: context.site,
    items: articles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.published,
      link: `/writing/${article.id}/`,
    })),
    customData: '<language>en</language>',
  });
}
