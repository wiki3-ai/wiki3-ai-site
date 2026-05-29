import type { ExportedNotebook } from './notebook-exporter';

export interface PublishedPageEntry {
  slug: string;
  title: string;
  notebookPath: string;
  htmlPath: string;
  updatedAt: string;
}

export interface PublishBundle {
  files: Array<{ path: string; content: string }>;
  manifest: { pages: PublishedPageEntry[] };
}

function renderIndexHtml(entries: PublishedPageEntry[]): string {
  const list = entries
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(
      entry => `<li><a href="../${entry.htmlPath}">${escapeHtml(entry.title)}</a> <small>${escapeHtml(entry.updatedAt)}</small></li>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>wiki3 published notebooks</title>
  </head>
  <body>
    <main>
      <h1>wiki3 published notebooks</h1>
      <ul>${list}</ul>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPublishBundle(
  exported: ExportedNotebook,
  existingManifest: { pages: PublishedPageEntry[] } | null
): PublishBundle {
  const entry: PublishedPageEntry = {
    slug: exported.slug,
    title: exported.title,
    notebookPath: `notebooks/${exported.slug}.ipynb`,
    htmlPath: `pages/${exported.slug}.html`,
    updatedAt: new Date().toISOString()
  };

  const pages = (existingManifest?.pages ?? []).filter(page => page.slug !== entry.slug);
  pages.push(entry);

  return {
    manifest: { pages },
    files: [
      { path: entry.notebookPath, content: exported.notebookJson },
      { path: entry.htmlPath, content: exported.html },
      { path: 'wiki3/manifest.json', content: JSON.stringify({ pages }, null, 2) },
      { path: 'wiki3/index.html', content: renderIndexHtml(pages) }
    ]
  };
}
