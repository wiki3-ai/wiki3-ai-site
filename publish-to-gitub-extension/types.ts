export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  type: string;
  name: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
  html_url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  default_branch: string;
}

export interface PublishStep {
  label: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  error?: string;
}

export interface PublishState {
  user: GitHubUser | null;
  repositories: GitHubRepo[];
  selectedRepo: GitHubRepo | null;
  steps: PublishStep[];
  publishUrl: string | null;
  isComplete: boolean;
  hasError: boolean;
}
