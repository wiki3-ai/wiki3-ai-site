"use strict";
(() => {
  const scope = "@wiki3-ai/cell-run-button";
  
  // Module Federation container setup
  const container = {
    init: (sharedScope) => {
      if (!window._JUPYTERLAB) {
        window._JUPYTERLAB = {};
      }
      container.sharedScope = sharedScope;
    },
    get: async (module) => {
      if (module === "./extension") {
        return async () => {
          // Import shared JupyterLab modules
          const importShared = async (pkgName) => {
            const sharedScope = container.sharedScope;
            if (!sharedScope) {
              throw new Error(`Shared scope not initialized for ${pkgName}`);
            }
            await sharedScope[pkgName].get("./");
            const factory = sharedScope[pkgName].get("./");
            return factory();
          };

          // Get required modules from shared scope
          let INotebookTracker = null;
          let NotebookActions = null;
          let ToolbarButton = null;
          let runIcon = null;

          try {
            const notebookModule = await importShared("@jupyterlab/notebook");
            INotebookTracker = notebookModule.INotebookTracker;
            NotebookActions = notebookModule.NotebookActions;
            console.log("[cell-run-button] Got INotebookTracker and NotebookActions");
          } catch (e) {
            console.error("[cell-run-button] Failed to load notebook module:", e);
          }

          try {
            const uiComponentsModule = await importShared("@jupyterlab/ui-components");
            ToolbarButton = uiComponentsModule.ToolbarButton;
            runIcon = uiComponentsModule.runIcon;
            console.log("[cell-run-button] Got ToolbarButton and runIcon");
          } catch (e) {
            console.error("[cell-run-button] Failed to load ui-components module:", e);
          }

          try {
            const luminoModule = await importShared("@lumino/widgets");
            console.log("[cell-run-button] Got lumino widgets");
          } catch (e) {
            console.error("[cell-run-button] Failed to load lumino module:", e);
          }

          // Extension implementation
          class CellRunButtonExtension {
            constructor() {
              this._cellButtons = new WeakMap();
            }

            createNew(panel, context) {
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
                      flex-wrap: wrap;
                    }
                  }
                `;
                document.head.appendChild(style);
              }

              // Add buttons to existing cells
              const addButtonsToAllCells = () => {
                const cells = notebook.widgets;
                for (let i = 0; i < cells.length; i++) {
                  this._addButtonToCell(cells[i], notebook);
                }
              };

              // Initial setup
              addButtonsToAllCells();

              // Listen for new cells being added
              notebook.model.cells.changed.connect(() => {
                // Use a small delay to ensure DOM is ready
                setTimeout(() => addButtonsToAllCells(), 100);
              });

              // Listen for cell selection changes to ensure buttons are present
              notebook.activeCellChanged.connect(() => {
                setTimeout(() => addButtonsToAllCells(), 10);
              });

              return new DisposableDelegate(() => {
                // Cleanup: remove all buttons and styles
                const styleElement = document.getElementById(styleId);
                if (styleElement) {
                  styleElement.remove();
                }
              });
            }

            _addButtonToCell(cell, notebook) {
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
                promptElement.parentNode.insertBefore(wrapper, promptElement);
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

              // Add the run icon SVG
              button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              `;

              // Add click handler
              button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                // Execute the cell
                if (NotebookActions) {
                  // Make this cell active first
                  const cellIndex = notebook.widgets.indexOf(cell);
                  if (cellIndex !== -1) {
                    notebook.activeCellIndex = cellIndex;
                    // Execute the active cell
                    NotebookActions.run(notebook, notebook.sessionContext);
                  }
                } else {
                  // Fallback: try to execute directly
                  if (cell.model.type === 'code') {
                    cell.execute();
                  }
                }
              });

              // Add button to wrapper after the prompt
              wrapper.appendChild(button);

              // Mark this cell as having a button
              this._cellButtons.set(cell, button);
            }
          }

          // Placeholder for DisposableDelegate if not available
          class DisposableDelegate {
            constructor(callback) {
              this._callback = callback;
            }
            dispose() {
              if (this._callback) {
                this._callback();
              }
            }
          }

          // Define the plugin
          const cellRunButtonPlugin = {
            id: '@wiki3-ai/cell-run-button:plugin',
            autoStart: true,
            requires: [INotebookTracker],
            activate: (app, notebookTracker) => {
              console.log('[cell-run-button] Extension activated');
              
              const extension = new CellRunButtonExtension();
              
              // Apply extension to all current and future notebooks
              app.docRegistry.addWidgetExtension('Notebook', {
                createNew: (panel, context) => extension.createNew(panel, context)
              });
              
              console.log('[cell-run-button] Widget extension registered');
            }
          };

          const plugins = [cellRunButtonPlugin];
          
          console.log('[cell-run-button] Plugin created successfully');
          
          return {
            __esModule: true,
            default: plugins
          };
        };
      }
      throw new Error(`[cell-run-button] Unknown module: ${module}`);
    }
  };

  // Register the container
  window._JUPYTERLAB = window._JUPYTERLAB || {};
  window._JUPYTERLAB[scope] = container;
  
  console.log('[cell-run-button] Module Federation container registered for scope:', scope);
})();
