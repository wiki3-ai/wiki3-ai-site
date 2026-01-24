
# 4. publish-button.ts
publish_button_ts = r"""import { ToolbarButton } from '@jupyterlab/apputils';
import { NotebookPanel } from '@jupyterlab/notebook';
import { GitHubAuth } from './github-auth';
import { GitHubAPI } from './github-api';
import { TokenDialog } from './ui/token-dialog';
import { RepoSelector } from './ui/repo-selector';
import { PublishStatus } from './ui/publish-status';

/**
 * Toolbar button that orchestrates the publish workflow
 */
export class PublishButton extends ToolbarButton {
  private notebook: NotebookPanel;

  constructor(notebook: NotebookPanel) {
    super({
      label: 'Publish',
      tooltip: 'Publish this notebook to GitHub',
      onClick: () => this.handlePublish().catch(err => {
        alert(`Publish failed: ${err.message}`);
      })
    });

    this.notebook = notebook;
  }

  /**
   * Main publish workflow orchestrator
   */
  private async handlePublish(): Promise<void> {
    const auth = new GitHubAuth();

    // Step 1: Get or request GitHub token
    let token = auth.getStoredToken();

    if (!token) {
      token = await this.requestToken(auth);
      if (!token) return; // User cancelled
    }

    // Step 2: Validate token and get user info
    const isValid = await auth.validateToken(token);
    if (!isValid) {
      auth.clearToken();
      alert('Token invalid. Please try again.');
      await this.handlePublish(); // Retry
      return;
    }

    auth.storeToken(token);
    const user = await auth.getUserInfo(token);
    if (!user) {
      throw new Error('Could not fetch user info');
    }

    const github = new GitHubAPI(token, user.login);

    // Step 3: Show repo selector
    const repo = await this.selectRepository(github);
    if (!repo) return; // User cancelled

    // Step 4: Show publish status and execute
    await this.executePublish(github, user.login, repo);
  }

  /**
   * Request token from user
   */
  private requestToken(auth: GitHubAuth): Promise<string | null> {
    return new Promise(resolve => {
      const dialog = new TokenDialog({
        onSubmit: (token: string) => {
          resolve(token);
        },
        onCancel: () => {
          resolve(null);
        }
      });
      dialog.launch();
    });
  }

  /**
   * Show repo selector dialog
   */
  private selectRepository(github: GitHubAPI): Promise<any | null> {
    return new Promise(resolve => {
      const selector = new RepoSelector({
        github,
        onSelect: (repo: any) => {
          resolve(repo);
        },
        onCancel: () => {
          resolve(null);
        }
      });
      selector.launch();
    });
  }

  /**
   * Execute the publish workflow
   */
  private async executePublish(github: GitHubAPI, username: string, repo: any): Promise<void> {
    const notebookContent = this.getNotebookContent();
    const notebookFilename = this.getNotebookFilename();
    const publishUrl = github.getPublishUrl(repo.owner.login, repo.name);

    const steps = [
      'Uploading notebook...',
      'Configuring publish workflow...',
      'Enabling GitHub Pages...',
      'Triggering publish action...'
    ];

    const status = new PublishStatus({
      steps,
      publishUrl,
      onClose: () => status.close()
    });

    status.launch();

    try {
      // Upload notebook
      await github.uploadNotebook(
        repo.owner.login,
        repo.name,
        notebookContent,
        notebookFilename
      );
      status.markStepComplete(0);

      // Configure workflow
      await github.ensurePublishWorkflow(repo.owner.login, repo.name);
      status.markStepComplete(1);

      // Enable GitHub Pages
      try {
        await github.enableGitHubPages(repo.owner.login, repo.name);
      } catch (e) {
        // May already be enabled, continue
        console.warn('GitHub Pages config:', e);
      }
      status.markStepComplete(2);

      // Mark as complete (workflow will trigger automatically)
      status.markStepComplete(3);
      status.setComplete(publishUrl);

    } catch (error) {
      status.markStepError(steps.findIndex(s => s === status.getCurrentStep()), error.message);
      throw error;
    }
  }

  /**
   * Get notebook content as JSON string
   */
  private getNotebookContent(): string {
    const model = this.notebook.model;
    if (!model) {
      throw new Error('No notebook model');
    }
    return JSON.stringify(model.toJSON(), null, 2);
  }

  /**
   * Get notebook filename from context path
   */
  private getNotebookFilename(): string {
    const path = this.notebook.context.path;
    return path.split('/').pop() || 'notebook.ipynb';
  }
}
"""

with open('jupyterlab-wiki3-publish/src/publish-button.ts', 'w') as f:
    f.write(publish_button_ts)

print("✓ Created publish-button.ts")
