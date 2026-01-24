import { GitHubUser } from './types';
/**
 * Manages GitHub token input and validation
 * Stores token in session storage (cleared on page refresh)
 */
export declare class GitHubAuth {
    private readonly tokenKey;
    /**
     * Get stored token from session
     */
    getStoredToken(): string | null;
    /**
     * Store token in session
     */
    storeToken(token: string): void;
    /**
     * Clear token from session
     */
    clearToken(): void;
    /**
     * Validate token by making API call to GitHub
     */
    validateToken(token: string): Promise<boolean>;
    /**
     * Get user info from token
     */
    getUserInfo(token: string): Promise<GitHubUser | null>;
}
//# sourceMappingURL=github-auth.d.ts.map