/**
 * Wiki3.ai Publish Extension
 * Publishes JupyterLite notebooks directly to GitHub with one click
 */
import { GitHubAuth } from './github-auth';
import { GitHubAPI } from './github-api';
import { TokenDialog } from './token-dialog';
import { RepoSelector } from './repo-selector';
import { PublishStatus } from './publish-status';
/**
 * Inject styles into the document
 */
declare function injectStyles(): void;
/**
 * Create the publish button element
 */
declare function createPublishButton(onClick: () => void): HTMLButtonElement;
/**
 * Main publish workflow
 */
declare function handlePublish(getNotebookContent: () => string, getNotebookFilename: () => string): Promise<void>;
export { injectStyles, createPublishButton, handlePublish, GitHubAuth, GitHubAPI, TokenDialog, RepoSelector, PublishStatus };
//# sourceMappingURL=index.d.ts.map