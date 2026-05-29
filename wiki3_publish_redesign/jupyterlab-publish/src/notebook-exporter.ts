import type { NotebookPanel } from '@jupyterlab/notebook';

export interface ExportedNotebook {
  notebookJson: string;
  html: string;
  slug: string;
  title: string;
}

function slugify(name: string): string {
  return name
    .replace(/\.ipynb$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'notebook';
}

/**
 * Save the notebook and export HTML entirely in-browser.
 * This implementation prefers a Pyodide nbconvert path because it produces a
 * publishable string rather than only triggering a browser download.
 */
export async function exportNotebookForPublish(panel: NotebookPanel): Promise<ExportedNotebook> {
  await panel.context.save();

  const notebookJson = JSON.stringify(panel.context.model.toJSON(), null, 2);
  const title = panel.title.label || panel.context.path.split('/').pop() || 'Notebook';
  const slug = slugify(title);

  const html = await exportHtmlViaPyodide(notebookJson, slug);

  return {
    notebookJson,
    html,
    slug,
    title: title.replace(/\.ipynb$/i, '')
  };
}

async function exportHtmlViaPyodide(notebookJson: string, slug: string): Promise<string> {
  const win = window as typeof window & {
    loadPyodide?: (config?: unknown) => Promise<any>;
    __wiki3Pyodide?: any;
  };

  if (!win.loadPyodide && !win.__wiki3Pyodide) {
    throw new Error('Pyodide runtime is not available. Ensure the JupyterLite export stack is included in the site build.');
  }

  if (!win.__wiki3Pyodide) {
    win.__wiki3Pyodide = await win.loadPyodide?.();
  }
  const pyodide = win.__wiki3Pyodide;

  // The package list may need tuning for your exact JupyterLite build.
  await pyodide.loadPackage(['micropip']);
  await pyodide.runPythonAsync(`
import json
import io
import sys

from nbformat import reads
from nbconvert import HTMLExporter
from traitlets.config import Config

NOTEBOOK_JSON = ${JSON.stringify(notebookJson)}
SLUG = ${JSON.stringify(slug)}

nb = reads(NOTEBOOK_JSON, as_version=4)
c = Config()
c.HTMLExporter.exclude_input_prompt = True
c.HTMLExporter.exclude_output_prompt = True
exporter = HTMLExporter(config=c)
body, resources = exporter.from_notebook_node(nb)
body
  `);

  const html = pyodide.globals.get('body');
  if (typeof html !== 'string' || !html.trim()) {
    throw new Error('Notebook export returned empty HTML');
  }
  return html;
}
