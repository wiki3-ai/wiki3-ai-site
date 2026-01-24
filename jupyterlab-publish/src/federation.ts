/**
 * Module Federation wrapper for the jupyterlab-publish extension
 * This allows the extension to be loaded by JupyterLite
 */

import { injectStyles, createPublishButton, handlePublish } from './index';

// Type-safe window access
const win = window as any;

console.log('[wiki3-publish/federation] Setting up Module Federation container');

const scope = '@wiki3-ai/jupyterlab-publish';

// Helper to get a module from the shared scope
async function importShared(pkg: string): Promise<any> {
  const sharedScope = container.sharedScope;
  if (!sharedScope) {
    throw new Error(`[wiki3-publish] Shared scope not initialized for ${pkg}`);
  }

  const versions = sharedScope[pkg];
  if (!versions) {
    throw new Error(`[wiki3-publish] Shared module ${pkg} not found in shared scope`);
  }

  const versionKeys = Object.keys(versions);
  if (versionKeys.length === 0) {
    throw new Error(`[wiki3-publish] No versions available for ${pkg}`);
  }

  // Pick the first available version
  const version = versions[versionKeys[0]];
  const factory = version?.get;

  if (typeof factory !== 'function') {
    throw new Error(`[wiki3-publish] Module ${pkg} has no factory function`);
  }

  // Factory might return a Promise or the module directly
  let result = factory();

  // If it's a promise, await it
  if (result && typeof result.then === 'function') {
    result = await result;
  }

  // If result is a function (Webpack module wrapper), call it to get the actual exports
  if (typeof result === 'function') {
    result = result();
  }

  console.log(`[wiki3-publish] Loaded ${pkg}`);
  return result;
}

// Module Federation container API
const container = {
  init: (sharedScope: any) => {
    console.log('[wiki3-publish/federation] init() called');
    if (!win._JUPYTERLAB) {
      win._JUPYTERLAB = {};
    }
    container.sharedScope = sharedScope;
    return Promise.resolve();
  },

  get: async (module: string) => {
    console.log(`[wiki3-publish/federation] get() called for module: ${module}`);

    if (module === './extension') {
      return async () => {
        console.log('[wiki3-publish/federation] Loading dependencies from shared scope');

        // Import dependencies from shared scope
        const notebookModule = await importShared('@jupyterlab/notebook');
        const { INotebookTracker } = notebookModule;

        console.log('[wiki3-publish/federation] Dependencies loaded, creating plugin');

        // Inject styles
        injectStyles();

        // Create the plugin
        const plugin: any = {
          id: '@wiki3-ai/jupyterlab-publish:plugin',
          description: 'Publish JupyterLite notebooks directly to GitHub',
          autoStart: true,
          requires: [INotebookTracker],
          activate: (_app: any, tracker: any) => {
            console.log('[wiki3-publish] Extension activated');

            // Add publish button to each notebook's toolbar
            tracker.widgetAdded.connect((_: any, panel: any) => {
              console.log('[wiki3-publish] Notebook panel added, inserting publish button');

              // Create button with handlers that access the notebook
              const btn = createPublishButton(() => {
                handlePublish(
                  () => {
                    // Get notebook content
                    const model = panel.model;
                    if (!model) {
                      throw new Error('No notebook model');
                    }
                    return JSON.stringify(model.toJSON(), null, 2);
                  },
                  () => {
                    // Get notebook filename
                    const path = panel.context.path;
                    return path.split('/').pop() || 'notebook.ipynb';
                  }
                ).catch(err => {
                  console.error('[wiki3-publish] Publish error:', err);
                  alert(`Publish failed: ${err.message}`);
                });
              });

              // Wrap in a Widget for the toolbar
              const widget = new (class extends (win.lumino?.Widget || class {
                node: HTMLElement;
                constructor() { this.node = document.createElement('div'); }
              }) {
                constructor() {
                  super();
                  this.node.appendChild(btn);
                }
              })();

              // Insert near the end of toolbar
              try {
                panel.toolbar.insertItem(10, 'publish-github', widget);
              } catch (e) {
                // Fallback: add to end
                panel.toolbar.addItem('publish-github', widget);
              }
            });
          }
        };

        return plugin;
      };
    }

    throw new Error(`[wiki3-publish] Unknown module: ${module}`);
  },

  sharedScope: null as any
};

// Export container for module federation
export default container;

// Make container available globally for JupyterLite
if (typeof win !== 'undefined') {
  win[scope] = container;
}
