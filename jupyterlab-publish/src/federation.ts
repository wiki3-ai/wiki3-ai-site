/**
 * Module Federation wrapper for the jupyterlab-publish extension
 * This allows the extension to be loaded by JupyterLite
 */

import { injectStyles, handlePublish } from './index';

// Type-safe window access
const win = window as any;

console.log('[wiki3-publish/federation] Setting up Module Federation container');

const scope = '@wiki3-ai/jupyterlab-publish';

// Settings key for localStorage
const SETTINGS_KEY = 'wiki3-publish-settings';

interface PublishSettings {
  defaultRepo?: string;
  defaultOwner?: string;
  lastUsedRepo?: string;
}

function loadSettings(): PublishSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveSettings(settings: PublishSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[wiki3-publish] Could not save settings:', e);
  }
}

// Helper to get a module from the shared scope
async function importShared(pkg: string): Promise<any> {
  const sharedScope = container.sharedScope;
  if (!sharedScope) {
    throw new Error(`[wiki3-publish] Shared scope not initialized for ${pkg}`);
  }

  const versions = sharedScope[pkg];
  if (!versions) {
    console.warn(`[wiki3-publish] Shared module ${pkg} not found in shared scope`);
    return null;
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
        const uiComponents = await importShared('@jupyterlab/ui-components');
        
        const { INotebookTracker } = notebookModule;
        const ToolbarButton = uiComponents?.ToolbarButton;

        console.log('[wiki3-publish/federation] Dependencies loaded, creating plugin');
        console.log('[wiki3-publish/federation] ToolbarButton available:', !!ToolbarButton);

        // Inject styles
        injectStyles();

        // Helper to create publish handler for a notebook panel
        const createPublishHandler = (panel: any) => {
          return () => {
            handlePublish(
              () => {
                const model = panel.model;
                if (!model) {
                  throw new Error('No notebook model');
                }
                return JSON.stringify(model.toJSON(), null, 2);
              },
              () => {
                // Preserve the full path from JupyterLite
                const path = panel.context.path;
                return path || 'notebook.ipynb';
              },
              loadSettings,
              saveSettings
            ).catch(err => {
              console.error('[wiki3-publish] Publish error:', err);
              alert(`Publish failed: ${err.message}`);
            });
          };
        };

        // Create the main plugin
        const plugin: any = {
          id: '@wiki3-ai/jupyterlab-publish:plugin',
          description: 'Publish JupyterLite notebooks directly to GitHub',
          autoStart: true,
          requires: [INotebookTracker],
          activate: (app: any, tracker: any) => {
            console.log('[wiki3-publish] Extension activated');

            // Command ID
            const commandId = 'wiki3-publish:publish-notebook';

            // Register the publish command
            app.commands.addCommand(commandId, {
              label: 'Publish to GitHub',
              caption: 'Publish this notebook to GitHub Pages',
              execute: () => {
                const current = tracker.currentWidget;
                if (current) {
                  createPublishHandler(current)();
                } else {
                  alert('No notebook is currently open');
                }
              },
              isEnabled: () => {
                return tracker.currentWidget !== null;
              }
            });

            // Add to context menu for notebooks
            app.contextMenu.addItem({
              command: commandId,
              selector: '.jp-Notebook',
              rank: 100
            });

            // Try to add to File menu
            try {
              if (app.mainMenu && app.mainMenu.fileMenu) {
                app.mainMenu.fileMenu.addGroup([{ command: commandId }], 40);
                console.log('[wiki3-publish] Added to File menu');
              }
            } catch (e) {
              console.log('[wiki3-publish] Could not add to File menu:', e);
            }

            // Register settings command
            app.commands.addCommand('wiki3-publish:settings', {
              label: 'Publish Settings...',
              caption: 'Configure GitHub publish settings',
              execute: () => {
                showSettingsDialog(loadSettings(), saveSettings);
              }
            });

            // Try to add settings to Settings menu
            try {
              if (app.mainMenu && app.mainMenu.settingsMenu) {
                app.mainMenu.settingsMenu.addGroup([{ command: 'wiki3-publish:settings' }], 100);
                console.log('[wiki3-publish] Added to Settings menu');
              }
            } catch (e) {
              console.log('[wiki3-publish] Could not add to Settings menu:', e);
            }

            // Add publish button to each notebook's toolbar
            tracker.widgetAdded.connect((_sender: any, panel: any) => {
              console.log('[wiki3-publish] Notebook panel added, inserting publish button');

              let widget: any;

              if (ToolbarButton) {
                // Use proper ToolbarButton from JupyterLab
                widget = new ToolbarButton({
                  label: 'Publish',
                  tooltip: 'Publish this notebook to GitHub',
                  onClick: createPublishHandler(panel)
                });
                console.log('[wiki3-publish] Created ToolbarButton widget');
              } else {
                // Fallback: create a minimal widget-like wrapper
                const btn = document.createElement('button');
                btn.className = 'wiki3-publish-btn jp-ToolbarButtonComponent jp-mod-minimal';
                btn.title = 'Publish this notebook to GitHub';
                btn.innerHTML = `
                  <span class="jp-ToolbarButtonComponent-icon">${getUploadIconSvg()}</span>
                  <span class="jp-ToolbarButtonComponent-label">Publish</span>
                `;
                btn.addEventListener('click', createPublishHandler(panel));

                const wrapper = document.createElement('div');
                wrapper.className = 'jp-ToolbarButton';
                wrapper.appendChild(btn);
                
                widget = {
                  node: wrapper,
                  addClass: function(cls: string) { this.node.classList.add(cls); },
                  hasClass: function(cls: string) { return this.node.classList.contains(cls); },
                  removeClass: function(cls: string) { this.node.classList.remove(cls); },
                  dispose: function() { 
                    this.isDisposed = true; 
                    this.node.remove();
                  },
                  isDisposed: false,
                  id: 'wiki3-publish-btn-' + Date.now()
                };
                console.log('[wiki3-publish] Created fallback widget');
              }

              // Insert into toolbar
              try {
                // Try to insert after the save button (usually position 2-4)
                const inserted = panel.toolbar.insertItem(5, 'publish-github', widget);
                if (!inserted) {
                  panel.toolbar.addItem('publish-github', widget);
                }
                console.log('[wiki3-publish] Publish button added to toolbar');
              } catch (e) {
                console.error('[wiki3-publish] Error adding toolbar button:', e);
                // Try addItem as fallback
                try {
                  panel.toolbar.addItem('publish-github', widget);
                  console.log('[wiki3-publish] Publish button added via addItem fallback');
                } catch (e2) {
                  console.error('[wiki3-publish] Fallback also failed:', e2);
                }
              }
            });
          }
        };

        console.log('[wiki3-publish/federation] Returning plugin');
        return {
          __esModule: true,
          default: [plugin]
        };
      };
    }

    throw new Error(`[wiki3-publish] Unknown module: ${module}`);
  },

  sharedScope: null as any
};

