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
function injectStyles() {
    const styleId = 'wiki3-publish-styles';
    if (document.getElementById(styleId))
        return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
    /* Wiki3.ai Publish Extension Styles */
    
    .wiki3-dialog {
      border: none;
      border-radius: 8px;
      padding: 0;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      max-width: 500px;
      width: 90%;
    }
    
    .wiki3-dialog::backdrop {
      background: rgba(0, 0, 0, 0.5);
    }
    
    .wiki3-dialog-content {
      padding: 24px;
    }
    
    .wiki3-dialog-title {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
    }
    
    .wiki3-dialog-subtitle {
      margin: 0 0 16px 0;
      font-size: 14px;
      line-height: 1.5;
      color: #64748b;
    }
    
    .wiki3-token-options {
      background: #f8fafc;
      padding: 16px;
      border-radius: 6px;
      margin: 16px 0;
    }
    
    .wiki3-token-label {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #334155;
    }
    
    .wiki3-token-list {
      margin: 8px 0 0 0;
      padding-left: 20px;
    }
    
    .wiki3-token-list li {
      margin-bottom: 8px;
      font-size: 13px;
      line-height: 1.4;
      color: #475569;
    }
    
    .wiki3-token-list a {
      color: #0ea5e9;
      text-decoration: none;
    }
    
    .wiki3-token-list a:hover {
      text-decoration: underline;
    }
    
    .wiki3-inline-code {
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: ui-monospace, monospace;
      font-size: 12px;
    }
    
    .wiki3-token-input,
    .wiki3-repo-input {
      width: 100%;
      padding: 10px 12px;
      margin: 16px 0;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 14px;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    .wiki3-token-input:focus,
    .wiki3-repo-input:focus {
      outline: none;
      border-color: #0ea5e9;
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
    }
    
    .wiki3-token-input:disabled,
    .wiki3-repo-input:disabled {
      background: #f1f5f9;
      cursor: not-allowed;
    }
    
    .wiki3-token-note {
      margin: 16px 0 0 0;
      font-size: 12px;
      color: #94a3b8;
    }
    
    .wiki3-error-message {
      color: #dc2626;
      background: #fef2f2;
      padding: 10px 12px;
      border-radius: 6px;
      margin: 12px 0;
      font-size: 13px;
      border: 1px solid #fecaca;
    }
    
    .wiki3-dialog-buttons {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }
    
    .wiki3-primary-button {
      flex: 1;
      padding: 10px 16px;
      background: #0ea5e9;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .wiki3-primary-button:hover:not(:disabled) {
      background: #0284c7;
    }
    
    .wiki3-primary-button:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
    
    .wiki3-secondary-button {
      flex: 1;
      padding: 10px 16px;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .wiki3-secondary-button:hover:not(:disabled) {
      background: #e2e8f0;
    }
    
    .wiki3-secondary-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* Repository Selector */
    .wiki3-repo-tabs {
      display: flex;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 20px;
    }
    
    .wiki3-tab-btn {
      padding: 10px 16px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      color: #64748b;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .wiki3-tab-btn:hover {
      color: #334155;
    }
    
    .wiki3-tab-btn.active {
      color: #0ea5e9;
      border-bottom-color: #0ea5e9;
    }
    
    .wiki3-tab-content {
      margin-top: 16px;
    }
    
    .wiki3-mode-label {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 500;
      color: #334155;
    }
    
    .wiki3-loading {
      color: #64748b;
      font-size: 14px;
      padding: 16px 0;
    }
    
    .wiki3-repo-select {
      width: 100%;
      padding: 10px 12px;
      margin: 12px 0;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }
    
    .wiki3-repo-select:focus {
      outline: none;
      border-color: #0ea5e9;
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
    }
    
    .wiki3-repo-note {
      font-size: 12px;
      color: #94a3b8;
      margin: 8px 0 16px 0;
    }
    
    /* Publish Status */
    .wiki3-steps-container {
      margin: 20px 0;
    }
    
    .wiki3-step {
      display: flex;
      align-items: center;
      padding: 10px 0;
      font-size: 14px;
    }
    
    .wiki3-step-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin-right: 12px;
      font-weight: bold;
      border-radius: 50%;
      flex-shrink: 0;
      font-size: 12px;
    }
    
    .wiki3-step-pending .wiki3-step-icon {
      color: #cbd5e1;
      border: 2px solid #cbd5e1;
    }
    
    .wiki3-step-pending .wiki3-step-label {
      color: #94a3b8;
    }
    
    .wiki3-step-running .wiki3-step-icon {
      color: #0ea5e9;
      border: 2px solid #0ea5e9;
      animation: wiki3-spin 1s linear infinite;
    }
    
    .wiki3-step-running .wiki3-step-label {
      color: #0ea5e9;
      font-weight: 500;
    }
    
    @keyframes wiki3-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .wiki3-step-complete .wiki3-step-icon {
      color: white;
      background: #10b981;
      border: 2px solid #10b981;
    }
    
    .wiki3-step-complete .wiki3-step-label {
      color: #10b981;
    }
    
    .wiki3-step-error .wiki3-step-icon {
      color: white;
      background: #ef4444;
      border: 2px solid #ef4444;
    }
    
    .wiki3-step-error .wiki3-step-label {
      color: #ef4444;
    }
    
    .wiki3-step-error {
      font-size: 12px;
      color: #ef4444;
      margin-left: 8px;
    }
    
    .wiki3-success-box {
      margin-top: 20px;
      padding: 16px;
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 8px;
      color: #166534;
    }
    
    .wiki3-success-box h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
    }
    
    .wiki3-success-box p {
      margin: 0 0 12px 0;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .wiki3-error-box {
      margin-top: 20px;
      padding: 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #991b1b;
    }
    
    .wiki3-error-box h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
    }
    
    .wiki3-error-box p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .wiki3-publish-link {
      display: inline-block;
      color: #0ea5e9;
      text-decoration: none;
      font-weight: 500;
    }
    
    .wiki3-publish-link:hover {
      text-decoration: underline;
    }
    
    .wiki3-status-message {
      margin-top: 16px;
      color: #64748b;
      font-size: 13px;
      text-align: center;
    }
    
    /* Toolbar button styling */
    .wiki3-publish-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: #0ea5e9;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .wiki3-publish-btn:hover {
      background: #0284c7;
    }
    
    .wiki3-publish-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
    
    .wiki3-publish-btn svg {
      width: 16px;
      height: 16px;
    }
  `;
    document.head.appendChild(style);
}
/**
 * Create the publish button element
 */
function createPublishButton(onClick) {
    const btn = document.createElement('button');
    btn.className = 'wiki3-publish-btn';
    btn.title = 'Publish this notebook to GitHub';
    btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
    Publish
  `;
    btn.addEventListener('click', onClick);
    return btn;
}
/**
 * Main publish workflow
 */
