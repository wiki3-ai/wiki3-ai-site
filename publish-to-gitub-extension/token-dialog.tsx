import React, { useState } from 'react';
import { Dialog } from '@jupyterlab/apputils';
import { GitHubAuth } from '../github-auth';
import '../styles.css';

interface TokenDialogProps {
  onSubmit: (token: string) => void;
  onCancel: () => void;
}

/**
 * Dialog for entering GitHub token
 */
export const TokenDialog = ({ onSubmit, onCancel }: TokenDialogProps) => {
  const [token, setToken] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setValidating(true);
    setError(null);

    try {
      const auth = new GitHubAuth();
      const isValid = await auth.validateToken(token);

      if (!isValid) {
        setError('Invalid token. Check your token and permissions.');
        setValidating(false);
        return;
      }

      onSubmit(token);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setValidating(false);
    }
  };

  return (
    <Dialog
      title="Connect to GitHub"
      onCloseRequest={onCancel}
    >
      <div className="wiki3-token-dialog">
        <form onSubmit={handleSubmit}>
          <p className="dialog-subtitle">
            Paste your GitHub token to publish notebooks to your repositories.
          </p>

          <div className="token-options">
            <p className="token-label"><strong>Where to get your token:</strong></p>
            <ul className="token-list">
              <li>
                <strong>GitHub CLI:</strong> Run{' '}
                <code className="inline-code">gh auth token</code>
              </li>
              <li>
                <strong>Personal Access Token:</strong>{' '}
                <a 
                  href="https://github.com/settings/tokens/new?scopes=repo,workflow"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Create here
                </a>
                {' '}(scope: <code className="inline-code">repo, workflow</code>)
              </li>
            </ul>
          </div>

          <input
            type="password"
            className="token-input"
            placeholder="ghp_... or github_pat_..."
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setError(null);
            }}
            disabled={validating}
            autoFocus
          />

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="dialog-buttons">
            <button
              type="submit"
              className="primary-button"
              disabled={!token || validating}
            >
              {validating ? 'Validating...' : 'Connect'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onCancel}
              disabled={validating}
            >
              Cancel
            </button>
          </div>

          <p className="token-note">
            Your token is stored in browser memory and cleared when you refresh.
          </p>
        </form>
      </div>
    </Dialog>
  );
};

/**
 * Wrapper class for Dialog integration with JupyterLab
 */
export class TokenDialog extends Dialog<string | null> {
  private onSubmit: (token: string) => void;
  private onCancel: () => void;

  constructor(props: TokenDialogProps) {
    const body = document.createElement('div');
    body.className = 'wiki3-token-dialog-body';

    super({
      title: 'Connect to GitHub',
      body: new Private.TokenDialogBody(body, props)
    });

    this.onSubmit = props.onSubmit;
    this.onCancel = props.onCancel;
  }

  launch(): Promise<void> {
    return super.launch().then(() => {
      this.update();
    });
  }
}

namespace Private {
  export class TokenDialogBody extends Dialog.Body {
    constructor(host: HTMLElement, props: TokenDialogProps) {
      super(host);

      // Simple form approach
      host.innerHTML = `
        <div style="padding: 20px;">
          <p>Paste your GitHub token to publish notebooks.</p>
          <div style="margin: 15px 0;">
            <p style="font-weight: bold;">Where to get your token:</p>
            <ul>
              <li><strong>GitHub CLI:</strong> Run <code>gh auth token</code></li>
              <li><strong>Personal Access Token:</strong> <a href="https://github.com/settings/tokens/new" target="_blank">Create here</a></li>
            </ul>
          </div>
          <input 
            id="wiki3-token-input"
            type="password" 
            placeholder="ghp_... or github_pat_..."
            style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;"
          />
          <div id="wiki3-error" style="color: red; margin: 10px 0; display: none;"></div>
          <p style="font-size: 12px; color: #666;">Your token is stored in browser memory and cleared on refresh.</p>
        </div>
      `;

      const input = host.querySelector('#wiki3-token-input') as HTMLInputElement;
      if (input) input.focus();
    }
  }
}
