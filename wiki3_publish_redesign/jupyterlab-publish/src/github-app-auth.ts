export interface AuthSession {
  accessToken: string;
  tokenType: string;
  scope?: string;
}

export interface StartResponse {
  authorize_url: string;
  state: string;
}

/**
 * Browser-side auth helper for a GitHub App or OAuth App code flow that uses
 * a tiny worker only for the token exchange. Tokens stay in session storage.
 */
export class GitHubAppAuth {
  private readonly sessionKey = 'wiki3_publish_auth_session';
  private readonly stateKey = 'wiki3_publish_oauth_state';

  constructor(private readonly workerBaseUrl: string) {}

  getSession(): AuthSession | null {
    const raw = sessionStorage.getItem(this.sessionKey);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  }

  setSession(session: AuthSession): void {
    sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  clearSession(): void {
    sessionStorage.removeItem(this.sessionKey);
    sessionStorage.removeItem(this.stateKey);
  }

  async beginLogin(): Promise<void> {
    const response = await fetch(`${this.workerBaseUrl}/oauth/start`, { credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`Failed to start GitHub login: ${response.status}`);
    }
    const payload = (await response.json()) as StartResponse;
    sessionStorage.setItem(this.stateKey, payload.state);
    window.location.assign(payload.authorize_url);
  }

  async finishLoginFromCallback(code: string, state: string, redirectUri: string): Promise<AuthSession> {
    const expectedState = sessionStorage.getItem(this.stateKey);
    if (!expectedState || expectedState !== state) {
      throw new Error('OAuth state mismatch');
    }

    const response = await fetch(`${this.workerBaseUrl}/oauth/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, redirectUri })
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange GitHub code: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as AuthSession;
    this.setSession(payload);
    sessionStorage.removeItem(this.stateKey);
    return payload;
  }
}
