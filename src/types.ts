export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string;
  public_repos: number;
  total_private_repos?: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  private: boolean;
  description: string;
  default_branch: string;
  stargazers_count: number;
  language: string;
  updated_at: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected?: boolean;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url?: string;
}

export interface GitHubContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  content?: string;
  encoding?: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
    tree: {
      sha: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info' | 'warn';
}

export interface LocalFile {
  path: string;
  file: File;
}

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  state: string;
  body: string;
  html_url: string;
  head: {
    ref: string;
  };
  base: {
    ref: string;
  };
  user: {
    login: string;
  };
}

export interface DiffItem {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  localSize?: number;
  remoteSize?: number;
  contentDiff?: {
    addedLines: number;
    removedLines: number;
  };
}
