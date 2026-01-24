
# 9. index.ts - Plugin registration
index_ts = r"""import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { PublishButton } from './publish-button';

/**
 * The publish extension plugin
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@wiki3-ai/jupyterlab-publish:plugin',
  description: 'Publish JupyterLite notebooks directly to GitHub',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, tracker: INotebookTracker) => {
    console.log('Wiki3.ai Publish extension activated');

    // Add publish button to each notebook's toolbar
    tracker.widgetAdded.connect((_, panel) => {
      const publishBtn = new PublishButton(panel);
      
      // Insert button near the end of toolbar (before save, typically at position 5)
      panel.toolbar.insertItem(5, 'publish-github', publishBtn);
    });
  }
};

export default plugin;
"""

with open('jupyterlab-wiki3-publish/src/index.ts', 'w') as f:
    f.write(index_ts)

print("✓ Created index.ts")
