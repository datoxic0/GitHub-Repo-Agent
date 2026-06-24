import React, { useState, useEffect } from 'react';
import { 
  Github, Key, Search, GitBranch, FolderOpen, 
  FileCode, Play, Trash2, Eye, EyeOff, History, FolderUp, 
  Moon, Sun, LogOut, CheckCircle, RefreshCw, AlertTriangle, 
  PlusCircle, BookOpen, User, Star, ArrowRight, Shield, Globe,
  GitPullRequest
} from 'lucide-react';
import { 
  GitHubUser, GitHubRepo, GitHubBranch, 
  GitHubContentItem, GitHubCommit, ToastMessage, LocalFile
} from './types';
import Toast from './components/Toast';
import FileTree from './components/FileTree';
import { 
  CommitModal, DeleteModal, NewFileModal, 
  NewBranchModal, CommitHistoryModal, FolderUploadModal, PullRequestModal
} from './components/Modals';

export default function App() {
  // -------------------------------------------------------------
  // Base State
  // -------------------------------------------------------------
  const [token, setToken] = useState(localStorage.getItem('gh_token') || '');
  const [showToken, setShowToken] = useState(false);
  const [rememberToken, setRememberToken] = useState(true);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [repoSearch, setRepoSearch] = useState('');
  const [repoFilter, setRepoFilter] = useState<'all' | 'public' | 'private'>('all');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null); // "owner/repo"
  
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [rootFiles, setRootFiles] = useState<GitHubContentItem[]>([]);
  const [contentsCache] = useState<Map<string, GitHubContentItem[]>>(() => new Map());

  // Editor State
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileSha, setFileSha] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isEditorDisabled, setIsEditorDisabled] = useState(true);

  // Loaders
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Modal Triggers
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [isNewBranchModalOpen, setIsNewBranchModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPRModalOpen, setIsPRModalOpen] = useState(false);

  // Drag and Drop files
  const [preloadedFiles, setPreloadedFiles] = useState<LocalFile[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // History state
  const [recentCommits, setRecentCommits] = useState<GitHubCommit[]>([]);

  // Toast Alerts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Dark/Light State
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  // Add Toast helper
  const addToast = (text: string, type: 'success' | 'error' | 'warn' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // -------------------------------------------------------------
  // Theme Toggle Effect
  // -------------------------------------------------------------
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  // -------------------------------------------------------------
  // HTTP Request Helper
  // -------------------------------------------------------------
  const apiRequest = async (url: string, options: any = {}) => {
    if (!token) throw new Error('No GitHub personal token set');
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      ...options.headers,
    };
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      let errMsg = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        errMsg = errJson.message || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }
    if (response.status === 204) return null;
    return response.json();
  };

  // -------------------------------------------------------------
  // Token Validation & Loading
  // -------------------------------------------------------------
  const connectGitHub = async (overrideToken?: string) => {
    const activeToken = overrideToken || token;
    if (!activeToken) {
      addToast('Please enter a GitHub personal access token', 'warn');
      return;
    }
    setIsValidatingToken(true);
    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (!userRes.ok) throw new Error('Invalid token');
      const userData = await userRes.json();
      setUser(userData);
      if (rememberToken) {
        localStorage.setItem('gh_token', activeToken);
      } else {
        localStorage.removeItem('gh_token');
      }
      setToken(activeToken);
      addToast(`Connected as ${userData.name || userData.login}!`, 'success');
      loadRepositories(activeToken);
    } catch (err: any) {
      addToast(`Authentication failed: ${err.message}`, 'error');
      setUser(null);
    } finally {
      setIsValidatingToken(false);
    }
  };

  const loadRepositories = async (activeToken: string) => {
    setIsLoadingRepos(true);
    try {
      const reposData = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (!reposData.ok) throw new Error('Failed to load repositories');
      const rList = await reposData.json();
      setRepos(rList.sort((a: any, b: any) => b.updated_at.localeCompare(a.updated_at)));
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('gh_token');
    setToken('');
    setUser(null);
    setRepos([]);
    setSelectedRepo(null);
    setBranches([]);
    setSelectedBranch('');
    setRootFiles([]);
    contentsCache.clear();
    clearEditor();
    addToast('Disconnected from GitHub', 'info');
  };

  const clearEditor = () => {
    setSelectedFilePath(null);
    setFileSha(null);
    setEditorContent('');
    setOriginalContent('');
    setIsEditorDisabled(true);
  };

  // -------------------------------------------------------------
  // Repository & Branch Selection
  // -------------------------------------------------------------
  useEffect(() => {
    if (token) {
      connectGitHub();
    }
  }, []);

  const selectRepository = async (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    clearEditor();
    contentsCache.clear();
    const [owner, repo] = repoFullName.split('/');
    try {
      const branchesData = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`);
      setBranches(branchesData);
      
      const currentRepoObj = repos.find(r => r.full_name === repoFullName);
      const defaultB = currentRepoObj?.default_branch || branchesData[0]?.name || 'main';
      setSelectedBranch(defaultB);
      loadFilesForBranch(repoFullName, defaultB);
    } catch (err: any) {
      addToast(`Failed to load branches: ${err.message}`, 'error');
    }
  };

  const loadFilesForBranch = async (repoFullName: string, branchName: string) => {
    setIsLoadingFiles(true);
    setRootFiles([]);
    const [owner, repo] = repoFullName.split('/');
    try {
      const cacheKey = `${owner}/${repo}/${branchName}/`;
      let data: GitHubContentItem[];
      if (contentsCache.has(cacheKey)) {
        data = contentsCache.get(cacheKey)!;
      } else {
        const res = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/contents/?ref=${encodeURIComponent(branchName)}`);
        data = Array.isArray(res) ? res : [res];
        contentsCache.set(cacheKey, data);
      }
      setRootFiles(data);
    } catch (err: any) {
      addToast(`Failed to load directory files: ${err.message}`, 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const changeBranch = (branchName: string) => {
    setSelectedBranch(branchName);
    clearEditor();
    if (selectedRepo) {
      loadFilesForBranch(selectedRepo, branchName);
    }
  };

  const fetchSubDirectory = async (path: string): Promise<GitHubContentItem[]> => {
    if (!selectedRepo || !selectedBranch) return [];
    const [owner, repo] = selectedRepo.split('/');
    const cacheKey = `${owner}/${repo}/${selectedBranch}/${path}`;
    if (contentsCache.has(cacheKey)) {
      return contentsCache.get(cacheKey)!;
    }
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const res = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(selectedBranch)}`);
    const data = Array.isArray(res) ? res : [res];
    contentsCache.set(cacheKey, data);
    return data;
  };

  // -------------------------------------------------------------
  // File Content Loading & Commit Hooks
  // -------------------------------------------------------------
  const base64Decode = (str: string) => {
    const binary = atob(str);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  const loadFileContent = async (path: string, sha: string) => {
    if (!selectedRepo || !selectedBranch) return;
    const [owner, repo] = selectedRepo.split('/');
    try {
      const encodedPath = path.split('/').map(encodeURIComponent).join('/');
      const data = await apiRequest(
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(selectedBranch)}`
      );

      if (!data.content || data.encoding !== 'base64') {
        throw new Error('This file format is binary or not compatible with text editing.');
      }

      const content = base64Decode(data.content.replace(/\n/g, ''));
      setSelectedFilePath(path);
      setFileSha(data.sha || sha);
      setEditorContent(content);
      setOriginalContent(content);
      setIsEditorDisabled(false);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleCommitSubmit = async (message: string) => {
    if (!selectedRepo || !selectedBranch || !selectedFilePath) return;
    const [owner, repo] = selectedRepo.split('/');
    const encodedPath = selectedFilePath.split('/').map(encodeURIComponent).join('/');
    
    // Base64 encode
    const utf8Bytes = new TextEncoder().encode(editorContent);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < utf8Bytes.length; i += chunk) {
      binary += String.fromCharCode(...utf8Bytes.subarray(i, i + chunk));
    }
    const base64Content = btoa(binary);

    const body: any = {
      message,
      content: base64Content,
      branch: selectedBranch,
    };
    if (fileSha) body.sha = fileSha;

    try {
      const response = await apiRequest(
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        }
      );
      setFileSha(response.content.sha);
      setOriginalContent(editorContent);
      addToast('Changes committed successfully!', 'success');
      invalidateFolderCache(selectedFilePath);
    } catch (err: any) {
      addToast(`Commit failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteSubmit = async (message: string) => {
    if (!selectedRepo || !selectedBranch || !selectedFilePath || !fileSha) return;
    const [owner, repo] = selectedRepo.split('/');
    const encodedPath = selectedFilePath.split('/').map(encodeURIComponent).join('/');

    try {
      await apiRequest(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
        method: 'DELETE',
        body: JSON.stringify({
          message,
          sha: fileSha,
          branch: selectedBranch,
        }),
      });
      addToast('File deleted successfully!', 'success');
      invalidateFolderCache(selectedFilePath);
      clearEditor();
      loadFilesForBranch(selectedRepo, selectedBranch);
    } catch (err: any) {
      addToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleNewFileSubmit = async (path: string, content: string, message: string) => {
    if (!selectedRepo || !selectedBranch) return;
    const [owner, repo] = selectedRepo.split('/');
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');

    const utf8Bytes = new TextEncoder().encode(content);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < utf8Bytes.length; i += chunk) {
      binary += String.fromCharCode(...utf8Bytes.subarray(i, i + chunk));
    }
    const base64Content = btoa(binary);

    try {
      await apiRequest(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
        method: 'PUT',
        body: JSON.stringify({
          message,
          content: base64Content,
          branch: selectedBranch,
        }),
      });
      addToast(`File created: ${path}`, 'success');
      invalidateFolderCache(path);
      loadFilesForBranch(selectedRepo, selectedBranch);
    } catch (err: any) {
      addToast(`Creation failed: ${err.message}`, 'error');
    }
  };

  const handleCreateBranch = async (branchName: string) => {
    if (!selectedRepo || !selectedBranch) return;
    const [owner, repo] = selectedRepo.split('/');
    try {
      // Get branch latest commit SHA
      const refData = await apiRequest(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(selectedBranch)}`
      );
      const sha = refData.object.sha;

      await apiRequest(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha,
        }),
      });

      addToast(`Branch "${branchName}" created!`, 'success');
      
      // Reload branches
      const updatedBranches = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`);
      setBranches(updatedBranches);
      setSelectedBranch(branchName);
      loadFilesForBranch(selectedRepo, branchName);
    } catch (err: any) {
      addToast(`Failed to create branch: ${err.message}`, 'error');
    }
  };

  const fetchCommitHistory = async () => {
    if (!selectedRepo || !selectedBranch) return;
    setIsLoadingHistory(true);
    setIsHistoryModalOpen(true);
    const [owner, repo] = selectedRepo.split('/');
    try {
      const data = await apiRequest(
        `https://api.github.com/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(selectedBranch)}&per_page=15`
      );
      setRecentCommits(data);
    } catch (err: any) {
      addToast(`Failed to load history: ${err.message}`, 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!user) {
      addToast('Please connect your GitHub account first', 'warn');
      return;
    }
    const items = Array.from(e.dataTransfer.items);
    const files: LocalFile[] = [];

    const readEntry = async (item: any, prefix = '') => {
      if (typeof item.getAsFileSystemHandle === 'function') {
        const handle = await item.getAsFileSystemHandle();
        if (handle) {
          if (handle.kind === 'file') {
            const file = await handle.getFile();
            files.push({ path: prefix + handle.name, file });
          } else if (handle.kind === 'directory') {
            const readDir = async (dirHandle: any, dirPrefix: string) => {
              for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file') {
                  const file = await entry.getFile();
                  files.push({ path: dirPrefix + entry.name, file });
                } else if (entry.kind === 'directory') {
                  await readDir(entry, dirPrefix + entry.name + '/');
                }
              }
            };
            await readDir(handle, prefix + handle.name + '/');
          }
        }
      } else {
        const file = item.getAsFile();
        if (file) {
          files.push({ path: file.name, file });
        }
      }
    };

    for (const item of items) {
      await readEntry(item);
    }

    if (files.length > 0) {
      setPreloadedFiles(files);
      setIsUploadModalOpen(true);
    }
  };

  const invalidateFolderCache = (filePath: string) => {
    if (!selectedRepo || !selectedBranch) return;
    const [owner, repo] = selectedRepo.split('/');
    
    const pathsToInvalidate = new Set(['']);
    const parts = filePath.split('/');
    let accum = '';
    for (let i = 0; i < parts.length - 1; i++) {
      accum = accum ? `${accum}/${parts[i]}` : parts[i];
      pathsToInvalidate.add(accum);
    }

    pathsToInvalidate.forEach((p) => {
      contentsCache.delete(`${owner}/${repo}/${selectedBranch}/${p}`);
    });
  };

  // -------------------------------------------------------------
  // Keybinding hooks (Control+S to trigger Save)
  // -------------------------------------------------------------
  useEffect(() => {
    const handleSaveHotkey = (e: KeyboardEvent) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
      if (isSave && !isEditorDisabled && editorContent !== originalContent) {
        e.preventDefault();
        setIsCommitModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleSaveHotkey);
    return () => window.removeEventListener('keydown', handleSaveHotkey);
  }, [editorContent, originalContent, isEditorDisabled]);

  // Filter repos based on state
  const filteredRepos = repos.filter((r) => {
    const matchesSearch = r.full_name.toLowerCase().includes(repoSearch.toLowerCase());
    if (repoFilter === 'private') return matchesSearch && r.private;
    if (repoFilter === 'public') return matchesSearch && !r.private;
    return matchesSearch;
  });

  const unsavedChanges = editorContent !== originalContent;

  return (
    <div 
      className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.relatedTarget === null) {
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-blue-600/15 dark:bg-blue-500/20 backdrop-blur-xs border-4 border-dashed border-blue-500 flex flex-col items-center justify-center z-[100] pointer-events-none animate-pulse">
          <FolderUp className="w-16 h-16 text-blue-500 mb-4" />
          <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">Drop files or folders here to upload!</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Recursively parses directories, displays visual diff, and syncs safely.</p>
        </div>
      )}
      
      {/* -------------------------------------------------------------
          Left Navigation / Settings Workspace
          ------------------------------------------------------------- */}
      <aside className="w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 overflow-hidden shadow-sm z-10">
        
        {/* Token Section */}
        <div className="p-5 border-b border-slate-150 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Authentication
            </h2>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-all cursor-pointer"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-600" />}
            </button>
          </div>

          {!user ? (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-850 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl pl-3 pr-10 py-2.5 text-sm font-medium font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  title={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberToken}
                  onChange={(e) => setRememberToken(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>Save token locally for future sessions</span>
              </label>

              <button
                onClick={() => connectGitHub()}
                disabled={isValidatingToken}
                className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm font-bold"
              >
                {isValidatingToken ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Github className="w-4.5 h-4.5" />}
                Connect Account
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-xl">
              <img
                src={user.avatar_url}
                alt={user.name || user.login}
                className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 shadow-xs"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate text-slate-900 dark:text-white">
                  {user.name || user.login}
                </div>
                <div className="text-xs text-slate-500 truncate">@{user.login}</div>
              </div>
              <button
                onClick={handleDisconnect}
                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                title="Disconnect Token"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          )}
        </div>

        {/* Repositories Browser */}
        <div className="p-5 border-b border-slate-150 dark:border-slate-800 space-y-3 flex-shrink-0">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" /> Repositories
          </h2>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={repoSearch}
              disabled={!user}
              onChange={(e) => setRepoSearch(e.target.value)}
              placeholder="Search repositories..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-850 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl text-sm font-medium transition-all"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850">
            {(['all', 'private', 'public'] as const).map((filter) => (
              <button
                key={filter}
                disabled={!user}
                onClick={() => setRepoFilter(filter)}
                className={`py-1 text-xs font-bold capitalize rounded-lg transition-all cursor-pointer ${
                  repoFilter === filter
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {user && (
            <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-100 dark:border-slate-850 rounded-xl p-1 bg-slate-50/40 dark:bg-slate-950/20">
              {isLoadingRepos ? (
                <div className="flex flex-col items-center py-6 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-xs font-medium text-slate-400">Loading repos...</span>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="text-xs text-center py-6 text-slate-400">No repositories found.</div>
              ) : (
                filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => selectRepository(repo.full_name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm font-semibold transition-all cursor-pointer ${
                      selectedRepo === repo.full_name
                        ? 'bg-blue-50 dark:bg-blue-950/35 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50'
                        : 'border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{repo.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                        {repo.description || 'No description'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {repo.private ? (
                        <span className="text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold border border-rose-100 dark:border-rose-900/35">Private</span>
                      ) : (
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-100 dark:border-emerald-900/35">Public</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Branch Switcher */}
        {selectedRepo && (
          <div className="p-5 border-b border-slate-150 dark:border-slate-800 space-y-3 flex-shrink-0">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" /> Branch Selection
            </h2>
            <div className="flex gap-2">
              <select
                value={selectedBranch}
                onChange={(e) => changeBranch(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-850 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsNewBranchModalOpen(true)}
                className="btn-outline p-2.5 shrink-0 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Create New Branch"
              >
                <PlusCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          </div>
        )}

        {/* File Browser list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col min-h-0">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5" /> Directory Trees
          </h2>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {!selectedRepo ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                <span className="text-xs font-medium leading-relaxed">
                  Select a repository to view branches and browser directories
                </span>
              </div>
            ) : isLoadingFiles ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs font-medium text-slate-400">Loading directory tree...</span>
              </div>
            ) : rootFiles.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                Repository is empty. Create a file to get started.
              </div>
            ) : (
              <FileTree
                items={rootFiles}
                selectedPath={selectedFilePath}
                onFileSelect={loadFileContent}
                fetchDirectory={fetchSubDirectory}
              />
            )}
          </div>
        </div>

        {/* Electron Desktop Mode Badge */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Desktop Companion</span>
          </div>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md font-extrabold">v1.0.0 (Ready)</span>
        </div>
      </aside>

      {/* -------------------------------------------------------------
          Right Code Workspace & Editor
          ------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        
        {/* Workspace Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selectedRepo) {
                  contentsCache.clear();
                  loadFilesForBranch(selectedRepo, selectedBranch);
                  addToast('Directory tree refreshed!', 'success');
                }
              }}
              disabled={!selectedRepo}
              className="btn-outline px-3.5 py-2 flex items-center gap-2 text-sm font-semibold cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={() => setIsNewFileModalOpen(true)}
              disabled={!selectedRepo}
              className="btn-outline px-3.5 py-2 flex items-center gap-2 text-sm font-semibold cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-500" /> New File
            </button>
            <button
              onClick={fetchCommitHistory}
              disabled={!selectedRepo}
              className="btn-outline px-3.5 py-2 flex items-center gap-2 text-sm font-semibold cursor-pointer"
            >
              <History className="w-4 h-4 text-blue-500" /> History
            </button>
            <button
              onClick={() => setIsPRModalOpen(true)}
              disabled={!selectedRepo}
              className="btn-outline px-3.5 py-2 flex items-center gap-2 text-sm font-semibold cursor-pointer"
            >
              <GitPullRequest className="w-4 h-4 text-purple-500" /> Pull Requests
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              disabled={!user}
              className="btn-primary px-4 py-2 flex items-center gap-2 text-sm font-bold cursor-pointer shadow-sm"
            >
              <FolderUp className="w-4 h-4" /> Upload Folder
            </button>
          </div>

          {selectedRepo && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-850">
              <span className="text-slate-400">Target:</span>
              <span className="text-blue-600 dark:text-blue-400">{selectedRepo}</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-emerald-600 dark:text-emerald-400">{selectedBranch}</span>
            </div>
          )}
        </div>

        {/* Code Editor Frame */}
        <div className="flex-1 flex flex-col p-6 min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 truncate pr-4">
              {selectedFilePath ? (
                <span className="font-mono bg-white dark:bg-slate-900 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs">
                  {selectedFilePath}
                </span>
              ) : (
                'No file active'
              )}
            </div>

            {unsavedChanges && !isEditorDisabled && (
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/35 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> Unsaved changes (Ctrl+S to Save)
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              disabled={isEditorDisabled}
              placeholder={
                selectedRepo
                  ? "Select a file from the Directory Trees sidebar to edit, or click 'New File' or 'Upload Folder' to add contents."
                  : "Connect with a GitHub Token and select a repository to load the editor."
              }
              className="flex-1 w-full p-6 outline-none resize-none font-mono text-sm leading-relaxed bg-transparent text-slate-900 dark:text-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 shrink-0">
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isEditorDisabled}
              className="btn-danger px-5 py-2.5 text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-40"
            >
              <Trash2 className="w-4.5 h-4.5" /> Delete File
            </button>
            <button
              onClick={() => setIsCommitModalOpen(true)}
              disabled={isEditorDisabled || !unsavedChanges}
              className="btn-primary px-6 py-2.5 text-sm font-bold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-40"
            >
              <CheckCircle className="w-4.5 h-4.5" /> Commit Changes
            </button>
          </div>
        </div>
      </main>

      {/* -------------------------------------------------------------
          Interactive Modals Overlay
          ------------------------------------------------------------- */}
      <CommitModal
        isOpen={isCommitModalOpen}
        onClose={() => setIsCommitModalOpen(false)}
        onCommit={handleCommitSubmit}
        filePath={selectedFilePath || ''}
        fileContent={editorContent}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteSubmit}
        filePath={selectedFilePath || ''}
      />

      <NewFileModal
        isOpen={isNewFileModalOpen}
        onClose={() => setIsNewFileModalOpen(false)}
        onCreate={handleNewFileSubmit}
      />

      <NewBranchModal
        isOpen={isNewBranchModalOpen}
        onClose={() => setIsNewBranchModalOpen(false)}
        onCreate={handleCreateBranch}
        currentBranch={selectedBranch}
      />

      <CommitHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        commits={recentCommits}
        isLoading={isLoadingHistory}
        currentBranch={selectedBranch}
      />

      <FolderUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setPreloadedFiles(null);
        }}
        repos={repos}
        currentRepo={selectedRepo}
        apiRequest={apiRequest}
        toast={addToast}
        loadRepos={() => loadRepositories(token)}
        preloadedFiles={preloadedFiles}
        onClearPreloadedFiles={() => setPreloadedFiles(null)}
        onUploadSuccess={async () => {
          if (selectedRepo) {
            contentsCache.clear();
            await loadFilesForBranch(selectedRepo, selectedBranch);
          }
        }}
      />

      <PullRequestModal
        isOpen={isPRModalOpen}
        onClose={() => setIsPRModalOpen(false)}
        selectedRepo={selectedRepo}
        currentBranch={selectedBranch}
        branches={branches}
        apiRequest={apiRequest}
        toast={addToast}
      />

      {/* -------------------------------------------------------------
          Dynamic Toast Alerts
          ------------------------------------------------------------- */}
      <Toast toasts={toasts} removeToast={removeToast} />

    </div>
  );
}
