/**
 * Cell Run Button Extension for JupyterLab
 * Adds clickable run buttons next to cell input prompts
 */

import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { INotebookTracker, NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IDisposable } from '@lumino/disposable';
import { Cell, CodeCell } from '@jupyterlab/cells';

/**
 * Widget extension that adds run buttons to notebook cells
 */
class CellRunButtonExtension implements DocumentRegistry.IWidgetExtension<NotebookPanel, any> {
  private _cellButtons = new WeakMap<Cell, HTMLButtonElement>();

  /**
   * Create a new extension for the notebook panel widget
   */
  createNew(panel: NotebookPanel, context: DocumentRegistry.IContext<any>): IDisposable {
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
        this._addButtonToCell(cells[i], notebook);
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
    return {
      dispose: () => {
        const styleElement = document.getElementById(styleId);
        if (styleElement) {
          styleElement.remove();
        }
      }
    };
  }

  /**
   * Add a run button to a single cell
   */
  private _addButtonToCell(cell: Cell, notebook: NotebookPanel['content']): void {
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
      
      // Execute the cell
      const cellIndex = notebook.widgets.indexOf(cell);
      if (cellIndex !== -1) {
        notebook.activeCellIndex = cellIndex;
        // Execute the active cell
        NotebookActions.run(notebook, notebook.sessionContext);
      }
    });

    // Add button to wrapper after the prompt
    wrapper.appendChild(button);

    // Mark this cell as having a button
    this._cellButtons.set(cell, button);
  }
}

/**
 * Initialization data for the cell-run-button extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@wiki3-ai/cell-run-button:plugin',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, notebookTracker: INotebookTracker) => {
    console.log('[cell-run-button] Extension activated');
    
    const extension = new CellRunButtonExtension();
    
    // Apply extension to all current and future notebooks
    app.docRegistry.addWidgetExtension('Notebook', extension);
    
    console.log('[cell-run-button] Widget extension registered');
  }
};

export default plugin;
