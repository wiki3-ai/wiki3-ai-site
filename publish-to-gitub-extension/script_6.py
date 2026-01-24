
# 3. github-api.ts
github_api_ts = """import { GitHubUser, GitHubRepo } from './types';

/**
 * GitHub REST API wrapper
 * Makes authenticated requests directly to GitHub from browser
 */
export class GitHubAPI {
  private token: string;
  private username: string;

  constructor(token: string, username: string) {
    this.token = token;
    this.username = username;
  }

  /**
   * List user's repositories (paginated)
   */
  async listRepos(): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
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
      throw new Error(\`Failed to create repository: \${error.message}\`);
    }

    return response.json();
  }

  /**
   * Get repository info
   */
  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const url = \`https://api.github.com/repos/\${owner}/\${repo}\`;
    const response = await this.fetch(url);
    
    if (!response.ok) {
      throw new Error('Repository not found');
    }

    return response.json();
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
    const encodedContent = btoa(content); // base64 encode

    const response = await this.fetch(
      \`https://api.github.com/repos/\${owner}/\${repo}/contents/\${path}\`,
      {
        method: 'PUT',
        body: JSON.stringify({
          message,
          content: encodedContent,
          branch: 'main'
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(\`Failed to upload file: \${error.message}\`);
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
      \`Add \${filename} from Wiki3.ai\`
    );
  }

  /**
   * Create GitHub Actions workflow for publishing with repo2jupyterlite-action
   */
  async ensurePublishWorkflow(owner: string, repo: string): Promise<void> {
    const workflowYaml = \`name: Build and Publish JupyterLite
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages

    steps:
      - uses: actions/checkout@v3

      - name: Build JupyterLite site
        uses: yuvipanda/repo2jupyterlite-action@main

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v1
        with:
          path: ./dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v1
\`;

    await this.uploadFile(
      owner,
      repo,
      '.github/workflows/publish.yml',
      workflowYaml,
      'Add JupyterLite publish workflow'
    );
  }

  /**
   * Enable GitHub Pages for repository
   */
  async enableGitHubPages(owner: string, repo: string): Promise<void> {
    const response = await this.fetch(
      \`https://api.github.com/repos/\${owner}/\${repo}/pages\`,
      {
        method: 'POST',
        body: JSON.stringify({
          source: {
            branch: 'gh-pages',
            path: '/'
          }
        })
      }
    );

    if (!response.ok && response.status !== 409) {
      // 409 = already enabled
      const error = await response.json();
      throw new Error(\`Failed to enable Pages: \${error.message}\`);
    }
  }

  /**
   * Helper: make authenticated fetch with error handling
   */
  private async fetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = {
      'Authorization': \`token \${this.token}\`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers
    };

    return fetch(url, { ...options, headers });
  }

  /**
   * Get the GitHub Pages URL for a repo
   */
  getPublishUrl(owner: string, repo: string): string {
    return \`https://\${owner}.github.io/\${repo}/\`;
  }
}
"""

with open('jupyterlab-wiki3-publish/src/github-api.ts', 'w') as f:
    f.write(github_api_ts)

print("✓ Created github-api.ts")
