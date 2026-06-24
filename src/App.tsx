import React, { useState, useEffect } from 'react';
import { 
  Github, Key, Search, GitBranch, FolderOpen, 
  FileCode, Play, Trash2, Eye, EyeOff, History, FolderUp, 
  Moon, Sun, LogOut, CheckCircle, RefreshCw, AlertTriangle, 
  PlusCircle, BookOpen, User, Star, ArrowRight, Shield, Globe,
  GitPullRequest, Sparkles, Cpu, Terminal, Send, Layers, MessageSquare
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

  // Optional AI (OpenRouter) State
  const [aiEnabled, setAiEnabled] = useState(() => localStorage.getItem('ai_enabled') === 'true');
  const [openRouterApiKey, setOpenRouterApiKey] = useState(() => localStorage.getItem('ai_apikey') || '');
  const [openRouterModel, setOpenRouterModel] = useState(() => localStorage.getItem('ai_model') || 'google/gemini-2.5-flash:free');
  const [customModel, setCustomModel] = useState(() => localStorage.getItem('ai_custom_model') || '');
  const [aiTemperature, setAiTemperature] = useState<number>(() => {
    const saved = localStorage.getItem('ai_temperature');
    return saved !== null ? parseFloat(saved) : 0.0;
  });
  const [aiSystemPrompt, setAiSystemPrompt] = useState(() => {
    return localStorage.getItem('ai_system_prompt') || "You are an elite competitive programming judge. You will receive a code solution. You must output only two things: the Big-O time complexity and the Big-O space complexity. Do not explain your reasoning. Do not rewrite the code.";
  });
  const [aiJudgeResult, setAiJudgeResult] = useState('');
  const [isAiConfigExpanded, setIsAiConfigExpanded] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Expanded Responsive Layout & Console state
  const [activeLeftTab, setActiveLeftTab] = useState<'explorer' | 'repos' | 'auth'>('auth');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [consoleOutput, setConsoleOutput] = useState<string>('Welcome to AI Copilot Terminal. Load or edit a file, then run a tool or send a query below!\n--------------------------------------------------------------------------------------');
  const [customAiPrompt, setCustomAiPrompt] = useState('');

  // Sync active left tab based on authentication / selection
  useEffect(() => {
    if (!user) {
      setActiveLeftTab('auth');
    } else if (user && !selectedRepo) {
      setActiveLeftTab('repos');
    } else if (selectedRepo) {
      setActiveLeftTab('explorer');
    }
  }, [user, !!selectedRepo]);

  useEffect(() => {
    localStorage.setItem('ai_enabled', aiEnabled ? 'true' : 'false');
  }, [aiEnabled]);

  useEffect(() => {
    localStorage.setItem('ai_apikey', openRouterApiKey);
  }, [openRouterApiKey]);

  useEffect(() => {
    localStorage.setItem('ai_model', openRouterModel);
  }, [openRouterModel]);

  useEffect(() => {
    localStorage.setItem('ai_custom_model', customModel);
  }, [customModel]);

  useEffect(() => {
    localStorage.setItem('ai_temperature', aiTemperature.toString());
  }, [aiTemperature]);

  useEffect(() => {
    localStorage.setItem('ai_system_prompt', aiSystemPrompt);
  }, [aiSystemPrompt]);

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
  // Optional AI (OpenRouter) Integration Helpers
  // -------------------------------------------------------------
  const callOpenRouter = async (prompt: string, systemPrompt = "You are an expert software engineer assistant.", temp?: number) => {
    const key = openRouterApiKey.trim();
    if (!key) {
      throw new Error("OpenRouter API Key is missing. Please provide it in the AI Copilot section.");
    }
    const activeModel = openRouterModel === 'custom' ? customModel.trim() : openRouterModel;
    if (!activeModel) {
      throw new Error("Please select or type a model ID.");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer": "https://ai.studio/build",
        "X-Title": "GitHub Client companion",
      },
      body: JSON.stringify({
        model: activeModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: temp !== undefined ? temp : aiTemperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (_) {}
      throw new Error(errorJson?.error?.message || `HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  };

  const handleAiJudgeComplexity = async () => {
    if (!selectedFilePath || !editorContent) {
      addToast('Please open or write some code first to judge complexity.', 'warn');
      return;
    }
    setIsAiGenerating(true);
    addToast('Elite Judge is analyzing code complexity...', 'info');
    setConsoleOutput(prev => `${prev}\n\n[System] Elite Judge analysis triggered for: ${selectedFilePath}...\n--------------------------------------------------`);
    setIsConsoleOpen(true);
    try {
      const prompt = `Here is the code file (${selectedFilePath}) to analyze:

${editorContent}`;

      // Call OpenRouter with the user's custom system prompt and specified temperature!
      const result = await callOpenRouter(prompt, aiSystemPrompt, aiTemperature);
      setAiJudgeResult(result);
      setConsoleOutput(prev => `${prev}\n[Elite Judge Verdict]\n${result}\n--------------------------------------------------`);
      addToast('Complexity Analysis Complete!', 'success');
    } catch (err: any) {
      setConsoleOutput(prev => `${prev}\n[Elite Judge Error]: ${err.message}\n--------------------------------------------------`);
      addToast(`Complexity Analysis failed: ${err.message}`, 'error');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSendConsoleQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customAiPrompt.trim()) return;
    if (!selectedFilePath || !editorContent) {
      addToast('Please load or write some code in the editor first.', 'warn');
      return;
    }
    const userQuery = customAiPrompt.trim();
    setCustomAiPrompt('');
    setIsAiGenerating(true);
    
    // Append user query to console log
    setConsoleOutput(prev => `${prev}\n\n>>> User Query: ${userQuery}\n--------------------------------------------------`);
    setIsConsoleOpen(true);
    
    try {
      const prompt = `Currently loaded file: ${selectedFilePath}
Content:
\`\`\`
${editorContent}
\`\`\`

User question about this code: ${userQuery}`;

      const systemPrompt = "You are an elite competitive programming and software engineering assistant. Answer the user's questions about the provided code concisely, accurately, and with clear space/time complexity details if applicable.";
      const answer = await callOpenRouter(prompt, systemPrompt, aiTemperature);
      
      setConsoleOutput(prev => `${prev}\nAI Copilot Response:\n${answer}\n--------------------------------------------------`);
    } catch (err: any) {
      setConsoleOutput(prev => `${prev}\n[Error running query: ${err.message}]\n--------------------------------------------------`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleGenerateCommitMessage = async (currentContent: string, origContent: string): Promise<string> => {
    const diffText = `Original:
${origContent.slice(0, 5000)}

Modified:
${currentContent.slice(0, 5000)}`;

    const prompt = `Write a short, concise, and professional git conventional commit message summarizing the changes below. Return ONLY the commit message text. Do not include any conversational filler, markdown code blocks, explanation or quotes.
    
Changes:
${diffText}`;

    const systemPrompt = "You are an expert software engineer assistant that generates clean conventional commit messages.";
    return await callOpenRouter(prompt, systemPrompt);
  };

  const handleAiGenerateDocs = async () => {
    if (!selectedFilePath || !editorContent) return;
    setIsAiGenerating(true);
    addToast('Analyzing code to generate documentation comments...', 'info');
    setConsoleOutput(prev => `${prev}\n\n[System] Adding documentation comments to ${selectedFilePath}...\n--------------------------------------------------`);
    setIsConsoleOpen(true);
    try {
      const prompt = `You are a documentation generator. Add clean, structured documentation comments, JSDoc/TSDoc headers, and helpful inline comments to the following code file without changing any functional code logic. Return the FULL updated code file, complete and intact, from top to bottom. Do NOT include markdown code blocks, explanations, or any notes outside the code itself.
      
File Name: ${selectedFilePath}
Code Contents:
${editorContent}`;

      const systemPrompt = "You are an expert software engineer assistant that adds documentation comments and returns only the updated file contents.";
      const updatedCode = await callOpenRouter(prompt, systemPrompt, aiTemperature);
      if (updatedCode) {
        const cleaned = updatedCode.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
        setEditorContent(cleaned);
        setConsoleOutput(prev => `${prev}\n[System] Successfully documented: ${selectedFilePath}\n--------------------------------------------------`);
        addToast('Documentation comments added successfully!', 'success');
      }
    } catch (err: any) {
      setConsoleOutput(prev => `${prev}\n[System Error]: Documentation failed: ${err.message}\n--------------------------------------------------`);
      addToast(`AI Documentation failed: ${err.message}`, 'error');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAiOptimizeCode = async () => {
    if (!selectedFilePath || !editorContent) return;
    setIsAiGenerating(true);
    addToast('Analyzing code for performance and style optimization...', 'info');
    setConsoleOutput(prev => `${prev}\n\n[System] Optimizing and refactoring code: ${selectedFilePath}...\n--------------------------------------------------`);
    setIsConsoleOpen(true);
    try {
      const prompt = `You are an expert senior code refactoring assistant. Refactor and optimize the following code for better performance, clean architecture, and legibility while maintaining identical functional behaviors. Return the FULL updated code file, complete and intact. Do NOT include markdown code blocks, explanations, or notes outside of the code.
      
File Name: ${selectedFilePath}
Code Contents:
${editorContent}`;

      const systemPrompt = "You are an expert software engineer assistant that refactors code and returns only the updated file contents.";
      const updatedCode = await callOpenRouter(prompt, systemPrompt, aiTemperature);
      if (updatedCode) {
        const cleaned = updatedCode.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
        setEditorContent(cleaned);
        setConsoleOutput(prev => `${prev}\n[System] Successfully refactored and optimized: ${selectedFilePath}\n--------------------------------------------------`);
        addToast('Code optimized and refactored successfully!', 'success');
      }
    } catch (err: any) {
      setConsoleOutput(prev => `${prev}\n[System Error]: Optimization failed: ${err.message}\n--------------------------------------------------`);
      addToast(`AI Optimization failed: ${err.message}`, 'error');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAiGenerateReadme = async () => {
    if (!selectedRepo) return;
    setIsAiGenerating(true);
    addToast('Generating rich README documentation for this repository...', 'info');
    setConsoleOutput(prev => `${prev}\n\n[System] Generating repository-wide README.md for ${selectedRepo}...\n--------------------------------------------------`);
    setIsConsoleOpen(true);
    try {
      const filePaths = rootFiles.map(f => f.path).join('\n- ');
      const prompt = `You are a technical writer. Write a gorgeous, professional, and comprehensive README.md file for a GitHub repository. Include sections for features, setup instructions, technology stack, and visual badges.
      
Repository Name: ${selectedRepo}
Files in Repository root:
- ${filePaths || 'No files listed'}

Return ONLY the markdown README contents. Do NOT include any conversational introduction or notes.`;

      const systemPrompt = "You are an expert technical writer assistant that writes markdown README documents and returns only the markdown text.";
      const readme = await callOpenRouter(prompt, systemPrompt, aiTemperature);
      if (readme) {
        setSelectedFilePath('README.md');
        setFileSha(null);
        const cleaned = readme.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
        setEditorContent(cleaned);
        setOriginalContent('');
        setIsEditorDisabled(false);
        setConsoleOutput(prev => `${prev}\n[System] Generated new README.md. Review and click commit to save!\n--------------------------------------------------`);
        addToast('Generated README.md in the editor! Review and click Commit to save.', 'success');
      }
    } catch (err: any) {
      setConsoleOutput(prev => `${prev}\n[System Error]: README generation failed: ${err.message}\n--------------------------------------------------`);
      addToast(`AI README generation failed: ${err.message}`, 'error');
    } finally {
      setIsAiGenerating(false);
    }
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
    
    let activeSha = fileSha;
    if (!activeSha) {
      try {
        const existingData = await apiRequest(
          `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(selectedBranch)}`
        );
        if (existingData && existingData.sha) {
          activeSha = existingData.sha;
        }
      } catch (err) {
        // File doesn't exist yet, which is perfectly fine to create as a new file without a SHA
      }
    }
    if (activeSha) body.sha = activeSha;

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
      try {
        if (typeof item.getAsFileSystemHandle === 'function') {
          const handle = await item.getAsFileSystemHandle();
          if (handle) {
            const ignoreDirs = ['.git', 'node_modules', '.DS_Store', 'dist', 'build', 'out'];
            if (ignoreDirs.includes(handle.name)) return;

            if (handle.kind === 'file') {
              try {
                const file = await handle.getFile();
                files.push({ path: prefix + handle.name, file });
              } catch (fileErr) {
                console.warn(`Skipping file "${prefix + handle.name}":`, fileErr);
              }
            } else if (handle.kind === 'directory') {
              const readDir = async (dirHandle: any, dirPrefix: string) => {
                for await (const entry of dirHandle.values()) {
                  if (ignoreDirs.includes(entry.name)) {
                    continue;
                  }
                  try {
                    if (entry.kind === 'file') {
                      try {
                        const file = await entry.getFile();
                        files.push({ path: dirPrefix + entry.name, file });
                      } catch (fileErr) {
                        console.warn(`Skipping file "${dirPrefix + entry.name}":`, fileErr);
                      }
                    } else if (entry.kind === 'directory') {
                      await readDir(entry, dirPrefix + entry.name + '/');
                    }
                  } catch (entryErr) {
                    console.warn(`Skipping directory entry:`, entryErr);
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
      } catch (err) {
        console.warn(`Error reading dropped entry:`, err);
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
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                connectGitHub();
              }}
              className="space-y-3"
            >
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-850 focus:border-blue-500 dark:focus:border-blue-600 rounded-xl pl-3 pr-10 py-2.5 text-sm font-medium font-mono transition-all"
                  autoComplete="current-password"
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
                type="submit"
                disabled={isValidatingToken}
                className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm font-bold"
              >
                {isValidatingToken ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Github className="w-4.5 h-4.5" />}
                Connect Account
              </button>
            </form>
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

        {/* AI Copilot Section (Optional & Configurable) */}
        <div className="border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsAiConfigExpanded(!isAiConfigExpanded)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500" />
              AI Copilot Assistant
              {aiEnabled && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[9px] rounded-full uppercase tracking-normal">
                  Active
                </span>
              )}
            </span>
            <span className="text-slate-400">{isAiConfigExpanded ? '▼' : '▲'}</span>
          </button>

          {isAiConfigExpanded && (
            <div className="px-5 pb-5 space-y-3">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-3xs">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Enable AI Copilot</span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aiEnabled}
                    onChange={(e) => setAiEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {aiEnabled && (
                <div className="space-y-3 animate-fadeIn">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                      OpenRouter API Key
                    </label>
                    <input
                      type="password"
                      value={openRouterApiKey}
                      onChange={(e) => setOpenRouterApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 dark:focus:border-purple-600 rounded-xl px-3 py-2 text-xs font-mono font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                      OpenRouter Model
                    </label>
                    <select
                      value={openRouterModel}
                      onChange={(e) => setOpenRouterModel(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 dark:focus:border-purple-600 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
                    >
                      <option value="google/gemini-2.5-flash:free">Gemini 2.5 Flash Free (Fast)</option>
                      <option value="qwen/qwen-2.5-coder-32b-instruct:free">Qwen 2.5 Coder (Best for Coding)</option>
                      <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B Free (General)</option>
                      <option value="google/gemini-2.5-pro:free">Gemini 2.5 Pro Free (Smart)</option>
                      <option value="openrouter/auto">OpenRouter Auto Router</option>
                      <option value="custom">Custom Model ID</option>
                    </select>
                  </div>

                  {openRouterModel === 'custom' && (
                    <div className="animate-slideDown">
                      <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                        Custom Model ID
                      </label>
                      <input
                        type="text"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        placeholder="author/model-name"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 dark:focus:border-purple-600 rounded-xl px-3 py-2 text-xs font-mono font-medium transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Model Temperature ({aiTemperature.toFixed(1)})
                      </label>
                      <span className="text-[10px] font-mono font-medium text-slate-400">
                        {aiTemperature === 0.0 ? 'Strict/Deterministic' : aiTemperature <= 0.5 ? 'Focused' : 'Creative'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="2.0"
                      step="0.1"
                      value={aiTemperature}
                      onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                      className="w-full accent-purple-600 h-1 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        System Instructions (Persona)
                      </label>
                      <button
                        type="button"
                        onClick={() => setAiSystemPrompt("You are an elite competitive programming judge. You will receive a code solution. You must output only two things: the Big-O time complexity and the Big-O space complexity. Do not explain your reasoning. Do not rewrite the code.")}
                        className="text-[9px] font-extrabold text-purple-600 hover:text-purple-750 dark:text-purple-400 uppercase tracking-wide"
                        title="Reset to default Elite Judge instructions"
                      >
                        Reset Judge
                      </button>
                    </div>
                    <textarea
                      value={aiSystemPrompt}
                      onChange={(e) => setAiSystemPrompt(e.target.value)}
                      placeholder="Enter custom AI behavior / persona..."
                      rows={3}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 dark:focus:border-purple-600 rounded-xl px-3 py-2 text-xs font-medium transition-all resize-none leading-relaxed"
                    />
                  </div>

                  <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-normal">
                    This uses the OpenRouter free models endpoints. Create your key at <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline">openrouter.ai</a>.
                  </div>
                </div>
              )}
            </div>
          )}
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
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
        
        {/* Workspace Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between flex-wrap gap-3 shrink-0">
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

          <div className="flex items-center gap-2">
            {selectedRepo && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-850">
                <span className="text-slate-400">Target:</span>
                <span className="text-blue-600 dark:text-blue-400">{selectedRepo}</span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-emerald-600 dark:text-emerald-400">{selectedBranch}</span>
              </div>
            )}
            <button
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isRightPanelOpen
                  ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50'
                  : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-850 hover:bg-slate-50'
              }`}
              title="Toggle AI Copilot Sidebar"
            >
              <Sparkles className="w-4.5 h-4.5" />
            </button>
          </div>
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

          {/* Clean code editor layout */}
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
            <textarea
              id="main-code-editor-textarea"
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

          {/* Bottom Console Panel */}
          {isConsoleOpen ? (
            <div className="mt-4 h-60 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-lg flex flex-col overflow-hidden shrink-0 animate-slideUp">
              {/* Console Header */}
              <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300">AI Copilot Terminal & Console</span>
                  {isAiGenerating && (
                    <span className="flex items-center gap-1 text-[10px] text-purple-400 animate-pulse font-bold">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Thinking...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {aiJudgeResult && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-purple-950 text-purple-300 rounded border border-purple-900">
                      Judge Active
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setConsoleOutput('Console Log Cleared.\n--------------------------------------------------');
                      setAiJudgeResult('');
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-200 font-bold px-2 py-0.5 rounded hover:bg-slate-800"
                    title="Clear console output"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setIsConsoleOpen(false)}
                    className="text-slate-400 hover:text-white text-xs font-bold px-1"
                    title="Collapse Console"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Console Output Screen */}
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed select-text scrollbar-thin scrollbar-thumb-slate-800">
                {consoleOutput}
              </div>

              {/* Console Input Query Area */}
              {aiEnabled && (
                <form
                  onSubmit={handleSendConsoleQuery}
                  className="p-2 border-t border-slate-800 bg-slate-950/50 flex gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={customAiPrompt}
                    onChange={(e) => setCustomAiPrompt(e.target.value)}
                    disabled={isAiGenerating || !selectedFilePath}
                    placeholder={
                      selectedFilePath
                        ? `Ask Copilot a question about "${selectedFilePath.split('/').pop()}"...`
                        : "Open a file first to talk with the AI Copilot..."
                    }
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-purple-600 rounded-xl px-3 py-2 text-xs font-medium text-slate-105 outline-none placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={isAiGenerating || !customAiPrompt.trim() || !selectedFilePath}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="mt-2.5 flex justify-end shrink-0">
              <button
                onClick={() => setIsConsoleOpen(true)}
                className="bg-slate-900 hover:bg-slate-850 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold border border-slate-800 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <Terminal className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> Open Terminal Console
              </button>
            </div>
          )}

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
          Right AI Copilot Panel (Collapsible)
          ------------------------------------------------------------- */}
      {isRightPanelOpen && (
        <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 overflow-hidden shadow-sm z-10 animate-slideLeft">
          <div className="p-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 shrink-0">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-purple-600 dark:text-purple-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" /> AI Copilot Center
            </h2>
            <button
              onClick={() => setIsRightPanelOpen(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer text-[10px] font-extrabold"
              title="Collapse Panel"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Activation Switch */}
            <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-150 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Enable AI Copilot</span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {aiEnabled ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Credentials */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    OpenRouter API Key
                  </label>
                  <input
                    type="password"
                    value={openRouterApiKey}
                    onChange={(e) => setOpenRouterApiKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:border-purple-500 dark:focus:border-purple-600 rounded-xl px-3 py-2 text-xs font-mono font-medium transition-all outline-none"
                  />
                </div>

                {/* Model */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Model Selection
                  </label>
                  <select
                    value={openRouterModel}
                    onChange={(e) => setOpenRouterModel(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:border-purple-500 dark:focus:border-purple-600 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer outline-none text-slate-800 dark:text-slate-200"
                  >
                    <option value="google/gemini-2.5-flash:free">Gemini 2.5 Flash Free</option>
                    <option value="qwen/qwen-2.5-coder-32b-instruct:free">Qwen 2.5 Coder (Coding)</option>
                    <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B Free</option>
                    <option value="google/gemini-2.5-pro:free">Gemini 2.5 Pro Free</option>
                    <option value="openrouter/auto">OpenRouter Auto Router</option>
                    <option value="custom">Custom Model ID</option>
                  </select>
                </div>

                {openRouterModel === 'custom' && (
                  <div className="space-y-1.5 animate-slideDown">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Custom Model ID
                    </label>
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder="author/model-name"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:border-purple-500 dark:focus:border-purple-600 rounded-xl px-3 py-2 text-xs font-mono font-medium transition-all outline-none"
                    />
                  </div>
                )}

                {/* Temperature */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Temperature ({aiTemperature.toFixed(1)})
                    </label>
                    <span className="text-[9px] font-extrabold text-purple-500 uppercase">
                      {aiTemperature === 0 ? 'Strict' : aiTemperature <= 0.5 ? 'Balanced' : 'Creative'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={aiTemperature}
                    onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                    className="w-full accent-purple-600 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* System Prompt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      System Instructions
                    </label>
                    <button
                      type="button"
                      onClick={() => setAiSystemPrompt("You are an elite competitive programming judge. You will receive a code solution. You must output only two things: the Big-O time complexity and the Big-O space complexity. Do not explain your reasoning. Do not rewrite the code.")}
                      className="text-[9px] font-extrabold text-purple-600 hover:text-purple-750 dark:text-purple-400 uppercase tracking-wider"
                    >
                      Reset
                    </button>
                  </div>
                  <textarea
                    value={aiSystemPrompt}
                    onChange={(e) => setAiSystemPrompt(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:border-purple-500 dark:focus:border-purple-600 rounded-xl px-3 py-2 text-xs font-medium transition-all resize-none outline-none leading-relaxed"
                  />
                </div>

                {/* AI Tools quick buttons inside AI Copilot Center */}
                <div className="pt-2 border-t border-slate-150 dark:border-slate-800 space-y-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                    Copilot Tools
                  </label>
                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={handleAiGenerateReadme}
                    className="w-full bg-slate-100 hover:bg-purple-100 dark:bg-slate-950 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-850 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <BookOpen className="w-4 h-4 text-purple-500" /> Generate README.md
                  </button>
                  {selectedFilePath && (
                    <>
                      <button
                        type="button"
                        disabled={isAiGenerating || isEditorDisabled}
                        onClick={handleAiJudgeComplexity}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-3xs cursor-pointer disabled:opacity-50"
                      >
                        <Cpu className="w-4 h-4 text-white" /> Judge Complexity
                      </button>
                      <button
                        type="button"
                        disabled={isAiGenerating || isEditorDisabled}
                        onClick={handleAiGenerateDocs}
                        className="w-full bg-slate-100 hover:bg-purple-100 dark:bg-slate-950 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-850 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <FileCode className="w-4 h-4 text-purple-500" /> Document File
                      </button>
                      <button
                        type="button"
                        disabled={isAiGenerating || isEditorDisabled}
                        onClick={handleAiOptimizeCode}
                        className="w-full bg-slate-100 hover:bg-purple-100 dark:bg-slate-950 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-850 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4 text-purple-500" /> Optimize / Refactor
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-center py-12 text-slate-400 font-medium">
                AI Copilot is disabled. Turn it on above to configure parameters and run analysis.
              </div>
            )}
          </div>
        </aside>
      )}

      {/* -------------------------------------------------------------
          Interactive Modals Overlay
          ------------------------------------------------------------- */}
      <CommitModal
        isOpen={isCommitModalOpen}
        onClose={() => setIsCommitModalOpen(false)}
        onCommit={handleCommitSubmit}
        filePath={selectedFilePath || ''}
        fileContent={editorContent}
        originalContent={originalContent}
        aiEnabled={aiEnabled}
        onGenerateCommitMessage={handleGenerateCommitMessage}
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
