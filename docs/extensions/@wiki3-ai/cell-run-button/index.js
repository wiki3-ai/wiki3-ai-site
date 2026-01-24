"use strict";
(() => {
  // lib/federation.js
  var win = window;
  console.log("[cell-run-button/federation] Setting up Module Federation container");
  var scope = "@wiki3-ai/cell-run-button";
  async function importShared(pkg) {
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
    const version = versions[versionKeys[0]];
    const factory = version?.get;
    if (typeof factory !== "function") {
      throw new Error(`[cell-run-button] Module ${pkg} has no factory function`);
    }
    let result = factory();
    if (result && typeof result.then === "function") {
      result = await result;
    }
    if (typeof result === "function") {
      result = result();
    }
    console.log(`[cell-run-button] Loaded ${pkg}`);
    return result;
  }
  var container = {
    init: (sharedScope) => {
      console.log("[cell-run-button/federation] init() called");
      if (!win._JUPYTERLAB) {
        win._JUPYTERLAB = {};
      }
      container.sharedScope = sharedScope;
      return Promise.resolve();
    },
    get: async (module) => {
      console.log(`[cell-run-button/federation] get() called for module: ${module}`);
      if (module === "./extension") {
        return async () => {
          console.log("[cell-run-button/federation] Loading dependencies from shared scope");
          const notebookModule = await importShared("@jupyterlab/notebook");
          const { INotebookTracker, NotebookActions } = notebookModule;
          console.log("[cell-run-button/federation] Dependencies loaded, creating plugin");
          const plugin = {
            id: "@wiki3-ai/cell-run-button:plugin",
            autoStart: true,
            requires: [INotebookTracker],
            activate: (app, _notebookTracker) => {
              console.log("[cell-run-button] Extension activated");
              class CellRunButtonExtension {
                constructor() {
                  this._cellButtons = /* @__PURE__ */ new WeakMap();
                }
                createNew(panel, _context) {
                  const notebook = panel.content;
                  const styleId = "cell-run-button-styles";
                  if (!document.getElementById(styleId)) {
                    const style = document.createElement("style");
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
                  const addButtonsToAllCells = () => {
                    const cells = notebook.widgets;
                    for (let i = 0; i < cells.length; i++) {
                      this._addButtonToCell(cells[i], notebook, panel);
                    }
                  };
                  addButtonsToAllCells();
                  const DOM_UPDATE_DELAY = 100;
                  const CELL_SELECTION_DELAY = 10;
                  notebook.model.cells.changed.connect(() => {
                    setTimeout(() => addButtonsToAllCells(), DOM_UPDATE_DELAY);
                  });
                  notebook.activeCellChanged.connect(() => {
                    setTimeout(() => addButtonsToAllCells(), CELL_SELECTION_DELAY);
                  });
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
                _addButtonToCell(cell, notebook, panel) {
                  if (cell.model.type !== "code") {
                    return;
                  }
                  if (this._cellButtons.has(cell)) {
                    return;
                  }
                  const promptElement = cell.node.querySelector(".jp-InputPrompt");
                  if (!promptElement) {
                    return;
                  }
                  let wrapper = promptElement.parentElement;
                  if (!wrapper || !wrapper.classList.contains("jp-InputPrompt-wrapper")) {
                    wrapper = document.createElement("div");
                    wrapper.className = "jp-InputPrompt-wrapper";
                    promptElement.parentNode.insertBefore(wrapper, promptElement);
                    wrapper.appendChild(promptElement);
                  }
                  if (wrapper.querySelector(".jp-CellRunButton")) {
                    return;
                  }
                  const button = document.createElement("button");
                  button.className = "jp-CellRunButton";
                  button.title = "Run this cell";
                  button.setAttribute("aria-label", "Run cell");
                  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                  svg.setAttribute("viewBox", "0 0 24 24");
                  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                  path.setAttribute("d", "M8 5v14l11-7z");
                  svg.appendChild(path);
                  button.appendChild(svg);
                  button.addEventListener("click", (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const cellIndex = notebook.widgets.indexOf(cell);
                    if (cellIndex !== -1 && panel) {
                      notebook.activeCellIndex = cellIndex;
                      NotebookActions.runAndAdvance(notebook, panel.sessionContext);
                    }
                  });
                  wrapper.appendChild(button);
                  this._cellButtons.set(cell, button);
                }
              }
              const extension = new CellRunButtonExtension();
              app.docRegistry.addWidgetExtension("Notebook", extension);
              console.log("[cell-run-button] Widget extension registered");
            }
          };
          console.log("[cell-run-button/federation] Returning plugin");
          return {
            __esModule: true,
            default: [plugin]
          };
        };
      }
      throw new Error(`[cell-run-button/federation] Unknown module: ${module}`);
    },
    sharedScope: null
  };
  win._JUPYTERLAB = win._JUPYTERLAB || {};
  win._JUPYTERLAB[scope] = container;
  console.log("[cell-run-button/federation] Module Federation container registered for scope:", scope);
})();
