import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderCard, type CardInput } from '../../lib/og-card';

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);

export async function getStaticPaths() {
  const articles = await getCollection('writing');

  return [
    {
      params: { slug: 'default' },
      props: { card: { title: 'Software systems, built and explained.' } satisfies CardInput },
    },
    ...articles.map((article) => ({
      params: { slug: article.id },
      props: {
        card: {
          title: article.data.title,
          meta: `${article.data.project} — ${formatDate(article.data.published)}`,
        } satisfies CardInput,
      },
    })),
  ];
}

export const GET: APIRoute = async ({ props }) =>
  new Response(await renderCard(props.card as CardInput), {
    headers: { 'Content-Type': 'image/png' },
  });
