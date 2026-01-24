import { GitHubRepo } from './types';
/**
 * GitHub REST API wrapper
 * Makes authenticated requests directly to GitHub from browser
 */
export declare class GitHubAPI {
    private token;
    constructor(token: string, _username: string);
    /**
     * List user's repositories (paginated)
     */
    listRepos(): Promise<GitHubRepo[]>;
    /**
     * Create new repository with GitHub Pages homepage set
     */
    createRepo(name: string, description?: string): Promise<GitHubRepo>;
    /**
     * Get repository info
     */
    getRepo(owner: string, repo: string): Promise<GitHubRepo>;
    /**
     * Get existing file SHA (needed for updates)
     */
    getFileSha(owner: string, repo: string, path: string): Promise<string | null>;
    /**
     * Upload or update a file in repository
     */
    uploadFile(owner: string, repo: string, path: string, content: string, message?: string): Promise<void>;
    /**
     * Upload notebook file
     */
    uploadNotebook(owner: string, repo: string, notebookContent: string, filename?: string): Promise<void>;
    /**
     * Create GitHub Actions workflow for publishing with repo2jupyterlite-action
     * Only creates if it doesn't exist
     */
    ensurePublishWorkflow(owner: string, repo: string): Promise<void>;
    /**
     * Enable GitHub Pages for repository using GitHub Actions
     */
    enableGitHubPages(owner: string, repo: string): Promise<void>;
    /**
     * Helper: make authenticated fetch with error handling
     */
    private fetch;
    /**
     * Get the GitHub Pages URL for a repo
     */
    getPublishUrl(owner: string, repo: string): string;
}
//# sourceMappingURL=github-api.d.ts.map