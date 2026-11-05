import rss from '@astrojs/rss';
import { SITE } from '../consts';
import { getPosts } from '../lib/posts';

export async function GET(context) {
  const posts = await getPosts();
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: new URL(base + '/', context.site),
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      categories: p.data.tags,
      link: `${base}/posts/${p.id}/`,
    })),
    customData: '<language>zh-cn</language>',
  });
}
