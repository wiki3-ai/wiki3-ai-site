import { GitHubAPI } from './github-api';
import { GitHubRepo } from './types';

/**
 * Repository selector dialog using native DOM
 */
export class RepoSelector {
  private dialog: HTMLDialogElement | null = null;
  private github: GitHubAPI;
  private repos: GitHubRepo[] = [];
  private resolvePromise: ((repo: GitHubRepo | null) => void) | null = null;

  constructor(github: GitHubAPI) {
    this.github = github;
  }

  /**
   * Show the repo selector dialog
   */
  show(): Promise<GitHubRepo | null> {
    return new Promise(resolve => {
      this.resolvePromise = resolve;
      this.createDialog();
      this.dialog?.showModal();
      this.loadRepos();
    });
  }

  private createDialog(): void {
    this.dialog?.remove();

    this.dialog = document.createElement('dialog');
    this.dialog.className = 'wiki3-dialog wiki3-repo-selector';
    this.dialog.innerHTML = `
      <div class="wiki3-dialog-content">
        <h2 class="wiki3-dialog-title">Select Repository</h2>

        <div class="wiki3-repo-tabs">
          <button type="button" class="wiki3-tab-btn active" data-mode="select">Select Existing</button>
          <button type="button" class="wiki3-tab-btn" data-mode="create">Create New</button>
        </div>

        <div id="wiki3-repo-error" class="wiki3-error-message" style="display: none;"></div>

        <!-- Select mode -->
        <div id="wiki3-select-mode" class="wiki3-tab-content">
          <p class="wiki3-mode-label">Choose an existing repository:</p>
          <div id="wiki3-repo-loading" class="wiki3-loading">Loading repositories...</div>
          <select id="wiki3-repo-select" class="wiki3-repo-select" style="display: none;">
            <option value="">-- Select a repository --</option>
          </select>
          <button type="button" id="wiki3-select-btn" class="wiki3-primary-button" disabled>
            Use this Repository
          </button>
        </div>

        <!-- Create mode -->
        <div id="wiki3-create-mode" class="wiki3-tab-content" style="display: none;">
          <p class="wiki3-mode-label">Create a new repository:</p>
          <input
            type="text"
            id="wiki3-repo-name"
            class="wiki3-repo-input"
            placeholder="my-notebooks"
          />
          <p class="wiki3-repo-note">
            Repository will be created as public and auto-initialized with a README.
          </p>
          <button type="button" id="wiki3-create-btn" class="wiki3-primary-button">
            Create Repository
          </button>
        </div>

        <div class="wiki3-dialog-buttons">
          <button type="button" id="wiki3-repo-cancel" class="wiki3-secondary-button">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.dialog);

    // Tab switching
    const tabs = this.dialog.querySelectorAll('.wiki3-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab((tab as HTMLElement).dataset.mode || 'select'));
    });

    // Select mode
    const selectEl = this.dialog.querySelector('#wiki3-repo-select') as HTMLSelectElement;
    const selectBtn = this.dialog.querySelector('#wiki3-select-btn') as HTMLButtonElement;

    selectEl.addEventListener('change', () => {
      selectBtn.disabled = !selectEl.value;
    });

    selectBtn.addEventListener('click', () => {
      const repo = this.repos.find(r => r.id.toString() === selectEl.value);
      if (repo) {
        this.close();
        this.resolvePromise?.(repo);
      }
    });

    // Create mode
    const nameInput = this.dialog.querySelector('#wiki3-repo-name') as HTMLInputElement;
    const createBtn = this.dialog.querySelector('#wiki3-create-btn') as HTMLButtonElement;

    createBtn.addEventListener('click', () => this.handleCreate(nameInput, createBtn));
    nameInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.handleCreate(nameInput, createBtn);
      }
    });

    // Cancel
    const cancelBtn = this.dialog.querySelector('#wiki3-repo-cancel') as HTMLButtonElement;
    cancelBtn.addEventListener('click', () => this.handleCancel());

    // Close on backdrop click
    this.dialog.addEventListener('click', (e: MouseEvent) => {
      if (e.target === this.dialog) {
        this.handleCancel();
      }
    });

    this.dialog.addEventListener('cancel', (e: Event) => {
      e.preventDefault();
      this.handleCancel();
    });
  }

  private switchTab(mode: string): void {
    if (!this.dialog) return;

    const tabs = this.dialog.querySelectorAll('.wiki3-tab-btn');
    tabs.forEach(tab => {
      const tabMode = (tab as HTMLElement).dataset.mode;
      tab.classList.toggle('active', tabMode === mode);
    });

    const selectMode = this.dialog.querySelector('#wiki3-select-mode') as HTMLElement;
    const createMode = this.dialog.querySelector('#wiki3-create-mode') as HTMLElement;

    selectMode.style.display = mode === 'select' ? 'block' : 'none';
    createMode.style.display = mode === 'create' ? 'block' : 'none';

    if (mode === 'create') {
      const nameInput = this.dialog.querySelector('#wiki3-repo-name') as HTMLInputElement;
      nameInput?.focus();
    }
  }

  private async loadRepos(): Promise<void> {
    if (!this.dialog) return;

    const loading = this.dialog.querySelector('#wiki3-repo-loading') as HTMLElement;
    const selectEl = this.dialog.querySelector('#wiki3-repo-select') as HTMLSelectElement;
    const errorDiv = this.dialog.querySelector('#wiki3-repo-error') as HTMLElement;

    try {
      this.repos = await this.github.listRepos();

      loading.style.display = 'none';
      selectEl.style.display = 'block';

      // Populate select
      this.repos.forEach(repo => {
        const option = document.createElement('option');
        option.value = repo.id.toString();
        option.textContent = repo.full_name;
        selectEl.appendChild(option);
      });

      if (this.repos.length === 0) {
        selectEl.innerHTML = '<option value="">No repositories found</option>';
        // Switch to create tab
        this.switchTab('create');
      }
    } catch (err) {
      loading.style.display = 'none';
      errorDiv.textContent = `Failed to load repositories: ${err instanceof Error ? err.message : 'Unknown error'}`;
      errorDiv.style.display = 'block';
    }
  }

  private async handleCreate(
    nameInput: HTMLInputElement,
    createBtn: HTMLButtonElement
  ): Promise<void> {
    const name = nameInput.value.trim();
    if (!name) return;

    const errorDiv = this.dialog?.querySelector('#wiki3-repo-error') as HTMLElement;
    createBtn.disabled = true;
    createBtn.textContent = 'Creating...';
    errorDiv.style.display = 'none';

    try {
      const repo = await this.github.createRepo(name, 'Wiki3.ai notebooks');
      this.close();
      this.resolvePromise?.(repo);
    } catch (err) {
      errorDiv.textContent = `Failed to create repository: ${err instanceof Error ? err.message : 'Unknown error'}`;
      errorDiv.style.display = 'block';
      createBtn.disabled = false;
      createBtn.textContent = 'Create Repository';
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
