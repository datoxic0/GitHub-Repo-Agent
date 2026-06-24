import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, GitCommit, Trash2, FilePlus, GitBranch, 
  Settings, FolderUp, RefreshCw, AlertTriangle, 
  HelpCircle, Shield, Globe, ShieldAlert, CheckCircle2,
  GitPullRequest, Check, FileText, Plus, Search, AlertCircle
} from 'lucide-react';
import { GitHubRepo, GitHubCommit, LocalFile, GitHubBranch, GitHubPR, DiffItem } from '../types';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function ModalWrapper({ isOpen, onClose, title, children }: ModalWrapperProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// -------------------------------------------------------------
// Secret Scanner Utility
// -------------------------------------------------------------
export function scanForSecrets(content: string): string[] {
  const foundSecrets: string[] = [];
  if (!content) return foundSecrets;

  // 1. Cryptographic Private Key
  if (/-----BEGIN [A-Z ]+ PRIVATE KEY-----/i.test(content)) {
    foundSecrets.push("Cryptographic Private Key (RSA/ECC/SSH)");
  }

  // 2. GitHub Personal Access Tokens (classic or fine-grained)
  if (/ghp_[a-zA-Z0-9]{36}/.test(content) || /github_pat_[a-zA-Z0-9_]{82}/.test(content)) {
    foundSecrets.push("GitHub Personal Access Token (PAT)");
  }

  // 3. AWS Credentials
  if (/(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/.test(content)) {
    foundSecrets.push("AWS Access Key ID");
  }
  if (/aws_secret_access_key\s*[:=]\s*['"][a-zA-Z0-9+/]{40}['"]/i.test(content)) {
    foundSecrets.push("AWS Secret Access Key");
  }

  // 4. Slack Webhooks
  if (/https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/.test(content)) {
    foundSecrets.push("Slack Webhook URL");
  }

  // 5. Google / Gemini API Keys
  if (/AIzaSy[a-zA-Z0-9_\-]{33}/.test(content)) {
    foundSecrets.push("Google / Gemini API Key");
  }

  // 6. JSON Web Token (JWT)
  if (/ey[a-zA-Z0-9_\-]+\.ey[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/.test(content)) {
    foundSecrets.push("JSON Web Token (JWT)");
  }

  return foundSecrets;
}

// -------------------------------------------------------------
// Commit Modal
// -------------------------------------------------------------
interface CommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommit: (message: string) => Promise<void>;
  filePath: string;
  fileContent?: string;
}

export function CommitModal({ isOpen, onClose, onCommit, filePath, fileContent = '' }: CommitModalProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bypassCheck, setBypassCheck] = useState(false);

  const detectedSecrets = scanForSecrets(fileContent);
  const hasSecrets = detectedSecrets.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSecrets && !bypassCheck) {
      return;
    }
    setSubmitting(true);
    try {
      await onCommit(message.trim() || `Update ${filePath}`);
      setMessage('');
      setBypassCheck(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setBypassCheck(false);
    }
  }, [isOpen]);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Commit Changes">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          You are writing changes to <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs font-semibold">{filePath}</code>. Please write a descriptive commit message below.
        </p>

        {hasSecrets && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 rounded-xl border-2 border-rose-200 dark:border-rose-900/60 space-y-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-rose-950 dark:text-rose-300">⚠️ Potential Credentials/Secrets Detected!</h4>
                <p className="text-xs text-rose-700 dark:text-rose-400/90 mt-0.5 leading-relaxed">
                  We found potential secrets in the content you are about to commit:
                </p>
                <ul className="list-disc list-inside mt-2 text-xs font-semibold font-mono space-y-1">
                  {detectedSecrets.map((secret, i) => (
                    <li key={i}>{secret}</li>
                  ))}
                </ul>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs font-bold text-rose-900 dark:text-rose-300 bg-rose-100/40 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200/50 dark:border-rose-900/40 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bypassCheck}
                onChange={(e) => setBypassCheck(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300 dark:border-rose-700"
              />
              <span>I understand the risk and want to force commit this file anyway</span>
            </label>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Commit Message
          </label>
          <input
            type="text"
            required
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Update ${filePath}`}
            className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-medium transition-all"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline px-4 py-2 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || (hasSecrets && !bypassCheck)}
            className={`px-5 py-2 flex items-center gap-2 cursor-pointer rounded-xl font-bold transition-all text-sm shadow-sm ${
              hasSecrets && !bypassCheck
                ? 'bg-rose-100 text-rose-400 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-800 dark:border-rose-950 cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <GitCommit className="w-4 h-4" />
                Commit changes
              </>
            )}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// -------------------------------------------------------------
// Delete File Modal
// -------------------------------------------------------------
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (message: string) => Promise<void>;
  filePath: string;
}

export function DeleteModal({ isOpen, onClose, onDelete, filePath }: DeleteModalProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onDelete(message.trim() || `Delete ${filePath}`);
      setMessage('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Delete File">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-900 flex items-start gap-3">
          <Trash2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">
            Warning: This action is permanent and will commit a deletion of the file <code className="font-mono bg-rose-100/50 dark:bg-rose-900/30 px-1 rounded">{filePath}</code>.
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Commit Message
          </label>
          <input
            type="text"
            required
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Delete ${filePath}`}
            className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-rose-500 dark:focus:border-rose-600 rounded-xl p-3 text-sm font-medium transition-all"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline px-4 py-2 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-danger px-5 py-2 flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Confirm Delete
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// -------------------------------------------------------------
// New File Modal
// -------------------------------------------------------------
interface NewFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (path: string, content: string, message: string) => Promise<void>;
}

export function NewFileModal({ isOpen, onClose, onCreate }: NewFileModalProps) {
  const [filePath, setFilePath] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bypassCheck, setBypassCheck] = useState(false);

  const detectedSecrets = scanForSecrets(content);
  const hasSecrets = detectedSecrets.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePath.trim()) return;
    if (hasSecrets && !bypassCheck) {
      return;
    }
    setSubmitting(true);
    try {
      await onCreate(
        filePath.trim(),
        content,
        message.trim() || `Create ${filePath.trim()}`
      );
      setFilePath('');
      setContent('');
      setMessage('');
      setBypassCheck(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setBypassCheck(false);
    }
  }, [isOpen]);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Create New File">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            File Path
          </label>
          <input
            type="text"
            required
            autoFocus
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="e.g. src/components/Sidebar.tsx"
            className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-medium transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            File Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="// Add your code or text here..."
            className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-medium transition-all font-mono min-h-[160px]"
          />
        </div>

        {hasSecrets && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 rounded-xl border-2 border-rose-200 dark:border-rose-900/60 space-y-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-rose-950 dark:text-rose-300">⚠️ Potential Credentials/Secrets Detected!</h4>
                <p className="text-xs text-rose-700 dark:text-rose-400/90 mt-0.5 leading-relaxed">
                  We found potential secrets in your file content:
                </p>
                <ul className="list-disc list-inside mt-2 text-xs font-semibold font-mono space-y-1">
                  {detectedSecrets.map((secret, i) => (
                    <li key={i}>{secret}</li>
                  ))}
                </ul>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs font-bold text-rose-900 dark:text-rose-300 bg-rose-100/40 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200/50 dark:border-rose-900/40 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bypassCheck}
                onChange={(e) => setBypassCheck(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300 dark:border-rose-700"
              />
              <span>I understand the risk and want to force commit this file anyway</span>
            </label>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Commit Message
          </label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Create ${filePath || 'file'}`}
            className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-medium transition-all"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline px-4 py-2 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !filePath.trim() || (hasSecrets && !bypassCheck)}
            className={`px-5 py-2 flex items-center gap-2 cursor-pointer rounded-xl font-bold transition-all text-sm shadow-sm ${
              hasSecrets && !bypassCheck
                ? 'bg-rose-100 text-rose-400 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-800 dark:border-rose-950 cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FilePlus className="w-4 h-4" />
            )}
            Create and Commit
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// -------------------------------------------------------------
// New Branch Modal
// -------------------------------------------------------------
interface NewBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (branchName: string) => Promise<void>;
  currentBranch: string;
}

export function NewBranchModal({ isOpen, onClose, onCreate, currentBranch }: NewBranchModalProps) {
  const [branchName, setBranchName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;
    setSubmitting(true);
    try {
      await onCreate(branchName.trim());
      setBranchName('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Create New Branch">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This will branch off from the currently active branch: <strong className="text-blue-600 dark:text-blue-400 font-mono text-sm">{currentBranch}</strong>.
        </p>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Branch Name
          </label>
          <input
            type="text"
            required
            autoFocus
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="e.g. feature/add-analytics"
            className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-medium transition-all font-mono"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline px-4 py-2 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !branchName.trim()}
            className="btn-primary px-5 py-2 flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <GitBranch className="w-4 h-4" />
            )}
            Create Branch
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// -------------------------------------------------------------
// Commit History Modal
// -------------------------------------------------------------
interface CommitHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  commits: GitHubCommit[];
  isLoading: boolean;
  currentBranch: string;
}

export function CommitHistoryModal({ isOpen, onClose, commits, isLoading, currentBranch }: CommitHistoryModalProps) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={`Commit History: ${currentBranch}`}>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-2" />
          <span className="text-sm font-medium text-slate-500">Retrieving commits...</span>
        </div>
      ) : commits.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          No commits found on this branch.
        </div>
      ) : (
        <div className="space-y-3">
          {commits.map((commit) => (
            <div
              key={commit.sha}
              className="flex gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100/50 dark:hover:bg-slate-950/80 transition-colors"
            >
              <img
                src={commit.author?.avatar_url || 'https://github.com/identicons/git.png'}
                alt={commit.commit.author.name}
                className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {commit.commit.message.split('\n')[0]}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {commit.author?.login || commit.commit.author.name}
                  </span>
                  <span>•</span>
                  <span>{new Date(commit.commit.author.date).toLocaleString()}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <code className="px-1.5 py-0.5 bg-slate-150 dark:bg-slate-800 rounded font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {commit.sha.substring(0, 7)}
                </code>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalWrapper>
  );
}

// -------------------------------------------------------------
// Folder Upload Modal (Advanced Combine / Sync / Diff / Duplicate-Detection)
// -------------------------------------------------------------
interface FolderUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  repos: GitHubRepo[];
  currentRepo: string | null;
  apiRequest: (url: string, options?: any) => Promise<any>;
  toast: (message: string, type?: 'success' | 'error' | 'warn' | 'info') => void;
  onUploadSuccess: () => Promise<void>;
  loadRepos: () => Promise<void>;
  preloadedFiles?: LocalFile[] | null;
  onClearPreloadedFiles?: () => void;
  userLogin?: string;
}

export function FolderUploadModal({
  isOpen,
  onClose,
  repos,
  currentRepo,
  apiRequest,
  toast,
  onUploadSuccess,
  loadRepos,
  preloadedFiles,
  onClearPreloadedFiles,
  userLogin,
}: FolderUploadModalProps) {
  const [uploadMode, setUploadMode] = useState<'new' | 'existing'>('new');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoVisibility, setNewRepoVisibility] = useState<'public' | 'private'>('private');
  const [existingRepo, setExistingRepo] = useState('');
  const [existingBranch, setExistingBranch] = useState('');
  const [branchList, setBranchList] = useState<GitHubBranch[]>([]);
  const [commitMsg, setCommitMsg] = useState('');
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressText, setProgressText] = useState('');

  // Diff & Sync States
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [trueSyncMode, setTrueSyncMode] = useState(false);
  const [isAnalyzingDiff, setIsAnalyzingDiff] = useState(false);
  const [computedDiffs, setComputedDiffs] = useState<DiffItem[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Secret Scanning States
  const [detectedSecrets, setDetectedSecrets] = useState<{ filePath: string; secrets: string[] }[]>([]);
  const [isScanningSecrets, setIsScanningSecrets] = useState(false);
  const [bypassCheck, setBypassCheck] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBypassCheck(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (localFiles.length === 0) {
      setDetectedSecrets([]);
      return;
    }

    const runScan = async () => {
      setIsScanningSecrets(true);
      const results: { filePath: string; secrets: string[] }[] = [];
      const textExtensions = ['txt', 'js', 'ts', 'tsx', 'jsx', 'json', 'yml', 'yaml', 'md', 'env', 'xml', 'conf', 'config', 'sh', 'py', 'go', 'rs', 'cpp', 'h', 'java', 'cs', 'html', 'css', 'php', 'rb'];

      const scanLimit = Math.min(localFiles.length, 100);
      for (let i = 0; i < scanLimit; i++) {
        const { path, file } = localFiles[i];
        if (file.size < 1024 * 1024) { // < 1MB
          const ext = path.split('.').pop()?.toLowerCase() || '';
          if (textExtensions.includes(ext) || file.type.startsWith('text/') || ext === '') {
            try {
              const text = await file.text();
              const secrets = scanForSecrets(text);
              if (secrets.length > 0) {
                results.push({ filePath: path, secrets });
              }
            } catch (_) {
              // ignore parse errors
            }
          }
        }
      }
      setDetectedSecrets(results);
      setIsScanningSecrets(false);
    };

    runScan();
  }, [localFiles]);

  // Auto set existing repo values and loaded files
  useEffect(() => {
    if (repos.length > 0) {
      const defaultRepo = currentRepo || repos[0].full_name;
      setExistingRepo(defaultRepo);
    }
  }, [repos, currentRepo]);

  useEffect(() => {
    if (preloadedFiles && preloadedFiles.length > 0) {
      setLocalFiles(preloadedFiles);
      toast(`Loaded ${preloadedFiles.length} files from drag-and-drop!`, 'info');
    }
  }, [preloadedFiles]);

  // Duplicate detection
  useEffect(() => {
    if (uploadMode === 'new' && newRepoName.trim()) {
      const name = newRepoName.trim().toLowerCase();
      const match = repos.find(r => r.name.toLowerCase() === name);
      if (match) {
        setDuplicateWarning(`⚠️ Repository "${match.name}" already exists! Creating it under this name will fail. Choose another name or use "Push to Existing Repo" mode.`);
      } else {
        setDuplicateWarning('');
      }
    } else {
      setDuplicateWarning('');
    }
  }, [newRepoName, uploadMode, repos]);

  // Load branches when existing repo changes
  useEffect(() => {
    if (uploadMode === 'existing' && existingRepo) {
      const loadBranches = async () => {
        setIsLoadingBranches(true);
        const [owner, repo] = existingRepo.split('/');
        try {
          const branches = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`);
          setBranchList(branches);
          if (branches.length > 0) {
            setExistingBranch(branches[0].name);
          }
        } catch (err: any) {
          toast(`Failed to load branches: ${err.message}`, 'error');
        } finally {
          setIsLoadingBranches(false);
        }
      };
      loadBranches();
    }
  }, [existingRepo, uploadMode]);

  // Calculate Diff between local and remote
  const analyzeFileDiff = async (filesToAnalyze: LocalFile[]) => {
    if (uploadMode === 'new') {
      // For a new repo, all files are added
      const newDiffs: DiffItem[] = filesToAnalyze.map(lf => ({
        path: lf.path,
        type: 'added',
        localSize: lf.file.size,
      }));
      setComputedDiffs(newDiffs);
      return;
    }

    if (!existingRepo || !existingBranch) return;
    setIsAnalyzingDiff(true);
    setComputedDiffs([]);

    const [owner, repo] = existingRepo.split('/');
    try {
      // Retrieve recursive tree from remote
      let remoteTreeItems: any[] = [];
      try {
        const refObj = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(existingBranch)}`);
        const commitObj = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/git/commits/${refObj.object.sha}`);
        const treeObj = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/git/trees/${commitObj.tree.sha}?recursive=1`);
        remoteTreeItems = treeObj.tree || [];
      } catch (_) {
        // branch does not exist or empty
      }

      const diffs: DiffItem[] = [];
      const remoteMap = new Map<string, any>();
      remoteTreeItems.forEach(item => {
        if (item.type === 'blob') {
          remoteMap.set(item.path, item);
        }
      });

      const localMap = new Set<string>();

      // Compare local files
      filesToAnalyze.forEach(({ path, file }) => {
        localMap.add(path);
        const remoteItem = remoteMap.get(path);
        if (!remoteItem) {
          diffs.push({
            path,
            type: 'added',
            localSize: file.size,
          });
        } else {
          diffs.push({
            path,
            type: 'modified',
            localSize: file.size,
            remoteSize: remoteItem.size,
          });
        }
      });

      // Check for deleted remote files (only relevant if True Sync Mode is selected)
      remoteMap.forEach((item, path) => {
        if (!localMap.has(path)) {
          diffs.push({
            path,
            type: 'deleted',
            remoteSize: item.size,
          });
        }
      });

      setComputedDiffs(diffs.sort((a, b) => a.path.localeCompare(b.path)));
    } catch (err: any) {
      toast(`Diff analysis failed: ${err.message}`, 'error');
    } finally {
      setIsAnalyzingDiff(false);
    }
  };

  useEffect(() => {
    if (localFiles.length > 0) {
      analyzeFileDiff(localFiles);
    }
  }, [localFiles, uploadMode, existingRepo, existingBranch, trueSyncMode]);

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  };

  const selectFolderPicker = async () => {
    if (!(window as any).showDirectoryPicker) {
      toast('Your browser does not support folder uploads. Please use a modern Chromium browser like Chrome or Edge.', 'error');
      return;
    }

    let dirHandle;
    try {
      dirHandle = await (window as any).showDirectoryPicker();
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast(`Folder selection failed: ${e.message}`, 'error');
      }
      return;
    }

    const files: LocalFile[] = [];
    const readDir = async (handle: any, prefix = '') => {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          files.push({ path: prefix + entry.name, file });
        } else if (entry.kind === 'directory') {
          await readDir(entry, prefix + entry.name + '/');
        }
      }
    };

    await readDir(dirHandle);

    if (files.length === 0) {
      toast('No files found in the selected folder.', 'warn');
      return;
    }

    setLocalFiles(files);
  };

  const handleUpload = async () => {
    if (localFiles.length === 0) {
      toast('Please select a folder or files first.', 'warn');
      return;
    }

    setIsUploading(true);
    setProgressPercent(0);
    setProgressText('Preparing payloads...');

    try {
      let owner = '';
      let repo = '';
      let branch = 'main';
      let parentSha: string | null = null;
      let baseTreeSha: string | null = null;

      // 1. Setup Repo
      if (uploadMode === 'new') {
        const repoName = newRepoName.trim();
        if (!repoName) {
          toast('Please enter a repository name.', 'error');
          setIsUploading(false);
          return;
        }

        setProgressText(`Creating new ${newRepoVisibility} repository: "${repoName}" on GitHub...`);
        const repoObj = await apiRequest('https://api.github.com/user/repos', {
          method: 'POST',
          body: JSON.stringify({
            name: repoName,
            description: newRepoDesc.trim(),
            private: newRepoVisibility === 'private',
            auto_init: false,
          }),
        });

        owner = repoObj.owner.login;
        repo = repoObj.name;
        branch = repoObj.default_branch || 'main';
      } else {
        if (!existingRepo || !existingBranch) {
          toast('Please choose a repository and a branch.', 'error');
          setIsUploading(false);
          return;
        }
        [owner, repo] = existingRepo.split('/');
        branch = existingBranch;

        setProgressText('Fetching remote commit ref history...');
        try {
          const refObj = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
          parentSha = refObj.object.sha;

          const commitObj = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/git/commits/${parentSha}`);
          baseTreeSha = commitObj.tree.sha;
        } catch (err) {
          parentSha = null;
          baseTreeSha = null;
        }
      }

      // 2. Create blobs
      const blobs: { path: string; mode: string; type: string; sha: string }[] = [];
      let index = 0;

      for (const { path, file } of localFiles) {
        if (file.size > 100 * 1024 * 1024) {
          throw new Error(`File "${path}" exceeds 100MB. GitHub rejects files larger than 100MB.`);
        }

        setProgressText(`Uploading file ${index + 1} of ${localFiles.length}:\n${path}`);
        setProgressPercent(Math.round((index / localFiles.length) * 80)); // scale up to 80%

        const arrayBuf = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuf);

        const blobObj = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({
            content: base64,
            encoding: 'base64',
          }),
        });

        blobs.push({
          path,
          mode: '100644',
          type: 'blob',
          sha: blobObj.sha,
        });

        index++;
      }

      // 3. Create tree
      setProgressText('Assembling files into a new tree structure on GitHub...');
      setProgressPercent(85);

      const treePayload: any = { tree: blobs };
      if (baseTreeSha && !trueSyncMode) {
        treePayload.base_tree = baseTreeSha;
      }

      const treeObj = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        body: JSON.stringify(treePayload),
      });

      // 4. Create commit
      setProgressText('Creating commit on GitHub...');
      setProgressPercent(90);

      const commitMessage = commitMsg.trim() || (uploadMode === 'new' ? 'Initial commit from local folder' : 'Updated files from local folder');

      const commitObj = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({
          message: commitMessage,
          tree: treeObj.sha,
          parents: parentSha ? [parentSha] : [],
        }),
      });

      // 5. Update/create ref
      setProgressText('Updating branch references on GitHub...');
      setProgressPercent(95);

      if (uploadMode === 'new') {
        // Create ref
        await apiRequest(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
          method: 'POST',
          body: JSON.stringify({
            ref: `refs/heads/${branch}`,
            sha: commitObj.sha,
          }),
        });
      } else {
        // Update ref
        await apiRequest(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            sha: commitObj.sha,
            force: trueSyncMode, // force update when doing true sync
          }),
        });
      }

      setProgressPercent(100);
      setProgressText('Successfully completed folder upload!');
      toast(uploadMode === 'new' ? `Repository "${owner}/${repo}" created and folder uploaded!` : `Successfully updated branch "${branch}" in "${owner}/${repo}"!`, 'success');

      if (uploadMode === 'new') {
        await loadRepos();
      }

      if (onClearPreloadedFiles) onClearPreloadedFiles();
      await onUploadSuccess();
      onClose();
    } catch (err: any) {
      toast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Upload Folder to GitHub">
      {!isUploading ? (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-xl border border-blue-100 dark:border-blue-900 flex items-start gap-3">
            <FolderUp className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
            <div className="text-sm">
              You can select a local folder from your computer. The agent will read all files, prepare git tree objects, create commits, and safely push them to GitHub.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setUploadMode('new')}
              className={`flex items-center justify-center py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
                uploadMode === 'new'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Create New Repository
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('existing')}
              className={`flex items-center justify-center py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
                uploadMode === 'existing'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Push to Existing Repo
            </button>
          </div>

          {uploadMode === 'new' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Repository Name
                </label>
                <input
                  type="text"
                  required
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="e.g. my-awesome-app"
                  className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-medium transition-all"
                />
                {duplicateWarning && (
                  <p className="text-xs font-semibold text-rose-500 dark:text-rose-400 mt-1.5 leading-relaxed bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/35">
                    {duplicateWarning}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newRepoDesc}
                  onChange={(e) => setNewRepoDesc(e.target.value)}
                  placeholder="Enter a brief description of the project"
                  className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Visibility
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="repoVisibility"
                      checked={newRepoVisibility === 'private'}
                      onChange={() => setNewRepoVisibility('private')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Shield className="w-4 h-4 text-rose-500" /> Private
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="repoVisibility"
                      checked={newRepoVisibility === 'public'}
                      onChange={() => setNewRepoVisibility('public')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Globe className="w-4 h-4 text-emerald-500" /> Public
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Select Repository
                </label>
                <select
                  value={existingRepo}
                  onChange={(e) => setExistingRepo(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-medium transition-all"
                >
                  {repos.map((r) => (
                    <option key={r.full_name} value={r.full_name}>
                      {r.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Select Target Branch
                  </label>
                  {isLoadingBranches ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium py-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> Loaded branches...
                    </div>
                  ) : (
                    <select
                      value={existingBranch}
                      onChange={(e) => setExistingBranch(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-medium transition-all"
                    >
                      {branchList.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Synchronize Mode
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer py-2.5">
                    <input
                      type="checkbox"
                      checked={trueSyncMode}
                      onChange={(e) => setTrueSyncMode(e.target.checked)}
                      className="w-4.5 h-4.5 text-blue-600 rounded"
                    />
                    <span>True Sync (Delete remote missing files)</span>
                  </label>
                </div>
              </div>

              {trueSyncMode && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-250 dark:border-amber-900/40 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                  <div className="text-xs leading-relaxed">
                    <span className="font-bold">⚠️ High Risk Operation:</span> True Sync Mode will force-align your remote GitHub branch to match your local folder exactly. Any file that exists on remote but is not present in your local selection will be permanently <strong className="text-rose-500">Deleted</strong>.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Local Folder Selection Buttons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Local Assets Selection
            </label>
            <div className="flex gap-3 items-center">
              <button
                type="button"
                onClick={selectFolderPicker}
                className="btn-outline px-4 py-2.5 flex items-center gap-2 text-sm font-semibold cursor-pointer"
              >
                <FolderUp className="w-4 h-4 text-blue-500" /> Select Folder on PC
              </button>
              {localFiles.length > 0 && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/35">
                  ✓ {localFiles.length} files loaded
                </span>
              )}
            </div>
          </div>

          {/* INTERACTIVE DIFF VIEW PANEL */}
          {localFiles.length > 0 && (
            <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950/40 p-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Review Changes / File Diff</span>
                {isAnalyzingDiff ? (
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin text-blue-500" /> Computing diff...</span>
                ) : (
                  <span className="text-xs font-bold text-slate-500">
                    {computedDiffs.filter(d => d.type === 'added').length} Added • {computedDiffs.filter(d => d.type === 'modified').length} Modified • {computedDiffs.filter(d => d.type === 'deleted' && trueSyncMode).length} Deleted
                  </span>
                )}
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                {computedDiffs.map((diff) => {
                  let badge = 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40';
                  let label = 'Add';
                  if (diff.type === 'modified') {
                    badge = 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40';
                    label = 'Modify';
                  } else if (diff.type === 'deleted') {
                    badge = 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40';
                    label = 'Delete';
                    if (!trueSyncMode) return null; // don't list deleted remote files if trueSync is off
                  }

                  return (
                    <div key={diff.path} className="flex items-center justify-between p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${badge}`}>
                          {label}
                        </span>
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">{diff.path}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {diff.localSize !== undefined ? `${(diff.localSize/1024).toFixed(1)} KB` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {detectedSecrets.length > 0 && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 rounded-xl border-2 border-rose-200 dark:border-rose-900/60 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 dark:border-rose-900/40 pb-2 mb-2">
                    <div>
                      <h4 className="font-bold text-sm text-rose-950 dark:text-rose-300">⚠️ Potential Credentials/Secrets Found in Upload Files!</h4>
                      <p className="text-xs text-rose-700 dark:text-rose-400/90 mt-0.5 leading-relaxed">
                        We detected sensitive keys in the following files:
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const flaggedPaths = detectedSecrets.map(ds => ds.filePath);
                        setLocalFiles(prev => prev.filter(f => !flaggedPaths.includes(f.path)));
                        toast(`Excluded all ${flaggedPaths.length} flagged files from upload`, 'info');
                      }}
                      className="shrink-0 text-[11px] bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap self-start sm:self-center"
                    >
                      Ignore/Exclude All {detectedSecrets.length} Files
                    </button>
                  </div>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
                    {detectedSecrets.map((item, i) => (
                      <div key={i} className="text-xs flex items-center justify-between gap-3 p-2 bg-white/60 dark:bg-rose-950/30 border border-rose-100/60 dark:border-rose-900/20 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold font-mono text-rose-900 dark:text-rose-300 truncate block">{item.filePath}</span>
                          <ul className="list-disc list-inside ml-2 text-[10px] text-rose-600 dark:text-rose-400/90 font-semibold">
                            {item.secrets.map((secret, j) => (
                              <li key={j}>{secret}</li>
                            ))}
                          </ul>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setLocalFiles(prev => prev.filter(f => f.path !== item.filePath));
                            toast(`Excluded "${item.filePath}" from upload`, 'info');
                          }}
                          className="shrink-0 text-[10px] bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800 text-rose-700 dark:text-rose-200 px-2 py-1 rounded font-bold border border-rose-200 dark:border-rose-800/40 transition-all cursor-pointer"
                        >
                          Exclude File
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-xs font-bold text-rose-900 dark:text-rose-300 bg-rose-100/40 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200/50 dark:border-rose-900/40 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bypassCheck}
                  onChange={(e) => setBypassCheck(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300 dark:border-rose-700"
                />
                <span>I understand the risk and want to force commit/upload these files anyway</span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Commit Message
            </label>
            <input
              type="text"
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              placeholder={uploadMode === 'new' ? 'Initial commit from local folder' : 'Updated files from local folder'}
              className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-medium transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800 font-semibold">
            <button
              type="button"
              onClick={() => {
                if (onClearPreloadedFiles) onClearPreloadedFiles();
                onClose();
              }}
              className="btn-outline px-4 py-2 cursor-pointer text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={localFiles.length === 0 || !!duplicateWarning || (detectedSecrets.length > 0 && !bypassCheck)}
              onClick={handleUpload}
              className={`px-5 py-2 flex items-center gap-2 cursor-pointer text-sm font-bold rounded-xl transition-all shadow-sm ${
                (detectedSecrets.length > 0 && !bypassCheck)
                  ? 'bg-rose-100 text-rose-400 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-800 dark:border-rose-950 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              <FolderUp className="w-4 h-4" />
              Begin Sync Upload
            </button>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center space-y-5">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, ease: 'linear', duration: 3 }}
              className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-blue-600 dark:border-t-blue-500"
            />
            <FolderUp className="w-10 h-10 text-blue-600 dark:text-blue-500 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Pushing Your Repository Data</h4>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-850 h-20 flex items-center justify-center max-w-md mx-auto whitespace-pre-line">
              {progressText}
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              <span>Overall Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-blue-600 dark:bg-blue-500"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Do not close this modal or reload your browser during operations.
          </p>
        </div>
      )}
    </ModalWrapper>
  );
}

// -------------------------------------------------------------
// Pull Request Creation & Merging Modal
// -------------------------------------------------------------
interface PullRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRepo: string | null;
  branches: GitHubBranch[];
  currentBranch: string;
  apiRequest: (url: string, options?: any) => Promise<any>;
  toast: (message: string, type?: 'success' | 'error' | 'warn' | 'info') => void;
}

export function PullRequestModal({
  isOpen,
  onClose,
  selectedRepo,
  branches,
  currentBranch,
  apiRequest,
  toast,
}: PullRequestModalProps) {
  const [prList, setPrList] = useState<GitHubPR[]>([]);
  const [isLoadingPRs, setIsLoadingPRs] = useState(false);

  // Form states
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [prBase, setPrBase] = useState('main');
  const [prHead, setPrHead] = useState(currentBranch);
  const [isSubmittingPR, setIsSubmittingPR] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  const fetchPullRequests = async () => {
    if (!selectedRepo) return;
    setIsLoadingPRs(true);
    const [owner, repo] = selectedRepo.split('/');
    try {
      const prs = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=100`);
      setPrList(prs || []);
    } catch (err: any) {
      toast(`Failed to load PRs: ${err.message}`, 'error');
    } finally {
      setIsLoadingPRs(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedRepo) {
      fetchPullRequests();
      setPrHead(currentBranch);
      const possibleBases = branches.filter(b => b.name !== currentBranch);
      if (possibleBases.length > 0) {
        setPrBase(possibleBases[0].name);
      }
    }
  }, [isOpen, selectedRepo, currentBranch, branches]);

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) return;
    if (prBase === prHead) {
      toast('Source branch (head) cannot be the same as base branch!', 'warn');
      return;
    }

    setIsSubmittingPR(true);
    const [owner, repo] = selectedRepo.split('/');

    try {
      await apiRequest(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        body: JSON.stringify({
          title: prTitle.trim(),
          body: prBody.trim(),
          head: prHead,
          base: prBase,
        }),
      });

      toast('Pull Request created successfully!', 'success');
      setPrTitle('');
      setPrBody('');
      setActiveTab('list');
      await fetchPullRequests();
    } catch (err: any) {
      toast(`PR creation failed: ${err.message}`, 'error');
    } finally {
      setIsSubmittingPR(false);
    }
  };

  const handleMergePR = async (prNumber: number) => {
    if (!selectedRepo) return;
    const [owner, repo] = selectedRepo.split('/');
    try {
      await apiRequest(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`, {
        method: 'PUT',
        body: JSON.stringify({
          commit_title: `Merge Pull Request #${prNumber}`,
          merge_method: 'merge',
        }),
      });
      toast(`PR #${prNumber} merged successfully!`, 'success');
      await fetchPullRequests();
    } catch (err: any) {
      toast(`Merge failed: ${err.message}`, 'error');
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Pull Request Manager">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-300'
            }`}
          >
            Open Pull Requests ({prList.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-300'
            }`}
          >
            Create New PR
          </button>
        </div>

        {activeTab === 'list' ? (
          <div className="space-y-3">
            {isLoadingPRs ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                <span className="text-sm text-slate-400">Loading open Pull Requests...</span>
              </div>
            ) : prList.length === 0 ? (
              <div className="text-center py-12 space-y-2 text-slate-500 dark:text-slate-400">
                <GitPullRequest className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-semibold">No open Pull Requests found</p>
                <p className="text-xs">Click "Create New PR" to merge code changes between branches.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {prList.map((pr) => (
                  <div
                    key={pr.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950/40 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">#{pr.number}</span> {pr.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Opened by <strong className="text-slate-700 dark:text-slate-300">@{pr.user?.login || 'unknown'}</strong> • merging{' '}
                          <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-[11px] font-mono text-blue-600 dark:text-blue-400">{pr.head.ref}</code>{' '}
                          into{' '}
                          <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-[11px] font-mono text-emerald-600 dark:text-emerald-400">{pr.base.ref}</code>
                        </p>
                      </div>
                      <a
                        href={pr.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-blue-500 hover:underline shrink-0"
                      >
                        View on GitHub
                      </a>
                    </div>

                    {pr.body && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-150 dark:border-slate-850">
                        {pr.body}
                      </p>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleMergePR(pr.number)}
                        className="btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check className="w-3.5 h-3.5" /> Merge Pull Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreatePR} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Base Branch (Target)
                </label>
                <select
                  value={prBase}
                  onChange={(e) => setPrBase(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-semibold transition-all"
                >
                  {branches.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Head Branch (Source)
                </label>
                <select
                  value={prHead}
                  onChange={(e) => setPrHead(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-semibold transition-all"
                >
                  {branches.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Pull Request Title
              </label>
              <input
                type="text"
                required
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="e.g. feature: integrate user analytics dashboard"
                className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-medium transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Description / Details
              </label>
              <textarea
                value={prBody}
                onChange={(e) => setPrBody(e.target.value)}
                placeholder="Describe your additions, modifications, and any fixes made..."
                className="w-full bg-slate-50 dark:bg-slate-950 focus:bg-white border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl p-3 text-sm font-medium transition-all min-h-[100px]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800 font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="btn-outline px-4 py-2 cursor-pointer text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPR || prBase === prHead}
                className="btn-primary px-5 py-2 flex items-center gap-2 cursor-pointer text-sm"
              >
                {isSubmittingPR ? <RefreshCw className="w-4 h-4 animate-spin" /> : <GitPullRequest className="w-4 h-4" />}
                Create Pull Request
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalWrapper>
  );
}
