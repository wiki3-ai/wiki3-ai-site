import { GitHubAPI } from './github-api';
import { GitHubRepo } from './types';
/**
 * Repository selector dialog using native DOM
 */
export declare class RepoSelector {
    private dialog;
    private github;
    private repos;
    private resolvePromise;
    constructor(github: GitHubAPI);
    /**
     * Show the repo selector dialog
     */
    show(): Promise<GitHubRepo | null>;
    private createDialog;
    private switchTab;
    private loadRepos;
    private handleCreate;
    private handleCancel;
    private close;
}
//# sourceMappingURL=repo-selector.d.ts.map