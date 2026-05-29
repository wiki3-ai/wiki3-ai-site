import type { NotebookPanel } from '@jupyterlab/notebook';
import { GitHubAppAuth } from './github-app-auth';
import { GitHubApiV2, type RepoRef } from './github-api-v2';
import { exportNotebookForPublish } from './notebook-exporter';
import { buildPublishBundle } from './site-manifest';

export interface PublishConfig {
  workerBaseUrl: string;
  templateOwner: string;
  templateRepo: string;
  defaultRepoNamePrefix?: string;
}

export async function publishNotebook(panel: NotebookPanel, config: PublishConfig): Promise<{ siteUrl: string; repo: RepoRef }> {
  const auth = new GitHubAppAuth(config.workerBaseUrl);
  let session = auth.getSession();
  if (!session) {
    await auth.beginLogin();
    throw new Error('Redirecting to GitHub for authorization');
  }

  const api = new GitHubApiV2(session.accessToken);
  const user = await api.getAuthenticatedUser();
  const exported = await exportNotebookForPublish(panel);

  // A production build would show a repo picker here. This script intentionally
  // picks a deterministic default to keep the initial integration small.
  const repoName = `${config.defaultRepoNamePrefix ?? 'wiki3'}-${exported.slug}`;
  const repo = await ensureRepo(api, config.templateOwner, config.templateRepo, user.login, repoName);

  const bundle = buildPublishBundle(exported, null);
  await api.publishFiles(repo, `Publish ${exported.title}`, bundle.files);
  await api.enablePages(repo);

  return { siteUrl: api.getPagesUrl(repo), repo };
}

async function ensureRepo(
  api: GitHubApiV2,
  templateOwner: string,
  templateRepo: string,
  owner: string,
  repoName: string
): Promise<RepoRef> {
  const repos = await api.listRepos();
  const existing = repos.find(repo => repo.owner.login === owner && repo.name === repoName);
  if (existing) {
    return { owner, repo: repoName, defaultBranch: existing.default_branch ?? 'main' };
  }
  return api.createRepoFromTemplate(templateOwner, templateRepo, repoName, 'Published from wiki3.ai');
}
