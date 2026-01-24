import React, { useState, useEffect } from 'react';
import { Dialog } from '@jupyterlab/apputils';
import { GitHubAPI } from '../github-api';
import { GitHubRepo } from '../types';
import '../styles.css';

interface RepoSelectorProps {
  github: GitHubAPI;
  onSelect: (repo: GitHubRepo) => void;
  onCancel: () => void;
}

/**
 * Dialog for selecting or creating a repository
 */
export const RepoSelector = ({ github, onSelect, onCancel }: RepoSelectorProps) => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [newRepoName, setNewRepoName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'create'>('select');

  useEffect(() => {
    const loadRepos = async () => {
      try {
        const loaded = await github.listRepos();
        setRepos(loaded);
      } catch (err) {
        setError(`Failed to load repositories: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadRepos();
  }, [github]);

  const handleSelect = () => {
    const repo = repos.find(r => r.id === parseInt(selectedRepo));
    if (repo) {
      onSelect(repo);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName) return;

    setCreating(true);
    setError(null);

    try {
      const repo = await github.createRepo(newRepoName, 'Wiki3.ai notebooks');
      onSelect(repo);
    } catch (err) {
      setError(`Failed to create repository: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setCreating(false);
    }
  };

  return (
    <Dialog
      title="Select Repository"
      onCloseRequest={onCancel}
    >
      <div className="wiki3-repo-selector">
        <div className="repo-mode-tabs">
          <button
            className={`mode-tab ${mode === 'select' ? 'active' : ''}`}
            onClick={() => setMode('select')}
            disabled={repos.length === 0}
          >
            Select Repository
          </button>
          <button
            className={`mode-tab ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}
          >
            Create New
          </button>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {mode === 'select' ? (
          <div className="repo-select-mode">
            <p className="mode-label">Choose an existing repository:</p>

            {loading ? (
              <p className="loading-message">Loading repositories...</p>
            ) : repos.length > 0 ? (
              <>
                <select
                  className="repo-select"
                  value={selectedRepo}
                  onChange={(e) => {
                    setSelectedRepo(e.target.value);
                    setError(null);
                  }}
                >
                  <option value="">-- Select a repository --</option>
                  {repos.map(repo => (
                    <option key={repo.id} value={repo.id}>
                      {repo.full_name}
                    </option>
                  ))}
                </select>

                <button
                  className="primary-button"
                  onClick={handleSelect}
                  disabled={!selectedRepo}
                >
                  Use this Repository
                </button>
              </>
            ) : (
              <p className="no-repos-message">No repositories found. Create a new one!</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreate} className="repo-create-mode">
            <p className="mode-label">Create a new repository:</p>

            <input
              type="text"
              className="repo-name-input"
              placeholder="my-notebooks"
              value={newRepoName}
              onChange={(e) => {
                setNewRepoName(e.target.value);
                setError(null);
              }}
              disabled={creating}
              autoFocus
            />

            <p className="repo-name-note">
              Repository will be created as public and auto-initialized with a README.
            </p>

            <button
              type="submit"
              className="primary-button"
              disabled={!newRepoName || creating}
            >
              {creating ? 'Creating...' : 'Create Repository'}
            </button>
          </form>
        )}

        <div className="dialog-buttons">
          <button
            className="secondary-button"
            onClick={onCancel}
            disabled={creating}
          >
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
};

/**
 * Wrapper class for Dialog integration
 */
export class RepoSelector extends Dialog<GitHubRepo | null> {
  constructor(props: RepoSelectorProps) {
    const body = document.createElement('div');
    body.className = 'wiki3-repo-selector-body';

    super({
      title: 'Select or Create Repository',
      body: new Private.RepoSelectorBody(body, props)
    });
  }

  launch(): Promise<void> {
    return super.launch().then(() => {
      this.update();
    });
  }
}

namespace Private {
  export class RepoSelectorBody extends Dialog.Body {
    constructor(host: HTMLElement, props: RepoSelectorProps) {
      super(host);

      host.innerHTML = `
        <div style="padding: 20px; min-width: 400px;">
          <p style="margin: 0 0 15px 0;"><strong>Select or create a repository</strong></p>
          <div id="wiki3-repo-error" style="color: red; margin: 10px 0; display: none;"></div>
          <div id="wiki3-repo-loading" style="color: #666;">Loading repositories...</div>
          <select id="wiki3-repo-select" style="width: 100%; padding: 8px; margin: 10px 0; display: none;">
            <option value="">-- Select a repository --</option>
          </select>
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
            <p style="margin: 0 0 10px 0;"><strong>Or create new:</strong></p>
            <input 
              id="wiki3-new-repo-name"
              type="text" 
              placeholder="my-notebooks"
              style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;"
            />
          </div>
        </div>
      `;

      // Initial load
      props.github.listRepos().then(repos => {
        const loadingEl = host.querySelector('#wiki3-repo-loading') as HTMLElement;
        const selectEl = host.querySelector('#wiki3-repo-select') as HTMLSelectElement;

        if (loadingEl) loadingEl.style.display = 'none';
        if (selectEl) selectEl.style.display = 'block';

        // Populate repos
        if (repos && repos.length > 0) {
          repos.forEach(repo => {
            const option = document.createElement('option');
            option.value = repo.id.toString();
            option.textContent = repo.full_name;
            selectEl.appendChild(option);
          });
        }
      }).catch(err => {
        const errorEl = host.querySelector('#wiki3-repo-error') as HTMLElement;
        if (errorEl) {
          errorEl.textContent = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
          errorEl.style.display = 'block';
        }
      });
    }
  }
}
