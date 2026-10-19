import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import { COLLECTION_META, type CollectionKind } from '../lib/collections';

export async function GET(context: APIContext) {
  const kinds: CollectionKind[] = ['essays', 'tech'];

  const items = (
    await Promise.all(
      kinds.map(async (kind) => {
        const entries = await getCollection(kind, ({ data }) => !data.draft);
        return entries.map((entry) => ({
          title: `[${COLLECTION_META[kind].label}] ${entry.data.title}`,
          description: entry.data.description ?? '',
          pubDate: entry.data.pubDate,
          link: `${COLLECTION_META[kind].path}/${entry.id}/`,
        }));
      })
    )
  ).flat();

  items.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site ?? 'https://otroven.github.io',
    items,
  });
}
