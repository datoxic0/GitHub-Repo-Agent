import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, File, Loader2, Sparkles } from 'lucide-react';
import { GitHubContentItem } from '../types';

interface FileTreeProps {
  items: GitHubContentItem[];
  selectedPath: string | null;
  onFileSelect: (path: string, sha: string) => void;
  fetchDirectory: (path: string) => Promise<GitHubContentItem[]>;
  aiContextFiles?: Set<string>;
  toggleAiContext?: (path: string) => void;
}

export default function FileTree({ items, selectedPath, onFileSelect, fetchDirectory, aiContextFiles, toggleAiContext }: FileTreeProps) {
  const sortedItems = [...items].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'dir' ? -1 : 1;
  });

  return (
    <ul className="space-y-1">
      {sortedItems.map((item) => (
        <TreeItem
          key={item.path}
          item={item}
          selectedPath={selectedPath}
          onFileSelect={onFileSelect}
          fetchDirectory={fetchDirectory}
          aiContextFiles={aiContextFiles}
          toggleAiContext={toggleAiContext}
        />
      ))}
    </ul>
  );
}

interface TreeItemProps {
  key?: string;
  item: GitHubContentItem;
  selectedPath: string | null;
  onFileSelect: (path: string, sha: string) => void;
  fetchDirectory: (path: string) => Promise<GitHubContentItem[]>;
  aiContextFiles?: Set<string>;
  toggleAiContext?: (path: string) => void;
}

function TreeItem({ item, selectedPath, onFileSelect, fetchDirectory, aiContextFiles, toggleAiContext }: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<GitHubContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isDir = item.type === 'dir';
  const isSelected = selectedPath === item.path;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDir) {
      onFileSelect(item.path, item.sha);
      return;
    }

    if (!isOpen) {
      setIsLoading(true);
      try {
        const subItems = await fetchDirectory(item.path);
        setChildren(subItems);
        setIsOpen(true);
      } catch (err) {
        console.error('Error opening directory:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'json':
      case 'json5':
        return <span className="text-yellow-500 font-mono font-semibold text-xs shrink-0">{`{}`}</span>;
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <span className="text-sky-500 font-mono font-bold text-xs shrink-0">JS</span>;
      case 'css':
      case 'scss':
      case 'less':
        return <span className="text-teal-400 font-mono font-bold text-xs shrink-0">#</span>;
      case 'md':
      case 'markdown':
        return <span className="text-indigo-400 font-mono font-bold text-xs shrink-0">M↓</span>;
      default:
        return <File className="w-4 h-4 text-slate-400 dark:text-slate-300 shrink-0" />;
    }
  };

  return (
    <li className="select-none group/treeitem">
      <div
        onClick={handleToggle}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm font-medium ${
          isSelected
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {isDir ? (
            isOpen ? (
              <ChevronDown className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
            ) : (
              <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
            )
          ) : null}
        </span>

        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
          ) : isDir ? (
            <Folder className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-amber-500 dark:text-amber-400'} shrink-0`} />
          ) : (
            getFileIcon(item.name)
          )}
        </span>

        <span className="truncate flex-1 text-[13px]">{item.name}</span>
        
        {!isDir && toggleAiContext && aiContextFiles && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleAiContext(item.path);
            }}
            className={`p-1 rounded-md transition-all shrink-0 ${
              aiContextFiles.has(item.path)
                ? 'opacity-100 text-purple-500 bg-purple-500/20 hover:bg-purple-500/30 dark:text-purple-400'
                : 'opacity-0 group-hover/treeitem:opacity-100 text-slate-400 hover:text-purple-500 hover:bg-purple-500/10 dark:hover:text-purple-400'
            }`}
            title={aiContextFiles.has(item.path) ? "Remove from AI Context" : "Add to AI Context"}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isDir && isOpen && children.length > 0 && (
        <ul className="pl-4 mt-1 border-l border-slate-200 dark:border-slate-800 ml-3.5 space-y-1">
          {children
            .sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'dir' ? -1 : 1;
            })
            .map((child) => (
              <TreeItem
                key={child.path}
                item={child}
                selectedPath={selectedPath}
                onFileSelect={onFileSelect}
                fetchDirectory={fetchDirectory}
                aiContextFiles={aiContextFiles}
                toggleAiContext={toggleAiContext}
              />
            ))}
        </ul>
      )}
    </li>
  );
}
