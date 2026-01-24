/**
 * Repository selector dialog using native DOM
 */
export class RepoSelector {
    constructor(github, defaultOwner, defaultRepo) {
        this.dialog = null;
        this.repos = [];
        this.resolvePromise = null;
        this.github = github;
        this.defaultOwner = defaultOwner;
        this.defaultRepo = defaultRepo;
    }
    /**
     * Show the repo selector dialog
     */
    show() {
        return new Promise(resolve => {
            this.resolvePromise = resolve;
            this.createDialog();
            this.dialog?.showModal();
            this.loadRepos();
        });
    }
    createDialog() {
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
          <input
            type="text"
            id="wiki3-repo-description"
            class="wiki3-repo-input"
            placeholder="Description (optional)"
          />
          <p class="wiki3-repo-note">
            Repository will be created as public with GitHub Pages enabled.
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
            tab.addEventListener('click', () => this.switchTab(tab.dataset.mode || 'select'));
        });
        // Select mode
        const selectEl = this.dialog.querySelector('#wiki3-repo-select');
        const selectBtn = this.dialog.querySelector('#wiki3-select-btn');
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
        const nameInput = this.dialog.querySelector('#wiki3-repo-name');
        const createBtn = this.dialog.querySelector('#wiki3-create-btn');
        createBtn.addEventListener('click', () => this.handleCreate(nameInput, createBtn));
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleCreate(nameInput, createBtn);
            }
        });
        // Cancel
        const cancelBtn = this.dialog.querySelector('#wiki3-repo-cancel');
        cancelBtn.addEventListener('click', () => this.handleCancel());
        // Close on backdrop click
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) {
                this.handleCancel();
            }
        });
        this.dialog.addEventListener('cancel', (e) => {
            e.preventDefault();
            this.handleCancel();
        });
    }
    switchTab(mode) {
        if (!this.dialog)
            return;
        const tabs = this.dialog.querySelectorAll('.wiki3-tab-btn');
        tabs.forEach(tab => {
            const tabMode = tab.dataset.mode;
            tab.classList.toggle('active', tabMode === mode);
        });
        const selectMode = this.dialog.querySelector('#wiki3-select-mode');
        const createMode = this.dialog.querySelector('#wiki3-create-mode');
        selectMode.style.display = mode === 'select' ? 'block' : 'none';
        createMode.style.display = mode === 'create' ? 'block' : 'none';
        if (mode === 'create') {
            const nameInput = this.dialog.querySelector('#wiki3-repo-name');
            nameInput?.focus();
        }
    }
    async loadRepos() {
        if (!this.dialog)
            return;
        const loading = this.dialog.querySelector('#wiki3-repo-loading');
        const selectEl = this.dialog.querySelector('#wiki3-repo-select');
        const selectBtn = this.dialog.querySelector('#wiki3-select-btn');
        const errorDiv = this.dialog.querySelector('#wiki3-repo-error');
        try {
            this.repos = await this.github.listRepos();
            loading.style.display = 'none';
            selectEl.style.display = 'block';
            // Populate select
            let defaultRepoId = null;
            this.repos.forEach(repo => {
                const option = document.createElement('option');
                option.value = repo.id.toString();
                option.textContent = repo.full_name;
                selectEl.appendChild(option);
                // Check if this matches the default repo
                if (this.defaultOwner && this.defaultRepo) {
                    if (repo.owner.login === this.defaultOwner && repo.name === this.defaultRepo) {
                        defaultRepoId = repo.id.toString();
                    }
                }
            });
            // Auto-select default repo if found
            if (defaultRepoId) {
                selectEl.value = defaultRepoId;
                selectBtn.disabled = false;
            }
            if (this.repos.length === 0) {
                selectEl.innerHTML = '<option value="">No repositories found</option>';
                // Switch to create tab
                this.switchTab('create');
            }
        }
        catch (err) {
            loading.style.display = 'none';
            errorDiv.textContent = `Failed to load repositories: ${err instanceof Error ? err.message : 'Unknown error'}`;
            errorDiv.style.display = 'block';
        }
    }
    async handleCreate(nameInput, createBtn) {
        const name = nameInput.value.trim();
        if (!name)
            return;
        const descInput = this.dialog?.querySelector('#wiki3-repo-description');
        const description = descInput?.value.trim() || '';
        const errorDiv = this.dialog?.querySelector('#wiki3-repo-error');
        createBtn.disabled = true;
        createBtn.textContent = 'Creating...';
        errorDiv.style.display = 'none';
        try {
            const repo = await this.github.createRepo(name, description);
            this.close();
            this.resolvePromise?.(repo);
        }
        catch (err) {
            errorDiv.textContent = `Failed to create repository: ${err instanceof Error ? err.message : 'Unknown error'}`;
            errorDiv.style.display = 'block';
            createBtn.disabled = false;
            createBtn.textContent = 'Create Repository';
        }
    }
    handleCancel() {
        this.close();
        this.resolvePromise?.(null);
    }
    close() {
        this.dialog?.close();
        this.dialog?.remove();
        this.dialog = null;
    }
}
//# sourceMappingURL=repo-selector.js.map