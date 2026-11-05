// Helpers shared by pages: base-aware URLs, post queries, dates, reading time.
import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefix a site path ("/archive/") with the deploy base ("/Blog"). */
export function url(path = '/'): string {
  return BASE + (path.startsWith('/') ? path : '/' + path);
}

/** Published posts, newest first. Drafts are shown only in `astro dev`. */
export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('posts', (p) => import.meta.env.DEV || !p.data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function postUrl(post: Post): string {
  return url(`/posts/${post.id}/`);
}

export function tagUrl(tag: string): string {
  return url(`/tags/${encodeURIComponent(tag)}/`);
}

/** "2026 年 11 月 5 日" (dates in frontmatter are read as UTC). */
export function formatDate(d: Date): string {
  return `${d.getUTCFullYear()} 年 ${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const ROMAN: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export function roman(n: number): string {
  let out = '';
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out;
}

/** Rough reading stats: CJK characters at ~400/min, other words at ~200/min. */
export function readingStats(body = '') {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]/g, ' ');
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) || []).length;
  const words = (text.replace(/[㐀-鿿豈-﫿]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  const minutes = Math.max(1, Math.round(cjk / 400 + words / 200));
  return { chars: cjk + words, minutes };
}

/** Tag -> number of posts, sorted by count then name. */
export function tagCounts(posts: Post[]): [string, number][] {
  const m = new Map<string, number>();
  for (const p of posts) for (const t of p.data.tags) m.set(t, (m.get(t) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans'));
}
