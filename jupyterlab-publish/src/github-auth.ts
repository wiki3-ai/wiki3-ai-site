import { GitHubUser } from './types';

/**
 * Manages GitHub token input and validation
 * Stores token in session storage (cleared on page refresh)
 */
export class GitHubAuth {
  private readonly tokenKey = 'wiki3_github_token';

  /**
   * Get stored token from session
   */
  getStoredToken(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }

  /**
   * Store token in session
   */
  storeToken(token: string): void {
    sessionStorage.setItem(this.tokenKey, token);
  }

  /**
   * Clear token from session
   */
  clearToken(): void {
    sessionStorage.removeItem(this.tokenKey);
  }

  /**
   * Validate token by making API call to GitHub
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      return response.ok;
    } catch (error) {
      console.error('[wiki3-publish] Token validation error:', error);
      return false;
    }
  }

  /**
   * Get user info from token
   */
  async getUserInfo(token: string): Promise<GitHubUser | null> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      if (response.ok) {
        return response.json();
      }
      return null;
    } catch (error) {
      console.error('[wiki3-publish] Error fetching user info:', error);
      return null;
    }
  }
}
