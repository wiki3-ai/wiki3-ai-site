/**
 * Module Federation wrapper for the cell-run-button extension
 * This allows the extension to be loaded by JupyterLite
 */

import plugin from './index';

declare const window: any;

console.log('[cell-run-button/federation] Setting up Module Federation container');

const scope = '@wiki3-ai/cell-run-button';

// Module Federation container API
const container = {
  init: (sharedScope: any) => {
    console.log('[cell-run-button/federation] init() called');
    if (!window._JUPYTERLAB) {
      window._JUPYTERLAB = {};
    }
    container.sharedScope = sharedScope;
    return Promise.resolve();
  },
  
  get: async (module: string) => {
    console.log(`[cell-run-button/federation] get() called for module: ${module}`);
    
    if (module === './extension') {
      return async () => {
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
window._JUPYTERLAB = window._JUPYTERLAB || {};
window._JUPYTERLAB[scope] = container;

console.log('[cell-run-button/federation] Module Federation container registered for scope:', scope);
