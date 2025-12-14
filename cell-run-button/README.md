# Cell Run Button Extension

A JupyterLab extension that adds clickable run buttons next to cell input prompts `[nn]` in notebooks.

## Features

- **Quick Access**: Run buttons appear next to each code cell's input prompt
- **Same Icon**: Uses the standard JupyterLab "Run Cell" icon for consistency
- **Responsive Design**: Layout adapts to different screen sizes using flexbox
  - Desktop (1024px+): Button appears inline with prompt
  - Tablet/Mobile (768px and below): Layout wraps naturally
- **Dark/Light Mode**: Automatically adapts to JupyterLab theme
- **Clean Integration**: Minimal visual impact, transparent buttons that highlight on hover

## Implementation

The extension uses the `DocumentRegistry.IWidgetExtension` pattern to:

1. Inject run buttons into the DOM next to `.jp-InputPrompt` elements
2. Execute cells via `NotebookActions.run()` when clicked
3. Apply responsive CSS with flexbox for proper wrapping on narrow screens
4. Clean up properly when cells are removed

## Technical Details

- **Module Federation**: Uses JupyterLab's Module Federation for loading
- **Shared Packages**: Depends on `@jupyterlab/notebook`, `@jupyterlab/docregistry`, `@jupyterlab/cells`, and `@lumino/disposable`
- **CSS Variables**: Uses JupyterLab's CSS variables for theming consistency
- **DOM Manipulation**: Wraps input prompts in flex containers for responsive layout

## Usage

The extension activates automatically when JupyterLab loads. Simply click the run button next to any code cell's prompt to execute that cell.

## Compatibility

- JupyterLab >= 4.4.0
- JupyterLite >= 0.6.0
- Tested on desktop, tablet, and mobile viewports