// Settings dialog
function showSettingsDialog(
  currentSettings: PublishSettings,
  onSave: (settings: PublishSettings) => void
): void {
  const dialog = document.createElement('dialog');
  dialog.className = 'wiki3-dialog wiki3-settings-dialog';
  dialog.innerHTML = `
    <div class="wiki3-dialog-content">
      <h2 class="wiki3-dialog-title">Publish Settings</h2>
      
      <div class="wiki3-settings-form">
        <label class="wiki3-settings-label">
          Default Repository Owner (username/org):
          <input type="text" id="wiki3-settings-owner" class="wiki3-settings-input" 
                 placeholder="e.g., my-username" 
                 value="${currentSettings.defaultOwner || ''}" />
        </label>
        
        <label class="wiki3-settings-label">
          Default Repository Name:
          <input type="text" id="wiki3-settings-repo" class="wiki3-settings-input" 
                 placeholder="e.g., my-notebooks" 
                 value="${currentSettings.defaultRepo || ''}" />
        </label>
        
        ${currentSettings.lastUsedRepo ? `
          <p class="wiki3-settings-note">
            Last used: <strong>${currentSettings.lastUsedRepo}</strong>
          </p>
        ` : ''}
        
        <p class="wiki3-settings-note">
          These settings are stored in your browser's local storage.
        </p>
      </div>

      <div class="wiki3-dialog-buttons">
        <button type="button" id="wiki3-settings-save" class="wiki3-primary-button">Save</button>
        <button type="button" id="wiki3-settings-cancel" class="wiki3-secondary-button">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  const ownerInput = dialog.querySelector('#wiki3-settings-owner') as HTMLInputElement;
  const repoInput = dialog.querySelector('#wiki3-settings-repo') as HTMLInputElement;
  const saveBtn = dialog.querySelector('#wiki3-settings-save') as HTMLButtonElement;
  const cancelBtn = dialog.querySelector('#wiki3-settings-cancel') as HTMLButtonElement;

  saveBtn.addEventListener('click', () => {
    onSave({
      ...currentSettings,
      defaultOwner: ownerInput.value.trim() || undefined,
      defaultRepo: repoInput.value.trim() || undefined
    });
    dialog.close();
    dialog.remove();
  });

  cancelBtn.addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });

  dialog.addEventListener('cancel', () => {
    dialog.remove();
  });

  dialog.showModal();
}

// SVG icon for upload/publish
function getUploadIconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>`;
}

// Export container for module federation
export default container;

// Register the container in the global scope for JupyterLite
win._JUPYTERLAB = win._JUPYTERLAB || {};
win._JUPYTERLAB[scope] = container;

console.log('[wiki3-publish/federation] Module Federation container registered for scope:', scope);
