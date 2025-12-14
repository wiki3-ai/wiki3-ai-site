/**
 * Module Federation wrapper for the cell-run-button extension
 * This allows the extension to be loaded by JupyterLite
 */

// Type-safe window access
const win = window as any;

console.log('[cell-run-button/federation] Setting up Module Federation container');

const scope = '@wiki3-ai/cell-run-button';

// Helper to get a module from the shared scope
async function importShared(pkg: string): Promise<any> {
  const sharedScope = container.sharedScope;
  if (!sharedScope) {
    throw new Error(`[cell-run-button] Shared scope not initialized for ${pkg}`);
  }

  const versions = sharedScope[pkg];
  if (!versions) {
    throw new Error(`[cell-run-button] Shared module ${pkg} not found in shared scope`);
  }

  const versionKeys = Object.keys(versions);
  if (versionKeys.length === 0) {
    throw new Error(`[cell-run-button] No versions available for ${pkg}`);
  }

  // Pick the first available version
  const version = versions[versionKeys[0]];
  const factory = version?.get;

  if (typeof factory !== 'function') {
    throw new Error(`[cell-run-button] Module ${pkg} has no factory function`);
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

  console.log(`[cell-run-button] Loaded ${pkg}`);
  return result;
}

// Module Federation container API
const container = {
  init: (sharedScope: any) => {
    console.log('[cell-run-button/federation] init() called');
    if (!win._JUPYTERLAB) {
      win._JUPYTERLAB = {};
    }
    container.sharedScope = sharedScope;
    return Promise.resolve();
  },
  
  get: async (module: string) => {
    console.log(`[cell-run-button/federation] get() called for module: ${module}`);
    
    if (module === './extension') {
      return async () => {
        console.log('[cell-run-button/federation] Loading dependencies from shared scope');
        
        // Import dependencies from shared scope
        const notebookModule = await importShared('@jupyterlab/notebook');
        
        const { INotebookTracker, NotebookActions } = notebookModule;
        
        console.log('[cell-run-button/federation] Dependencies loaded, creating plugin');
        
        // Now create the plugin inline with access to the loaded modules
        const plugin: any = {
          id: '@wiki3-ai/cell-run-button:plugin',
          autoStart: true,
          requires: [INotebookTracker],
          activate: (app: any, _notebookTracker: any) => {
            console.log('[cell-run-button] Extension activated');
            
            // Widget extension class
            class CellRunButtonExtension {
              private _cellButtons = new WeakMap<any, HTMLButtonElement>();

              createNew(panel: any, _context: any): any {
                const notebook = panel.content;
                
                // Create a style element for our CSS
                const styleId = 'cell-run-button-styles';
                if (!document.getElementById(styleId)) {
                  const style = document.createElement('style');
                  style.id = styleId;
                  style.textContent = `
                    .jp-InputPrompt-wrapper {
                      display: flex;
                      flex-wrap: wrap;
                      align-items: center;
                      gap: 4px;
                    }
                    
                    .jp-InputPrompt {
                      flex-shrink: 0;
                    }
                    
                    .jp-CellRunButton {
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      width: 20px;
                      height: 20px;
                      padding: 2px;
                      border: none;
                      background: transparent;
                      cursor: pointer;
                      border-radius: 3px;
                      transition: background-color 0.1s;
                      flex-shrink: 0;
                    }
                    
                    .jp-CellRunButton:hover {
                      background-color: var(--jp-layout-color2);
                    }
                    
                    .jp-CellRunButton:active {
                      background-color: var(--jp-layout-color3);
                    }
                    
                    .jp-CellRunButton svg {
                      width: 16px;
                      height: 16px;
                      fill: var(--jp-ui-font-color1);
                    }
                    
                    /* Responsive layout for narrow screens */
                    @media (max-width: 768px) {
                      .jp-InputPrompt-wrapper {
                        gap: 2px;
                      }
                    }
                  `;
                  document.head.appendChild(style);
                }

                // Add buttons to existing cells
                const addButtonsToAllCells = () => {
                  const cells = notebook.widgets;
                  for (let i = 0; i < cells.length; i++) {
                    this._addButtonToCell(cells[i], notebook, panel);
                  }
                };

                // Initial setup
                addButtonsToAllCells();

                // DOM update delay: Allow JupyterLab to finish rendering before adding buttons
                const DOM_UPDATE_DELAY = 100;
                const CELL_SELECTION_DELAY = 10;

                // Listen for new cells being added
                notebook.model!.cells.changed.connect(() => {
                  // Use a small delay to ensure DOM is ready after cell insertion
                  setTimeout(() => addButtonsToAllCells(), DOM_UPDATE_DELAY);
                });

                // Listen for cell selection changes to ensure buttons are present
                notebook.activeCellChanged.connect(() => {
                  setTimeout(() => addButtonsToAllCells(), CELL_SELECTION_DELAY);
                });

                // Return disposable for cleanup
                let disposed = false;
                return {
                  get isDisposed() {
                    return disposed;
                  },
                  dispose: () => {
                    if (!disposed) {
                      disposed = true;
                      const styleElement = document.getElementById(styleId);
                      if (styleElement) {
                        styleElement.remove();
                      }
                    }
                  }
                };
              }

              private _addButtonToCell(cell: any, notebook: any, panel?: any): void {
                // Only add to code cells
                if (cell.model.type !== 'code') {
                  return;
                }

                // Check if button already exists for this cell
                if (this._cellButtons.has(cell)) {
                  return;
                }

                // Find the input prompt element
                const promptElement = cell.node.querySelector('.jp-InputPrompt');
                if (!promptElement) {
                  return;
                }

                // Check if wrapper already exists
                let wrapper = promptElement.parentElement;
                if (!wrapper || !wrapper.classList.contains('jp-InputPrompt-wrapper')) {
                  // Create wrapper
                  wrapper = document.createElement('div');
                  wrapper.className = 'jp-InputPrompt-wrapper';
                  
                  // Insert wrapper
                  promptElement.parentNode!.insertBefore(wrapper, promptElement);
                  wrapper.appendChild(promptElement);
                }

                // Check if button already exists in wrapper
                if (wrapper.querySelector('.jp-CellRunButton')) {
                  return;
                }

                // Create the run button
                const button = document.createElement('button');
                button.className = 'jp-CellRunButton';
                button.title = 'Run this cell';
                button.setAttribute('aria-label', 'Run cell');

                // Add the run icon SVG using safe DOM construction
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', '0 0 24 24');
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M8 5v14l11-7z');
                svg.appendChild(path);
                button.appendChild(svg);

                // Add click handler
                button.addEventListener('click', (event: Event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  
                  // Execute the cell and advance to next cell (same as toolbar run button)
                  const cellIndex = notebook.widgets.indexOf(cell);
                  if (cellIndex !== -1 && panel) {
                    notebook.activeCellIndex = cellIndex;
                    // Execute the active cell and move to next cell
                    NotebookActions.runAndAdvance(notebook, panel.sessionContext);
                  }
                });

                // Add button to wrapper after the prompt
                wrapper.appendChild(button);

                // Mark this cell as having a button
                this._cellButtons.set(cell, button);
              }
            }
            
            const extension = new CellRunButtonExtension();
            
            // Apply extension to all current and future notebooks
            app.docRegistry.addWidgetExtension('Notebook', extension);
            
            console.log('[cell-run-button] Widget extension registered');
          }
        };
        
        console.log('[cell-run-button/federation] Returning plugin');
        return {
          __esModule: true,
          default: [plugin]
        };
      };
    }
    
    throw new Error(`[cell-run-button/federation] Unknown module: ${module}`);
  },
  
  sharedScope: null as any
};

// Register the container in the global scope
win._JUPYTERLAB = win._JUPYTERLAB || {};
win._JUPYTERLAB[scope] = container;

console.log('[cell-run-button/federation] Module Federation container registered for scope:', scope);
