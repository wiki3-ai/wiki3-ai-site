import { GitHubRepo } from './types';

/**
 * GitHub REST API wrapper
 * Makes authenticated requests directly to GitHub from browser
 */
export class GitHubAPI {
  private token: string;

  constructor(token: string, _username: string) {
    this.token = token;
  }

  /**
   * List user's repositories (paginated)
   */
  async listRepos(): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 5) {
      const url = `https://api.github.com/user/repos?per_page=100&sort=updated&page=${page}`;
      const response = await this.fetch(url);

      if (!response.ok) break;

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
   * Create new repository
   */
  async createRepo(name: string, description: string = ''): Promise<GitHubRepo> {
    const response = await this.fetch('https://api.github.com/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: description || 'Wiki3.ai notebooks',
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
  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await this.fetch(url);

    if (!response.ok) {
      throw new Error('Repository not found');
    }

    return response.json();
  }

  /**
   * Get existing file SHA (needed for updates)
   */
  async getFileSha(owner: string, repo: string, path: string): Promise<string | null> {
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
  async uploadFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string = 'Update from Wiki3.ai'
  ): Promise<void> {
    // Base64 encode the content
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    // Check if file exists to get SHA for update
    const sha = await this.getFileSha(owner, repo, path);

    const body: Record<string, string> = {
      message,
      content: encodedContent,
      branch: 'main'
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await this.fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload notebook file
   */
  async uploadNotebook(
    owner: string,
    repo: string,
    notebookContent: string,
    filename: string = 'notebook.ipynb'
  ): Promise<void> {
    await this.uploadFile(
      owner,
      repo,
      filename,
      notebookContent,
      `Add ${filename} from Wiki3.ai`
    );
  }

  /**
   * Create GitHub Actions workflow for publishing with repo2jupyterlite-action
   * Only creates if it doesn't exist
   */
  async ensurePublishWorkflow(owner: string, repo: string): Promise<void> {
    // Check if workflow already exists
    const existingSha = await this.getFileSha(owner, repo, '.github/workflows/publish.yml');
    if (existingSha) {
      console.log('[wiki3-publish] Workflow already exists, skipping creation');
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

    await this.uploadFile(
      owner,
      repo,
      '.github/workflows/publish.yml',
      workflowYaml,
      'Add JupyterLite publish workflow'
    );
  }

  /**
   * Enable GitHub Pages for repository using GitHub Actions
   */
  async enableGitHubPages(owner: string, repo: string): Promise<void> {
    // First, check if Pages is already configured
    const checkResponse = await this.fetch(
      `https://api.github.com/repos/${owner}/${repo}/pages`
    );

    if (checkResponse.ok) {
      // Pages already enabled, try to update to use Actions
      const response = await this.fetch(
        `https://api.github.com/repos/${owner}/${repo}/pages`,
        {
          method: 'PUT',
          body: JSON.stringify({
            build_type: 'workflow'
          })
        }
      );

      if (!response.ok && response.status !== 422) {
        console.warn('[wiki3-publish] Could not update Pages config:', await response.text());
      }
      return;
    }

    // Create new Pages configuration
    const response = await this.fetch(
      `https://api.github.com/repos/${owner}/${repo}/pages`,
      {
        method: 'POST',
        body: JSON.stringify({
          build_type: 'workflow'
        })
      }
    );

    if (!response.ok && response.status !== 409 && response.status !== 422) {
      const error = await response.json();
      throw new Error(`Failed to enable Pages: ${error.message}`);
    }
  }

  /**
   * Helper: make authenticated fetch with error handling
   */
  private async fetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Authorization': `token ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    return fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string> || {}) }
    });
  }

  /**
   * Get the GitHub Pages URL for a repo
   */
  getPublishUrl(owner: string, repo: string): string {
    return `https://${owner}.github.io/${repo}/`;
  }
}