async function handlePublish(getNotebookContent, getNotebookFilename) {
    const auth = new GitHubAuth();
    // Step 1: Get or request GitHub token
    let token = auth.getStoredToken();
    if (!token) {
        const dialog = new TokenDialog();
        token = await dialog.show();
        if (!token)
            return; // User cancelled
    }
    // Step 2: Validate token and get user info
    const isValid = await auth.validateToken(token);
    if (!isValid) {
        auth.clearToken();
        alert('Token is invalid or expired. Please try again.');
        return handlePublish(getNotebookContent, getNotebookFilename);
    }
    auth.storeToken(token);
    const user = await auth.getUserInfo(token);
    if (!user) {
        throw new Error('Could not fetch user info');
    }
    const github = new GitHubAPI(token, user.login);
    // Step 3: Show repo selector
    const selector = new RepoSelector(github);
    const repo = await selector.show();
    if (!repo)
        return; // User cancelled
    // Step 4: Execute publish workflow
    await executePublish(github, user, repo, getNotebookContent, getNotebookFilename);
}
/**
 * Execute the publish workflow with status updates
 */
async function executePublish(github, _user, repo, getNotebookContent, getNotebookFilename) {
    const publishUrl = github.getPublishUrl(repo.owner.login, repo.name);
    const steps = [
        'Uploading notebook...',
        'Configuring publish workflow...',
        'Enabling GitHub Pages...',
        'Triggering publish action...'
    ];
    const status = new PublishStatus(steps, publishUrl);
    status.show();
    try {
        // Get notebook content
        const notebookContent = getNotebookContent();
        const notebookFilename = getNotebookFilename();
        // Step 1: Upload notebook
        status.markStepRunning(0);
        await github.uploadNotebook(repo.owner.login, repo.name, notebookContent, notebookFilename);
        status.markStepComplete(0);
        // Step 2: Configure workflow
        status.markStepRunning(1);
        await github.ensurePublishWorkflow(repo.owner.login, repo.name);
        status.markStepComplete(1);
        // Step 3: Enable GitHub Pages
        status.markStepRunning(2);
        try {
            await github.enableGitHubPages(repo.owner.login, repo.name);
        }
        catch (e) {
            // May already be enabled or require manual setup - continue anyway
            console.warn('[wiki3-publish] GitHub Pages config:', e);
        }
        status.markStepComplete(2);
        // Step 4: Complete (workflow triggers automatically on push)
        status.markStepRunning(3);
        // Small delay to show the final step
        await new Promise(resolve => setTimeout(resolve, 500));
        status.markStepComplete(3);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Find the running step and mark it as error
        const runningIndex = steps.findIndex((_, i) => {
            const stepEl = document.querySelector(`.wiki3-step:nth-child(${i + 1})`);
            return stepEl?.classList.contains('wiki3-step-running');
        });
        if (runningIndex >= 0) {
            status.markStepError(runningIndex, errorMessage);
        }
        else {
            status.markStepError(0, errorMessage);
        }
    }
}
// Export for use in federation wrapper
export { injectStyles, createPublishButton, handlePublish, GitHubAuth, GitHubAPI, TokenDialog, RepoSelector, PublishStatus };
//# sourceMappingURL=index.js.map