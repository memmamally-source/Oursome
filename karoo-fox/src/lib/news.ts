import type { MarkdownInstance } from 'astro';

export interface NewsFrontmatter {
  title: string;
  date: string;
  summary: string;
}

export type NewsPost = MarkdownInstance<NewsFrontmatter> & { slug: string };

/** All news posts, newest first. Files live in src/content/news/<date>-<slug>.md. */
export function getNews(): NewsPost[] {
  const modules = import.meta.glob<MarkdownInstance<NewsFrontmatter>>('../content/news/*.md', { eager: true });
  return Object.entries(modules)
    .map(([file, mod]) => ({ ...mod, slug: file.split('/').pop()!.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '') }))
    .sort((a, b) => String(b.frontmatter.date).localeCompare(String(a.frontmatter.date)));
}

export const isoDate = (d: string | Date) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
