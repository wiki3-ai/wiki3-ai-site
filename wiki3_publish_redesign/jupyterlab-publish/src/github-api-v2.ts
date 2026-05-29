export interface RepoRef {
  owner: string;
  repo: string;
  defaultBranch: string;
}

export interface PublishFile {
  path: string;
  content: string;
}

interface GitBlobResponse {
  sha: string;
}

interface RefResponse {
  object: { sha: string };
}

interface CommitResponse {
  sha: string;
}

interface TreeResponse {
  sha: string;
}

export class GitHubApiV2 {
  private readonly base = 'https://api.github.com';

  constructor(private readonly token: string) {}

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${this.token}`,
        'x-github-api-version': '2022-11-28',
        'content-type': 'application/json',
        ...(init.headers ?? {})
      }
    });
  }

  async getAuthenticatedUser(): Promise<{ login: string }> {
    const response = await this.request('/user');
    if (!response.ok) throw new Error(`Failed to fetch user: ${response.status}`);
    return response.json();
  }

  async listRepos(): Promise<Array<{ id: number; name: string; full_name: string; owner: { login: string }; default_branch: string }>> {
    const response = await this.request('/user/repos?per_page=100&sort=updated');
    if (!response.ok) throw new Error(`Failed to list repos: ${response.status}`);
    return response.json();
  }

  async createRepoFromTemplate(templateOwner: string, templateRepo: string, name: string, description = ''): Promise<RepoRef> {
    const user = await this.getAuthenticatedUser();
    const response = await this.request(`/repos/${templateOwner}/${templateRepo}/generate`, {
      method: 'POST',
      body: JSON.stringify({
        owner: user.login,
        name,
        description,
        private: false,
        include_all_branches: false
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to create repo from template: ${response.status} ${await response.text()}`);
    }
    const payload = await response.json();
    return { owner: payload.owner.login, repo: payload.name, defaultBranch: payload.default_branch ?? 'main' };
  }

  async enablePages(ref: RepoRef): Promise<void> {
    const sourceBody = { source: { branch: ref.defaultBranch, path: '/' } };
    const getResponse = await this.request(`/repos/${ref.owner}/${ref.repo}/pages`);
    if (getResponse.ok) {
      const update = await this.request(`/repos/${ref.owner}/${ref.repo}/pages`, {
        method: 'PUT',
        body: JSON.stringify(sourceBody)
      });
      if (!update.ok && update.status !== 204) {
        throw new Error(`Failed to update Pages settings: ${update.status} ${await update.text()}`);
      }
      return;
    }

    const create = await this.request(`/repos/${ref.owner}/${ref.repo}/pages`, {
      method: 'POST',
      body: JSON.stringify(sourceBody)
    });
    if (!create.ok && create.status !== 201) {
      throw new Error(`Failed to create Pages site: ${create.status} ${await create.text()}`);
    }
  }

  async createBlob(ref: RepoRef, content: string): Promise<string> {
    const response = await this.request(`/repos/${ref.owner}/${ref.repo}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content, encoding: 'utf-8' })
    });
    if (!response.ok) {
      throw new Error(`Failed to create blob: ${response.status} ${await response.text()}`);
    }
    const payload = (await response.json()) as GitBlobResponse;
    return payload.sha;
  }

  async getHeadCommit(ref: RepoRef): Promise<string> {
    const response = await this.request(`/repos/${ref.owner}/${ref.repo}/git/ref/heads/${ref.defaultBranch}`);
    if (!response.ok) {
      throw new Error(`Failed to get branch ref: ${response.status} ${await response.text()}`);
    }
    const payload = (await response.json()) as RefResponse;
    return payload.object.sha;
  }

  async getCommit(commitSha: string, ref: RepoRef): Promise<{ treeSha: string }> {
    const response = await this.request(`/repos/${ref.owner}/${ref.repo}/git/commits/${commitSha}`);
    if (!response.ok) {
      throw new Error(`Failed to get commit: ${response.status} ${await response.text()}`);
    }
    const payload = await response.json();
    return { treeSha: payload.tree.sha };
  }

  async createTree(ref: RepoRef, baseTree: string, files: PublishFile[]): Promise<string> {
    const tree = [] as Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }>;
    for (const file of files) {
      const sha = await this.createBlob(ref, file.content);
      tree.push({ path: file.path, mode: '100644', type: 'blob', sha });
    }

    const response = await this.request(`/repos/${ref.owner}/${ref.repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTree, tree })
    });
    if (!response.ok) {
      throw new Error(`Failed to create tree: ${response.status} ${await response.text()}`);
    }
    const payload = (await response.json()) as TreeResponse;
    return payload.sha;
  }

  async createCommit(ref: RepoRef, message: string, treeSha: string, parentCommitSha: string): Promise<string> {
    const response = await this.request(`/repos/${ref.owner}/${ref.repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message, tree: treeSha, parents: [parentCommitSha] })
    });
    if (!response.ok) {
      throw new Error(`Failed to create commit: ${response.status} ${await response.text()}`);
    }
    const payload = (await response.json()) as CommitResponse;
    return payload.sha;
  }

  async updateBranchHead(ref: RepoRef, commitSha: string): Promise<void> {
    const response = await this.request(`/repos/${ref.owner}/${ref.repo}/git/refs/heads/${ref.defaultBranch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commitSha, force: false })
    });
    if (!response.ok) {
      throw new Error(`Failed to update branch head: ${response.status} ${await response.text()}`);
    }
  }

  async publishFiles(ref: RepoRef, message: string, files: PublishFile[]): Promise<void> {
    const parent = await this.getHeadCommit(ref);
    const { treeSha: baseTree } = await this.getCommit(parent, ref);
    const newTree = await this.createTree(ref, baseTree, files);
    const commit = await this.createCommit(ref, message, newTree, parent);
    await this.updateBranchHead(ref, commit);
  }

  getPagesUrl(ref: RepoRef): string {
    return `https://${ref.owner}.github.io/${ref.repo}/`;
  }
}
