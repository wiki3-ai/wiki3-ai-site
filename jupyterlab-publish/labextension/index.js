"use strict";
(() => {
  // lib/github-auth.js
  var GitHubAuth = class {
    constructor() {
      this.tokenKey = "wiki3_github_token";
    }
    /**
     * Get stored token from session
     */
    getStoredToken() {
      return sessionStorage.getItem(this.tokenKey);
    }
    /**
     * Store token in session
     */
    storeToken(token) {
      sessionStorage.setItem(this.tokenKey, token);
    }
    /**
     * Clear token from session
     */
    clearToken() {
      sessionStorage.removeItem(this.tokenKey);
    }
    /**
     * Validate token by making API call to GitHub
     */
    async validateToken(token) {
      try {
        const response = await fetch("https://api.github.com/user", {
          headers: {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github+json"
          }
        });
        return response.ok;
      } catch (error) {
        console.error("[wiki3-publish] Token validation error:", error);
        return false;
      }
    }
    /**
     * Get user info from token
     */
    async getUserInfo(token) {
      try {
        const response = await fetch("https://api.github.com/user", {
          headers: {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github+json"
          }
        });
        if (response.ok) {
          return response.json();
        }
        return null;
      } catch (error) {
        console.error("[wiki3-publish] Error fetching user info:", error);
        return null;
      }
    }
  };

  // lib/github-api.js
  var GitHubAPI = class {
    constructor(token, _username) {
      this.token = token;
    }
    /**
     * List user's repositories (paginated)
     */
    async listRepos() {
      const repos = [];
      let page = 1;
      let hasMore = true;
      while (hasMore && page <= 5) {
        const url = `https://api.github.com/user/repos?per_page=100&sort=updated&page=${page}`;
        const response = await this.fetch(url);
        if (!response.ok)
          break;
        const data = await response.json();
        if (data.length === 0) {
          hasMore = false;
        } else {
          repos.push(...data);
          page++;
        }
      }
      return repos;
    }
    /**
     * Create new repository with GitHub Pages homepage set
     */
    async createRepo(name, description = "") {
      const userResponse = await this.fetch("https://api.github.com/user");
      if (!userResponse.ok) {
        throw new Error("Failed to get user info");
      }
      const user = await userResponse.json();
      const homepage = `https://${user.login}.github.io/${name}/`;
      const response = await this.fetch("https://api.github.com/user/repos", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || "JupyterLite notebooks",
          homepage,
          private: false,
          auto_init: true
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create repository: ${error.message}`);
      }
      return response.json();
    }
    /**
     * Get repository info
     */
    async getRepo(owner, repo) {
      const url = `https://api.github.com/repos/${owner}/${repo}`;
      const response = await this.fetch(url);
      if (!response.ok) {
        throw new Error("Repository not found");
      }
      return response.json();
    }
    /**
     * Get existing file SHA (needed for updates)
     */
    async getFileSha(owner, repo, path) {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const response = await this.fetch(url);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.sha;
    }
    /**
     * Upload or update a file in repository
     */
    async uploadFile(owner, repo, path, content, message = "Update from Wiki3.ai") {
      const encodedContent = btoa(unescape(encodeURIComponent(content)));
      const sha = await this.getFileSha(owner, repo, path);
      const body = {
        message,
        content: encodedContent,
        branch: "main"
      };
      if (sha) {
        body.sha = sha;
      }
      const response = await this.fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: "PUT",
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to upload file: ${error.message}`);
      }
    }
    /**
     * Upload notebook file
     */
    async uploadNotebook(owner, repo, notebookContent, filename = "notebook.ipynb") {
      await this.uploadFile(owner, repo, filename, notebookContent, `Add ${filename} from Wiki3.ai`);
    }
    /**
     * Create GitHub Actions workflow for publishing with repo2jupyterlite-action
     * Only creates if it doesn't exist
     */
    async ensurePublishWorkflow(owner, repo) {
      const existingSha = await this.getFileSha(owner, repo, ".github/workflows/publish.yml");
      if (existingSha) {
        console.log("[wiki3-publish] Workflow already exists, skipping creation");
        return;
      }
      const workflowYaml = `name: Build and Publish JupyterLite
on:
  push:
    branches: [main]
    paths:
      - '**.ipynb'
      - '**.py'
      - '**.md'
      - 'requirements.txt'
      - 'pyproject.toml'
    paths-ignore:
      - '.github/**'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}

    steps:
      - uses: actions/checkout@v4

      - name: Build JupyterLite site
        uses: yuvipanda/repo2jupyterlite-action@main

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;
      await this.uploadFile(owner, repo, ".github/workflows/publish.yml", workflowYaml, "Add JupyterLite publish workflow");
    }
    /**
     * Enable GitHub Pages for repository using GitHub Actions
     */
    async enableGitHubPages(owner, repo) {
      const checkResponse = await this.fetch(`https://api.github.com/repos/${owner}/${repo}/pages`);
      if (checkResponse.ok) {
        const response2 = await this.fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
          method: "PUT",
          body: JSON.stringify({
            build_type: "workflow"
          })
        });
        if (!response2.ok && response2.status !== 422) {
          console.warn("[wiki3-publish] Could not update Pages config:", await response2.text());
        }
        return;
      }
      const response = await this.fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
        method: "POST",
        body: JSON.stringify({
          build_type: "workflow"
        })
      });
      if (!response.ok && response.status !== 409 && response.status !== 422) {
        const error = await response.json();
        throw new Error(`Failed to enable Pages: ${error.message}`);
      }
    }
    /**
     * Helper: make authenticated fetch with error handling
     */
    async fetch(url, options = {}) {
      const headers = {
        "Authorization": `token ${this.token}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      };
      return fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers || {} }
      });
    }
    /**
     * Get the GitHub Pages URL for a repo
     */
    getPublishUrl(owner, repo) {
      return `https://${owner}.github.io/${repo}/`;
    }
  };

  // lib/token-dialog.js
  var TokenDialog = class {
    constructor() {
      this.dialog = null;
      this.resolvePromise = null;
    }
    /**
     * Show the token dialog and return a promise that resolves with the token
     */
    show() {
      return new Promise((resolve) => {
        this.resolvePromise = resolve;
        this.createDialog();
        this.dialog?.showModal();
      });
    }
    createDialog() {
      this.dialog?.remove();
      this.dialog = document.createElement("dialog");
      this.dialog.className = "wiki3-dialog wiki3-token-dialog";
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
      const input = this.dialog.querySelector("#wiki3-token-input");
      const submitBtn = this.dialog.querySelector("#wiki3-token-submit");
      const cancelBtn = this.dialog.querySelector("#wiki3-token-cancel");
      const errorDiv = this.dialog.querySelector("#wiki3-token-error");
      submitBtn.addEventListener("click", () => this.handleSubmit(input, submitBtn, errorDiv));
      cancelBtn.addEventListener("click", () => this.handleCancel());
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.handleSubmit(input, submitBtn, errorDiv);
        }
      });
      this.dialog.addEventListener("click", (e) => {
        if (e.target === this.dialog) {
          this.handleCancel();
        }
      });
      this.dialog.addEventListener("cancel", (e) => {
        e.preventDefault();
        this.handleCancel();
      });
    }
    async handleSubmit(input, submitBtn, errorDiv) {
      const token = input.value.trim();
      if (!token)
        return;
      submitBtn.disabled = true;
      submitBtn.textContent = "Validating...";
      errorDiv.style.display = "none";
      try {
        const auth = new GitHubAuth();
        const isValid = await auth.validateToken(token);
        if (!isValid) {
          errorDiv.textContent = "Invalid token. Check your token and permissions.";
          errorDiv.style.display = "block";
          submitBtn.disabled = false;
          submitBtn.textContent = "Connect";
          return;
        }
        this.close();
        this.resolvePromise?.(token);
      } catch (err) {
        errorDiv.textContent = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
        errorDiv.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.textContent = "Connect";
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
  };

  // lib/repo-selector.js
  var RepoSelector = class {
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
      return new Promise((resolve) => {
        this.resolvePromise = resolve;
        this.createDialog();
        this.dialog?.showModal();
        this.loadRepos();
      });
    }
    createDialog() {
      this.dialog?.remove();
      this.dialog = document.createElement("dialog");
      this.dialog.className = "wiki3-dialog wiki3-repo-selector";
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
      const tabs = this.dialog.querySelectorAll(".wiki3-tab-btn");
      tabs.forEach((tab) => {
        tab.addEventListener("click", () => this.switchTab(tab.dataset.mode || "select"));
      });
      const selectEl = this.dialog.querySelector("#wiki3-repo-select");
      const selectBtn = this.dialog.querySelector("#wiki3-select-btn");
      selectEl.addEventListener("change", () => {
        selectBtn.disabled = !selectEl.value;
      });
      selectBtn.addEventListener("click", () => {
        const repo = this.repos.find((r) => r.id.toString() === selectEl.value);
        if (repo) {
          this.close();
          this.resolvePromise?.(repo);
        }
      });
      const nameInput = this.dialog.querySelector("#wiki3-repo-name");
      const createBtn = this.dialog.querySelector("#wiki3-create-btn");
      createBtn.addEventListener("click", () => this.handleCreate(nameInput, createBtn));
      nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.handleCreate(nameInput, createBtn);
        }
      });
      const cancelBtn = this.dialog.querySelector("#wiki3-repo-cancel");
      cancelBtn.addEventListener("click", () => this.handleCancel());
      this.dialog.addEventListener("click", (e) => {
        if (e.target === this.dialog) {
          this.handleCancel();
        }
      });
      this.dialog.addEventListener("cancel", (e) => {
        e.preventDefault();
        this.handleCancel();
      });
    }
    switchTab(mode) {
      if (!this.dialog)
        return;
      const tabs = this.dialog.querySelectorAll(".wiki3-tab-btn");
      tabs.forEach((tab) => {
        const tabMode = tab.dataset.mode;
        tab.classList.toggle("active", tabMode === mode);
      });
      const selectMode = this.dialog.querySelector("#wiki3-select-mode");
      const createMode = this.dialog.querySelector("#wiki3-create-mode");
      selectMode.style.display = mode === "select" ? "block" : "none";
      createMode.style.display = mode === "create" ? "block" : "none";
      if (mode === "create") {
        const nameInput = this.dialog.querySelector("#wiki3-repo-name");
        nameInput?.focus();
      }
    }
    async loadRepos() {
      if (!this.dialog)
        return;
      const loading = this.dialog.querySelector("#wiki3-repo-loading");
      const selectEl = this.dialog.querySelector("#wiki3-repo-select");
      const selectBtn = this.dialog.querySelector("#wiki3-select-btn");
      const errorDiv = this.dialog.querySelector("#wiki3-repo-error");
      try {
        this.repos = await this.github.listRepos();
        loading.style.display = "none";
        selectEl.style.display = "block";
        let defaultRepoId = null;
        this.repos.forEach((repo) => {
          const option = document.createElement("option");
          option.value = repo.id.toString();
          option.textContent = repo.full_name;
          selectEl.appendChild(option);
          if (this.defaultOwner && this.defaultRepo) {
            if (repo.owner.login === this.defaultOwner && repo.name === this.defaultRepo) {
              defaultRepoId = repo.id.toString();
            }
          }
        });
        if (defaultRepoId) {
          selectEl.value = defaultRepoId;
          selectBtn.disabled = false;
        }
        if (this.repos.length === 0) {
          selectEl.innerHTML = '<option value="">No repositories found</option>';
          this.switchTab("create");
        }
      } catch (err) {
        loading.style.display = "none";
        errorDiv.textContent = `Failed to load repositories: ${err instanceof Error ? err.message : "Unknown error"}`;
        errorDiv.style.display = "block";
      }
    }
    async handleCreate(nameInput, createBtn) {
      const name = nameInput.value.trim();
      if (!name)
        return;
      const descInput = this.dialog?.querySelector("#wiki3-repo-description");
      const description = descInput?.value.trim() || "";
      const errorDiv = this.dialog?.querySelector("#wiki3-repo-error");
      createBtn.disabled = true;
      createBtn.textContent = "Creating...";
      errorDiv.style.display = "none";
      try {
        const repo = await this.github.createRepo(name, description);
        this.close();
        this.resolvePromise?.(repo);
      } catch (err) {
        errorDiv.textContent = `Failed to create repository: ${err instanceof Error ? err.message : "Unknown error"}`;
        errorDiv.style.display = "block";
        createBtn.disabled = false;
        createBtn.textContent = "Create Repository";
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
  };

  // lib/publish-status.js
  var PublishStatus = class {
    constructor(stepLabels, publishUrl) {
      this.dialog = null;
      this.steps = [];
      this.steps = stepLabels.map((label) => ({
        label,
        status: "pending"
      }));
      this.publishUrl = publishUrl;
    }
    /**
     * Show the status dialog
     */
    show() {
      this.createDialog();
      this.dialog?.showModal();
    }
    createDialog() {
      this.dialog?.remove();
      this.dialog = document.createElement("dialog");
      this.dialog.className = "wiki3-dialog wiki3-publish-status";
      this.updateDialogContent();
      document.body.appendChild(this.dialog);
      this.dialog.addEventListener("cancel", (e) => {
        const hasError = this.steps.some((s) => s.status === "error");
        const isComplete = this.steps.every((s) => s.status === "complete");
        if (!hasError && !isComplete) {
          e.preventDefault();
        }
      });
    }
    updateDialogContent() {
      if (!this.dialog)
        return;
      const hasError = this.steps.some((s) => s.status === "error");
      const isComplete = this.steps.every((s) => s.status === "complete");
      const currentStep = this.steps.findIndex((s) => s.status === "running" || s.status === "pending");
      const stepsHtml = this.steps.map((step, _i) => `
      <div class="wiki3-step wiki3-step-${step.status}">
        <span class="wiki3-step-icon">
          ${step.status === "complete" ? "\u2713" : ""}
          ${step.status === "running" ? "\u27F3" : ""}
          ${step.status === "error" ? "\u2717" : ""}
          ${step.status === "pending" ? "\u25CB" : ""}
        </span>
        <span class="wiki3-step-label">${step.label}</span>
        ${step.error ? `<span class="wiki3-step-error">${step.error}</span>` : ""}
      </div>
    `).join("");
      let statusHtml = "";
      if (isComplete && !hasError) {
        statusHtml = `
        <div class="wiki3-success-box">
          <h3>\u2713 Notebook published successfully!</h3>
          <p>Your site will be ready in 1-2 minutes as GitHub Actions runs the publish workflow.</p>
          <a href="${this.publishUrl}" target="_blank" rel="noopener noreferrer" class="wiki3-publish-link">
            View published site \u2192
          </a>
        </div>
      `;
      } else if (hasError) {
        const errorStep = this.steps.find((s) => s.status === "error");
        statusHtml = `
        <div class="wiki3-error-box">
          <h3>\u2717 Publication failed</h3>
          <p>${errorStep?.error || "An error occurred during publishing."}</p>
        </div>
      `;
      } else {
        statusHtml = `
        <p class="wiki3-status-message">
          Publishing... (step ${currentStep + 1} of ${this.steps.length})
        </p>
      `;
      }
      this.dialog.innerHTML = `
      <div class="wiki3-dialog-content">
        <h2 class="wiki3-dialog-title">Publishing Notebook</h2>
        
        <div class="wiki3-steps-container">
          ${stepsHtml}
        </div>

        ${statusHtml}

        <div class="wiki3-dialog-buttons">
          <button type="button" id="wiki3-status-close" class="wiki3-primary-button" 
                  ${!isComplete && !hasError ? "disabled" : ""}>
            ${isComplete ? "Done" : hasError ? "Close" : "Publishing..."}
          </button>
        </div>
      </div>
    `;
      const closeBtn = this.dialog.querySelector("#wiki3-status-close");
      closeBtn?.addEventListener("click", () => {
        this.close();
      });
    }
    /**
     * Mark a step as running
     */
    markStepRunning(index) {
      if (index >= 0 && index < this.steps.length) {
        this.steps[index].status = "running";
        this.updateDialogContent();
      }
    }
    /**
     * Mark a step as complete
     */
    markStepComplete(index) {
      if (index >= 0 && index < this.steps.length) {
        this.steps[index].status = "complete";
        this.updateDialogContent();
      }
    }
    /**
     * Mark a step as error
     */
    markStepError(index, error) {
      if (index >= 0 && index < this.steps.length) {
        this.steps[index].status = "error";
        this.steps[index].error = error;
        this.updateDialogContent();
      }
    }
    /**
     * Close the dialog
     */
    close() {
      this.dialog?.close();
      this.dialog?.remove();
      this.dialog = null;
    }
  };

  // lib/index.js
  function injectStyles() {
    const styleId = "wiki3-publish-styles";
    if (document.getElementById(styleId))
      return;
    const style = document.createElement("style");
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
    
    /* Settings dialog styles */
    .wiki3-settings-form {
      margin: 16px 0;
    }
    
    .wiki3-settings-label {
      display: block;
      margin-bottom: 16px;
      font-size: 14px;
      color: #334155;
    }
    
    .wiki3-settings-input {
      display: block;
      width: 100%;
      margin-top: 6px;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 14px;
      box-sizing: border-box;
    }
    
    .wiki3-settings-input:focus {
      outline: none;
      border-color: #0ea5e9;
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
    }
    
    .wiki3-settings-note {
      font-size: 12px;
      color: #64748b;
      margin: 8px 0;
    }
    
    /* Better toolbar button styling for JupyterLab */
    .jp-ToolbarButton .wiki3-publish-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      margin: 0 2px;
      background: var(--jp-brand-color1, #0ea5e9);
      color: white;
      border: none;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      height: 24px;
      line-height: 1;
    }
    
    .jp-ToolbarButton .wiki3-publish-btn:hover {
      background: var(--jp-brand-color0, #0284c7);
    }
    
    .jp-ToolbarButton .wiki3-publish-btn svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
    
    .jp-ToolbarButton .wiki3-publish-btn .jp-ToolbarButtonComponent-label {
      white-space: nowrap;
    }
  `;
    document.head.appendChild(style);
  }
  async function handlePublish(getNotebookContent, getNotebookFilename, loadSettings2, saveSettings2) {
    const auth = new GitHubAuth();
    let token = auth.getStoredToken();
    if (!token) {
      const dialog = new TokenDialog();
      token = await dialog.show();
      if (!token)
        return;
    }
    const isValid = await auth.validateToken(token);
    if (!isValid) {
      auth.clearToken();
      alert("Token is invalid or expired. Please try again.");
      return handlePublish(getNotebookContent, getNotebookFilename);
    }
    auth.storeToken(token);
    const user = await auth.getUserInfo(token);
    if (!user) {
      throw new Error("Could not fetch user info");
    }
    const github = new GitHubAPI(token, user.login);
    const settings = loadSettings2 ? loadSettings2() : {};
    let defaultOwner = settings.defaultOwner;
    let defaultRepo = settings.defaultRepo;
    if (settings.lastUsedRepo) {
      const parts = settings.lastUsedRepo.split("/");
      if (parts.length === 2) {
        defaultOwner = parts[0];
        defaultRepo = parts[1];
      }
    }
    const selector = new RepoSelector(github, defaultOwner, defaultRepo);
    const repo = await selector.show();
    if (!repo)
      return;
    if (saveSettings2) {
      saveSettings2({
        ...settings,
        lastUsedRepo: repo.full_name
      });
    }
    await executePublish(github, user, repo, getNotebookContent, getNotebookFilename);
  }
  async function executePublish(github, _user, repo, getNotebookContent, getNotebookFilename) {
    const publishUrl = github.getPublishUrl(repo.owner.login, repo.name);
    const steps = [
      "Uploading notebook...",
      "Configuring publish workflow...",
      "Enabling GitHub Pages...",
      "Triggering publish action..."
    ];
    const status = new PublishStatus(steps, publishUrl);
    status.show();
    try {
      const notebookContent = getNotebookContent();
      const notebookFilename = getNotebookFilename();
      status.markStepRunning(0);
      await github.uploadNotebook(repo.owner.login, repo.name, notebookContent, notebookFilename);
      status.markStepComplete(0);
      status.markStepRunning(1);
      await github.ensurePublishWorkflow(repo.owner.login, repo.name);
      status.markStepComplete(1);
      status.markStepRunning(2);
      try {
        await github.enableGitHubPages(repo.owner.login, repo.name);
      } catch (e) {
        console.warn("[wiki3-publish] GitHub Pages config:", e);
      }
      status.markStepComplete(2);
      status.markStepRunning(3);
      await new Promise((resolve) => setTimeout(resolve, 500));
      status.markStepComplete(3);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const runningIndex = steps.findIndex((_, i) => {
        const stepEl = document.querySelector(`.wiki3-step:nth-child(${i + 1})`);
        return stepEl?.classList.contains("wiki3-step-running");
      });
      if (runningIndex >= 0) {
        status.markStepError(runningIndex, errorMessage);
      } else {
        status.markStepError(0, errorMessage);
      }
    }
  }

  // lib/federation.js
  var win = window;
  console.log("[wiki3-publish/federation] Setting up Module Federation container");
  var scope = "@wiki3-ai/jupyterlab-publish";
  var SETTINGS_KEY = "wiki3-publish-settings";
  function loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }
  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn("[wiki3-publish] Could not save settings:", e);
    }
  }
  async function importShared(pkg) {
    const sharedScope = container.sharedScope;
    if (!sharedScope) {
      throw new Error(`[wiki3-publish] Shared scope not initialized for ${pkg}`);
    }
    const versions = sharedScope[pkg];
    if (!versions) {
      console.warn(`[wiki3-publish] Shared module ${pkg} not found in shared scope`);
      return null;
    }
    const versionKeys = Object.keys(versions);
    if (versionKeys.length === 0) {
      throw new Error(`[wiki3-publish] No versions available for ${pkg}`);
    }
    const version = versions[versionKeys[0]];
    const factory = version?.get;
    if (typeof factory !== "function") {
      throw new Error(`[wiki3-publish] Module ${pkg} has no factory function`);
    }
    let result = factory();
    if (result && typeof result.then === "function") {
      result = await result;
    }
    if (typeof result === "function") {
      result = result();
    }
    console.log(`[wiki3-publish] Loaded ${pkg}`);
    return result;
  }
  var container = {
    init: (sharedScope) => {
      console.log("[wiki3-publish/federation] init() called");
      if (!win._JUPYTERLAB) {
        win._JUPYTERLAB = {};
      }
      container.sharedScope = sharedScope;
      return Promise.resolve();
    },
    get: async (module) => {
      console.log(`[wiki3-publish/federation] get() called for module: ${module}`);
      if (module === "./extension") {
        return async () => {
          console.log("[wiki3-publish/federation] Loading dependencies from shared scope");
          const notebookModule = await importShared("@jupyterlab/notebook");
          const uiComponents = await importShared("@jupyterlab/ui-components");
          const { INotebookTracker } = notebookModule;
          const ToolbarButton = uiComponents?.ToolbarButton;
          console.log("[wiki3-publish/federation] Dependencies loaded, creating plugin");
          console.log("[wiki3-publish/federation] ToolbarButton available:", !!ToolbarButton);
          injectStyles();
          const createPublishHandler = (panel) => {
            return () => {
              handlePublish(() => {
                const model = panel.model;
                if (!model) {
                  throw new Error("No notebook model");
                }
                return JSON.stringify(model.toJSON(), null, 2);
              }, () => {
                const path = panel.context.path;
                return path || "notebook.ipynb";
              }, loadSettings, saveSettings).catch((err) => {
                console.error("[wiki3-publish] Publish error:", err);
                alert(`Publish failed: ${err.message}`);
              });
            };
          };
          const plugin = {
            id: "@wiki3-ai/jupyterlab-publish:plugin",
            description: "Publish JupyterLite notebooks directly to GitHub",
            autoStart: true,
            requires: [INotebookTracker],
            activate: (app, tracker) => {
              console.log("[wiki3-publish] Extension activated");
              const commandId = "wiki3-publish:publish-notebook";
              app.commands.addCommand(commandId, {
                label: "Publish to GitHub",
                caption: "Publish this notebook to GitHub Pages",
                execute: () => {
                  const current = tracker.currentWidget;
                  if (current) {
                    createPublishHandler(current)();
                  } else {
                    alert("No notebook is currently open");
                  }
                },
                isEnabled: () => {
                  return tracker.currentWidget !== null;
                }
              });
              app.contextMenu.addItem({
                command: commandId,
                selector: ".jp-Notebook",
                rank: 100
              });
              try {
                if (app.mainMenu && app.mainMenu.fileMenu) {
                  app.mainMenu.fileMenu.addGroup([{ command: commandId }], 40);
                  console.log("[wiki3-publish] Added to File menu");
                }
              } catch (e) {
                console.log("[wiki3-publish] Could not add to File menu:", e);
              }
              app.commands.addCommand("wiki3-publish:settings", {
                label: "Publish Settings...",
                caption: "Configure GitHub publish settings",
                execute: () => {
                  showSettingsDialog(loadSettings(), saveSettings);
                }
              });
              try {
                if (app.mainMenu && app.mainMenu.settingsMenu) {
                  app.mainMenu.settingsMenu.addGroup([{ command: "wiki3-publish:settings" }], 100);
                  console.log("[wiki3-publish] Added to Settings menu");
                }
              } catch (e) {
                console.log("[wiki3-publish] Could not add to Settings menu:", e);
              }
              tracker.widgetAdded.connect((_sender, panel) => {
                console.log("[wiki3-publish] Notebook panel added, inserting publish button");
                let widget;
                if (ToolbarButton) {
                  widget = new ToolbarButton({
                    label: "Publish",
                    tooltip: "Publish this notebook to GitHub",
                    onClick: createPublishHandler(panel)
                  });
                  console.log("[wiki3-publish] Created ToolbarButton widget");
                } else {
                  const btn = document.createElement("button");
                  btn.className = "wiki3-publish-btn jp-ToolbarButtonComponent jp-mod-minimal";
                  btn.title = "Publish this notebook to GitHub";
                  btn.innerHTML = `
                  <span class="jp-ToolbarButtonComponent-icon">${getUploadIconSvg()}</span>
                  <span class="jp-ToolbarButtonComponent-label">Publish</span>
                `;
                  btn.addEventListener("click", createPublishHandler(panel));
                  const wrapper = document.createElement("div");
                  wrapper.className = "jp-ToolbarButton";
                  wrapper.appendChild(btn);
                  widget = {
                    node: wrapper,
                    addClass: function(cls) {
                      this.node.classList.add(cls);
                    },
                    hasClass: function(cls) {
                      return this.node.classList.contains(cls);
                    },
                    removeClass: function(cls) {
                      this.node.classList.remove(cls);
                    },
                    dispose: function() {
                      this.isDisposed = true;
                      this.node.remove();
                    },
                    isDisposed: false,
                    id: "wiki3-publish-btn-" + Date.now()
                  };
                  console.log("[wiki3-publish] Created fallback widget");
                }
                try {
                  const inserted = panel.toolbar.insertItem(5, "publish-github", widget);
                  if (!inserted) {
                    panel.toolbar.addItem("publish-github", widget);
                  }
                  console.log("[wiki3-publish] Publish button added to toolbar");
                } catch (e) {
                  console.error("[wiki3-publish] Error adding toolbar button:", e);
                  try {
                    panel.toolbar.addItem("publish-github", widget);
                    console.log("[wiki3-publish] Publish button added via addItem fallback");
                  } catch (e2) {
                    console.error("[wiki3-publish] Fallback also failed:", e2);
                  }
                }
              });
            }
          };
          console.log("[wiki3-publish/federation] Returning plugin");
          return {
            __esModule: true,
            default: [plugin]
          };
        };
      }
      throw new Error(`[wiki3-publish] Unknown module: ${module}`);
    },
    sharedScope: null
  };
  function showSettingsDialog(currentSettings, onSave) {
    const dialog = document.createElement("dialog");
    dialog.className = "wiki3-dialog wiki3-settings-dialog";
    dialog.innerHTML = `
    <div class="wiki3-dialog-content">
      <h2 class="wiki3-dialog-title">Publish Settings</h2>
      
      <div class="wiki3-settings-form">
        <label class="wiki3-settings-label">
          Default Repository Owner (username/org):
          <input type="text" id="wiki3-settings-owner" class="wiki3-settings-input" 
                 placeholder="e.g., my-username" 
                 value="${currentSettings.defaultOwner || ""}" />
        </label>
        
        <label class="wiki3-settings-label">
          Default Repository Name:
          <input type="text" id="wiki3-settings-repo" class="wiki3-settings-input" 
                 placeholder="e.g., my-notebooks" 
                 value="${currentSettings.defaultRepo || ""}" />
        </label>
        
        ${currentSettings.lastUsedRepo ? `
          <p class="wiki3-settings-note">
            Last used: <strong>${currentSettings.lastUsedRepo}</strong>
          </p>
        ` : ""}
        
        <p class="wiki3-settings-note">
          These settings are stored in your browser's local storage.
        </p>
      </div>

      <div class="wiki3-dialog-buttons">
        <button type="button" id="wiki3-settings-save" class="wiki3-primary-button">Save</button>
        <button type="button" id="wiki3-settings-cancel" class="wiki3-secondary-button">Cancel</button>
      </div>
    </div>
  `;
    document.body.appendChild(dialog);
    const ownerInput = dialog.querySelector("#wiki3-settings-owner");
    const repoInput = dialog.querySelector("#wiki3-settings-repo");
    const saveBtn = dialog.querySelector("#wiki3-settings-save");
    const cancelBtn = dialog.querySelector("#wiki3-settings-cancel");
    saveBtn.addEventListener("click", () => {
      onSave({
        ...currentSettings,
        defaultOwner: ownerInput.value.trim() || void 0,
        defaultRepo: repoInput.value.trim() || void 0
      });
      dialog.close();
      dialog.remove();
    });
    cancelBtn.addEventListener("click", () => {
      dialog.close();
      dialog.remove();
    });
    dialog.addEventListener("cancel", () => {
      dialog.remove();
    });
    dialog.showModal();
  }
  function getUploadIconSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>`;
  }
  var federation_default = container;
  win._JUPYTERLAB = win._JUPYTERLAB || {};
  win._JUPYTERLAB[scope] = container;
  console.log("[wiki3-publish/federation] Module Federation container registered for scope:", scope);
})();
