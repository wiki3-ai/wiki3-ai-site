import { GitHubAuth } from './github-auth';

/**
 * Token input dialog using native DOM (no React dependency)
 * Works in JupyterLite environment
 */
export class TokenDialog {
  private dialog: HTMLDialogElement | null = null;
  private resolvePromise: ((token: string | null) => void) | null = null;

  /**
   * Show the token dialog and return a promise that resolves with the token
   */
  show(): Promise<string | null> {
    return new Promise(resolve => {
      this.resolvePromise = resolve;
      this.createDialog();
      this.dialog?.showModal();
    });
  }

  private createDialog(): void {
    // Remove any existing dialog
    this.dialog?.remove();

    this.dialog = document.createElement('dialog');
    this.dialog.className = 'wiki3-dialog wiki3-token-dialog';
    this.dialog.innerHTML = `
      <div class="wiki3-dialog-content">
        <h2 class="wiki3-dialog-title">Connect to GitHub</h2>
        
        <p class="wiki3-dialog-subtitle">
          Paste your GitHub token to publish notebooks to your repositories.
        </p>

        <div class="wiki3-token-options">
          <p class="wiki3-token-label"><strong>Where to get your token:</strong></p>
          <ul class="wiki3-token-list">
            <li>
              <strong>GitHub CLI:</strong> Run <code class="wiki3-inline-code">gh auth token</code>
            </li>
            <li>
              <strong>Personal Access Token:</strong>
              <a href="https://github.com/settings/tokens/new?scopes=repo,workflow" 
                 target="_blank" rel="noopener noreferrer">Create here</a>
              (scope: <code class="wiki3-inline-code">repo, workflow</code>)
            </li>
          </ul>
        </div>

        <input
          type="password"
          id="wiki3-token-input"
          class="wiki3-token-input"
          placeholder="ghp_... or github_pat_..."
          autofocus
        />

        <div id="wiki3-token-error" class="wiki3-error-message" style="display: none;"></div>

        <div class="wiki3-dialog-buttons">
          <button type="button" id="wiki3-token-submit" class="wiki3-primary-button">Connect</button>
          <button type="button" id="wiki3-token-cancel" class="wiki3-secondary-button">Cancel</button>
        </div>

        <p class="wiki3-token-note">
          Your token is stored in browser memory and cleared when you refresh.
        </p>
      </div>
    `;

    document.body.appendChild(this.dialog);

    // Set up event listeners
    const input = this.dialog.querySelector('#wiki3-token-input') as HTMLInputElement;
    const submitBtn = this.dialog.querySelector('#wiki3-token-submit') as HTMLButtonElement;
    const cancelBtn = this.dialog.querySelector('#wiki3-token-cancel') as HTMLButtonElement;
    const errorDiv = this.dialog.querySelector('#wiki3-token-error') as HTMLDivElement;

    submitBtn.addEventListener('click', () => this.handleSubmit(input, submitBtn, errorDiv));
    cancelBtn.addEventListener('click', () => this.handleCancel());

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.handleSubmit(input, submitBtn, errorDiv);
      }
    });

    // Close on backdrop click
    this.dialog.addEventListener('click', (e: MouseEvent) => {
      if (e.target === this.dialog) {
        this.handleCancel();
      }
    });

    // Handle escape key
    this.dialog.addEventListener('cancel', (e: Event) => {
      e.preventDefault();
      this.handleCancel();
    });
  }

  private async handleSubmit(
    input: HTMLInputElement,
    submitBtn: HTMLButtonElement,
    errorDiv: HTMLDivElement
  ): Promise<void> {
    const token = input.value.trim();
    if (!token) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Validating...';
    errorDiv.style.display = 'none';

    try {
      const auth = new GitHubAuth();
      const isValid = await auth.validateToken(token);

      if (!isValid) {
        errorDiv.textContent = 'Invalid token. Check your token and permissions.';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Connect';
        return;
      }

      this.close();
      this.resolvePromise?.(token);
    } catch (err) {
      errorDiv.textContent = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Connect';
    }
  }

  private handleCancel(): void {
    this.close();
    this.resolvePromise?.(null);
  }

  private close(): void {
    this.dialog?.close();
    this.dialog?.remove();
    this.dialog = null;
  }
}
