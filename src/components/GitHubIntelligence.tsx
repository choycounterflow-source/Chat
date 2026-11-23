import React, { useMemo, useRef, useState } from 'react';
import {
  GitBranch,
  GitCommitHorizontal,
  Folder,
  FolderOpen,
  FileCode2,
  FileText,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  Check,
  KeyRound,
  Link2,
  Unlink,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Lock,
  Globe,
  BookOpen,
  Code2,
  WrapText,
  ChevronsUpDown,
  X,
  Sparkles,
  ShieldCheck,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface GitHubIntelligenceProps {
  authToken: string | null;
}

interface RepoMetadata {
  name: string;
  fullName: string;
  description: string;
  visibility: string;
  isPrivate: boolean;
  defaultBranch: string;
  selectedBranch: string;
  htmlUrl: string;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  sizeKb: number;
  license: string | null;
  pushedAt: string | null;
  updatedAt: string | null;
  ownerLogin: string;
  ownerAvatar: string | null;
}

interface LanguageShare {
  name: string;
  bytes: number;
  percent: number;
}

interface FolderSummary {
  name: string;
  fileCount: number;
  totalBytes: number;
}

interface ExtensionSummary {
  ext: string;
  count: number;
}

interface TreeEntry {
  path: string;
  type: 'blob' | 'tree';
  size: number;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  size: number;
  children: FileTreeNode[];
}

interface FilePreviewData {
  name: string;
  path: string;
  size: number;
  sha: string;
  htmlUrl: string | null;
  content: string;
  lineCount: number;
  truncated: boolean;
  isBinary: boolean;
  tooLarge: boolean;
}

interface CommitItem {
  sha: string;
  shortSha: string;
  message?: string;
  title: string;
  body: string;
  authorName: string;
  authorLogin: string | null;
  authorAvatar: string | null;
  date: string | null;
  htmlUrl: string | null;
  verified: boolean;
}

const RECENT_COMMIT_LIMIT = 5;

interface ContributorSummary {
  name: string;
  login: string | null;
  avatar: string | null;
  commitCount: number;
  latestDate: string | null;
}

interface ReadmeDocument {
  name: string;
  path: string;
  size: number;
  htmlUrl: string | null;
  content: string;
  truncated: boolean;
}

interface IntelligencePayload {
  repo: RepoMetadata;
  branches: string[];
  languages: LanguageShare[];
  structure: {
    totalFiles: number;
    totalDirectories: number;
    totalBytes: number;
    truncated: boolean;
    topLevelFolders: FolderSummary[];
    keyFiles: string[];
    extensions: ExtensionSummary[];
    tree: TreeEntry[];
  };
  commits: CommitItem[];
  contributors: ContributorSummary[];
  readme: ReadmeDocument | null;
  authenticatedWithToken: boolean;
}

type ReviewType = 'performance' | 'security';

interface AiCodeReviewFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  lineHint: string;
  impact: string;
  recommendation: string;
  codeExample?: string;
}

interface AiCodeReviewResult {
  reviewType: ReviewType;
  filePath: string;
  branch: string;
  repoFullName: string;
  model: string;
  analyzedChars: number;
  truncated: boolean;
  generatedAt: string;
  score: number;
  rating: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical Risk';
  summary: string;
  findings: AiCodeReviewFinding[];
  strengths: string[];
  quickWins: string[];
}

const NON_TEXT_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.tiff',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.wasm', '.pyc', '.class', '.jar',
]);

function isReviewableFilePath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  const dotIdx = lower.lastIndexOf('.');
  if (dotIdx <= 0) return true;
  return !NON_TEXT_EXTENSIONS.has(lower.slice(dotIdx));
}

const LANGUAGE_BAR_COLORS: string[] = [
  'bg-emerald-500 dark:bg-emerald-400',
  'bg-amber-500 dark:bg-amber-400',
  'bg-cyan-500 dark:bg-cyan-400',
  'bg-indigo-500 dark:bg-indigo-400',
  'bg-rose-500 dark:bg-rose-400',
  'bg-teal-500 dark:bg-teal-300',
];

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return 'Unknown';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  const diffMs = Date.now() - parsed.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function resolveSafeMarkdownUrl(rawUrl: string, repoFullName: string, branch: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.toString();
      }
      return null;
    } catch {
      return null;
    }
  }
  // Reject protocol schemes like javascript:, data:, vbscript:
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;
  const cleanedPath = trimmed.replace(/^\.?\//, '');
  if (!cleanedPath || !repoFullName) return null;
  return `https://github.com/${repoFullName}/blob/${encodeURIComponent(branch || 'main')}/${cleanedPath}`;
}

function renderInlineMarkdown(text: string, repoFullName: string, branch: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenRegex = /(`[^`]+`)|(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${idx++}`}
          className="px-1.5 py-0.5 rounded bg-emerald-100/90 dark:bg-emerald-900/90 border border-emerald-200 dark:border-emerald-700/70 font-mono text-[11px] text-emerald-950 dark:text-amber-200"
        >
          {match[1].slice(1, -1)}
        </code>
      );
    } else if (match[2]) {
      const label = match[3];
      const href = resolveSafeMarkdownUrl(match[4], repoFullName, branch);
      if (href) {
        nodes.push(
          <a
            key={`${keyPrefix}-link-${idx++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200 underline underline-offset-2 font-medium break-words"
          >
            {label}
          </a>
        );
      } else {
        nodes.push(<span key={`${keyPrefix}-span-${idx++}`}>{label}</span>);
      }
    } else if (match[5]) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${idx++}`} className="font-bold text-emerald-950 dark:text-white">
          {match[6]}
        </strong>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

function renderSafeMarkdownBlocks(content: string, repoFullName: string, branch: string): React.ReactNode[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      elements.push(
        <div
          key={`code-${blockKey++}`}
          className="rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950"
        >
          {lang && (
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/70 border-b border-emerald-200 dark:border-emerald-800">
              {lang}
            </div>
          )}
          <pre className="p-3 overflow-x-auto text-[11px] font-mono text-emerald-950 dark:text-emerald-100 leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Horizontal rule
    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      elements.push(<hr key={`hr-${blockKey++}`} className="border-emerald-200 dark:border-emerald-800/80 my-2" />);
      i += 1;
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].replace(/\s+#+$/, '');
      const headingClasses =
        level === 1
          ? 'text-base sm:text-lg font-extrabold text-emerald-950 dark:text-white border-b border-emerald-200 dark:border-emerald-800/80 pb-1.5 pt-1'
          : level === 2
            ? 'text-sm sm:text-base font-bold text-emerald-950 dark:text-white border-b border-emerald-200/70 dark:border-emerald-800/60 pb-1 pt-2'
            : 'text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-100 pt-1.5';
      elements.push(
        <div key={`h-${blockKey++}`} className={headingClasses}>
          {renderInlineMarkdown(headingText, repoFullName, branch, `h-${blockKey}`)}
        </div>
      );
      i += 1;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      elements.push(
        <blockquote
          key={`bq-${blockKey++}`}
          className="pl-3.5 py-1 border-l-3 border-emerald-500 dark:border-amber-400 bg-emerald-100/50 dark:bg-emerald-900/40 rounded-r-lg text-xs text-emerald-900 dark:text-emerald-100/90 space-y-1"
        >
          {quoteLines.map((ql, qi) => (
            <p key={qi} className="leading-relaxed">
              {renderInlineMarkdown(ql, repoFullName, branch, `bq-${blockKey}-${qi}`)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i += 1;
      }
      elements.push(
        <ul key={`ul-${blockKey++}`} className="list-disc pl-5 space-y-1 text-xs text-emerald-900 dark:text-emerald-100/90">
          {listItems.map((item, li) => (
            <li key={li} className="leading-relaxed">
              {renderInlineMarkdown(item, repoFullName, branch, `ul-${blockKey}-${li}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      elements.push(
        <ol key={`ol-${blockKey++}`} className="list-decimal pl-5 space-y-1 text-xs text-emerald-900 dark:text-emerald-100/90">
          {listItems.map((item, li) => (
            <li key={li} className="leading-relaxed">
              {renderInlineMarkdown(item, repoFullName, branch, `ol-${blockKey}-${li}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph (group consecutive plain lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !/^(#{1,6})\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('>') &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^([-*_])\1{2,}$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    const paragraphText = paraLines.join(' ');
    elements.push(
      <p key={`p-${blockKey++}`} className="text-xs text-emerald-900 dark:text-emerald-100/90 leading-relaxed break-words">
        {renderInlineMarkdown(paragraphText, repoFullName, branch, `p-${blockKey}`)}
      </p>
    );
  }

  return elements;
}

function inferLanguageLabel(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower === 'dockerfile') return 'Docker';
  if (lower === 'makefile') return 'Makefile';
  const dot = lower.lastIndexOf('.');
  if (dot <= 0) return 'Plain Text';
  const ext = lower.slice(dot + 1);
  const map: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript JSX',
    js: 'JavaScript',
    jsx: 'JavaScript JSX',
    mjs: 'JavaScript',
    cjs: 'JavaScript',
    json: 'JSON',
    md: 'Markdown',
    css: 'CSS',
    scss: 'SCSS',
    html: 'HTML',
    yml: 'YAML',
    yaml: 'YAML',
    sql: 'SQL',
    py: 'Python',
    go: 'Go',
    rs: 'Rust',
    java: 'Java',
    kt: 'Kotlin',
    sh: 'Shell',
    bash: 'Shell',
    env: 'Env',
    toml: 'TOML',
    xml: 'XML',
    svg: 'SVG',
    txt: 'Plain Text',
  };
  return map[ext] || ext.toUpperCase();
}

function sortTreeNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  return [...nodes]
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    })
    .map((node) => (node.type === 'tree' ? { ...node, children: sortTreeNodes(node.children) } : node));
}

function buildHierarchicalTree(entries: TreeEntry[], folderFilter: string | null): FileTreeNode[] {
  const rootNodes: FileTreeNode[] = [];
  const nodeMap = new Map<string, FileTreeNode>();

  const ensureFolder = (folderPath: string): FileTreeNode => {
    const existing = nodeMap.get(folderPath);
    if (existing) return existing;
    const segments = folderPath.split('/');
    const name = segments[segments.length - 1];
    const folderNode: FileTreeNode = {
      name,
      path: folderPath,
      type: 'tree',
      size: 0,
      children: [],
    };
    nodeMap.set(folderPath, folderNode);
    if (segments.length === 1) {
      rootNodes.push(folderNode);
    } else {
      const parentPath = segments.slice(0, -1).join('/');
      const parentNode = ensureFolder(parentPath);
      parentNode.children.push(folderNode);
    }
    return folderNode;
  };

  for (const entry of entries) {
    if (folderFilter) {
      if (folderFilter === '(root)') {
        if (entry.path.includes('/')) continue;
      } else {
        const prefix = `${folderFilter}/`;
        if (entry.path !== folderFilter && !entry.path.startsWith(prefix)) continue;
      }
    }

    if (entry.type === 'tree') {
      ensureFolder(entry.path);
    } else {
      if (nodeMap.has(entry.path)) continue;
      const segments = entry.path.split('/');
      const name = segments[segments.length - 1];
      const fileNode: FileTreeNode = {
        name,
        path: entry.path,
        type: 'blob',
        size: entry.size,
        children: [],
      };
      nodeMap.set(entry.path, fileNode);
      if (segments.length === 1) {
        rootNodes.push(fileNode);
      } else {
        const parentPath = segments.slice(0, -1).join('/');
        const parentNode = ensureFolder(parentPath);
        parentNode.children.push(fileNode);
      }
    }
  }

  return sortTreeNodes(rootNodes);
}

function filterHierarchicalTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  const result: FileTreeNode[] = [];
  for (const node of nodes) {
    if (node.type === 'tree') {
      const matchingChildren = filterHierarchicalTree(node.children, q);
      if (node.path.toLowerCase().includes(q) || matchingChildren.length > 0) {
        result.push({ ...node, children: matchingChildren });
      }
    } else if (node.path.toLowerCase().includes(q) || node.name.toLowerCase().includes(q)) {
      result.push(node);
    }
  }
  return result;
}

function collectAllFolderPaths(nodes: FileTreeNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.type === 'tree') {
      paths.push(node.path);
      paths.push(...collectAllFolderPaths(node.children));
    }
  }
  return paths;
}

export const GitHubIntelligence: React.FC<GitHubIntelligenceProps> = ({ authToken }) => {
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [patInput, setPatInput] = useState('');
  const [showPat, setShowPat] = useState(false);

  const [linkedRepoUrl, setLinkedRepoUrl] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [data, setData] = useState<IntelligencePayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [treeSearch, setTreeSearch] = useState('');
  const [activeFolderFilter, setActiveFolderFilter] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreviewData | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState('');
  const [wrapCodeLines, setWrapCodeLines] = useState(false);
  const [copiedFileCode, setCopiedFileCode] = useState(false);
  const fileCacheRef = useRef<Map<string, FilePreviewData>>(new Map());
  const fileReqSeqRef = useRef(0);
  const fileBrowserRef = useRef<HTMLElement | null>(null);

  const [commitSearch, setCommitSearch] = useState('');
  const [expandedCommitSha, setExpandedCommitSha] = useState<string | null>(null);
  const [copiedSha, setCopiedSha] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<'files' | 'review' | 'structure' | 'commits' | 'readme'>('files');
  const [readmeViewMode, setReadmeViewMode] = useState<'preview' | 'raw'>('preview');
  const [readmeExpanded, setReadmeExpanded] = useState(false);
  const [copiedReadme, setCopiedReadme] = useState(false);

  const [reviewFocus, setReviewFocus] = useState<ReviewType>('security');
  const [reviewTargetPath, setReviewTargetPath] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewResult, setReviewResult] = useState<AiCodeReviewResult | null>(null);
  const [copiedReviewReport, setCopiedReviewReport] = useState(false);
  const reviewCacheRef = useRef<Map<string, AiCodeReviewResult>>(new Map());
  const reviewReqSeqRef = useRef(0);
  const aiReviewSectionRef = useRef<HTMLElement | null>(null);

  const fetchIntelligence = async (targetUrl: string, token: string, branchOverride?: string) => {
    const trimmedUrl = targetUrl.trim();
    if (!trimmedUrl) {
      setErrorMsg('Enter a GitHub repository URL (for example: https://github.com/owner/repo).');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const res = await fetch('/api/github/intelligence', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({
          repoUrl: trimmedUrl,
          token: token.trim() || undefined,
          branch: branchOverride || undefined,
          commitLimit: RECENT_COMMIT_LIMIT,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || `Unable to inspect repository (HTTP ${res.status})`);
      }

      setData(payload as IntelligencePayload);
      setLinkedRepoUrl(trimmedUrl);
      setSelectedBranch(payload.repo?.selectedBranch || '');
      setActiveFolderFilter(null);
      setExpandedCommitSha(null);
      setReadmeExpanded(false);
      setSelectedFilePath(null);
      setFilePreview(null);
      setFileError('');
      setReviewTargetPath('');
      setReviewResult(null);
      setReviewError('');
      // Auto-expand the first top-level folder (for example: src) so users immediately see nested structure
      const firstFolder = (payload as IntelligencePayload)?.structure?.topLevelFolders?.find(
        (f) => f.name && f.name !== '(root)'
      );
      setExpandedFolders(firstFolder ? new Set([firstFolder.name]) : new Set());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to analyze repository');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIntelligence(repoUrlInput, patInput);
  };

  const handleBranchChange = (nextBranch: string) => {
    setSelectedBranch(nextBranch);
    if (linkedRepoUrl) {
      fetchIntelligence(linkedRepoUrl, patInput, nextBranch);
    }
  };

  const handleDisconnect = () => {
    setData(null);
    setLinkedRepoUrl('');
    setSelectedBranch('');
    setPatInput('');
    setRepoUrlInput('');
    setTreeSearch('');
    setCommitSearch('');
    setActiveFolderFilter(null);
    setExpandedFolders(new Set());
    setSelectedFilePath(null);
    setFilePreview(null);
    setFileError('');
    fileCacheRef.current.clear();
    reviewCacheRef.current.clear();
    setReviewTargetPath('');
    setReviewResult(null);
    setReviewError('');
    setReadmeExpanded(false);
    setReadmeViewMode('preview');
    setErrorMsg('');
  };

  const handleToggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const handleSelectFile = async (filePath: string, jumpToBrowser = false) => {
    if (!linkedRepoUrl || !data) return;

    // Expand parent folders so the selected file is always visible in the tree
    const segments = filePath.split('/');
    if (segments.length > 1) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        for (let i = 1; i < segments.length; i += 1) {
          next.add(segments.slice(0, i).join('/'));
        }
        return next;
      });
    }

    setSelectedFilePath(filePath);
    if (isReviewableFilePath(filePath)) {
      setReviewTargetPath(filePath);
    }
    setFileError('');
    setCopiedFileCode(false);

    if (jumpToBrowser) {
      setMobilePanel('files');
      fileBrowserRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const activeBranch = selectedBranch || data.repo.selectedBranch;
    const cacheKey = `${linkedRepoUrl}::${activeBranch}::${filePath}`;
    const cached = fileCacheRef.current.get(cacheKey);
    if (cached) {
      setFilePreview(cached);
      setIsLoadingFile(false);
      return;
    }

    const reqId = ++fileReqSeqRef.current;
    setIsLoadingFile(true);
    setFilePreview(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const res = await fetch('/api/github/file', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({
          repoUrl: linkedRepoUrl,
          token: patInput.trim() || undefined,
          branch: activeBranch || undefined,
          path: filePath,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (reqId !== fileReqSeqRef.current) return;

      if (!res.ok) {
        throw new Error(payload.error || `Unable to preview file (HTTP ${res.status})`);
      }

      const preview = payload as FilePreviewData;
      fileCacheRef.current.set(cacheKey, preview);
      setFilePreview(preview);
    } catch (err) {
      if (reqId !== fileReqSeqRef.current) return;
      setFileError(err instanceof Error ? err.message : 'Failed to load file contents');
    } finally {
      if (reqId === fileReqSeqRef.current) {
        setIsLoadingFile(false);
      }
    }
  };

  const handleCopySha = (sha: string) => {
    navigator.clipboard?.writeText(sha).catch(() => {});
    setCopiedSha(sha);
    setTimeout(() => setCopiedSha(null), 1500);
  };

  const handleCopyReadme = () => {
    if (!data?.readme?.content) return;
    navigator.clipboard?.writeText(data.readme.content).catch(() => {});
    setCopiedReadme(true);
    setTimeout(() => setCopiedReadme(false), 1500);
  };

  const handleCopyFileCode = () => {
    if (!filePreview?.content) return;
    navigator.clipboard?.writeText(filePreview.content).catch(() => {});
    setCopiedFileCode(true);
    setTimeout(() => setCopiedFileCode(false), 1500);
  };

  const handleRunCodeReview = async (
    typeOverride?: ReviewType,
    pathOverride?: string,
    forceRefresh = false,
    scrollToPanel = false
  ) => {
    if (!linkedRepoUrl || !data) return;
    const targetPath = (pathOverride ?? reviewTargetPath ?? selectedFilePath ?? '').trim();
    const targetType = typeOverride ?? reviewFocus;

    setReviewFocus(targetType);
    if (targetPath) {
      setReviewTargetPath(targetPath);
    }

    if (!targetPath) {
      setReviewError('Select a repository file first to run a Gemini code review.');
      return;
    }

    if (scrollToPanel) {
      setMobilePanel('review');
      window.setTimeout(() => {
        aiReviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }

    const activeBranch = selectedBranch || data.repo.selectedBranch;
    const cacheKey = `${linkedRepoUrl}::${activeBranch}::${targetPath}::${targetType}`;
    if (!forceRefresh) {
      const cached = reviewCacheRef.current.get(cacheKey);
      if (cached) {
        setReviewResult(cached);
        setReviewError('');
        setIsReviewing(false);
        return;
      }
    }

    const reqId = ++reviewReqSeqRef.current;
    setIsReviewing(true);
    setReviewError('');
    setCopiedReviewReport(false);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const cachedPreview = fileCacheRef.current.get(`${linkedRepoUrl}::${activeBranch}::${targetPath}`);
      const reusableContent =
        filePreview && filePreview.path === targetPath && !filePreview.isBinary && !filePreview.tooLarge
          ? filePreview.content
          : cachedPreview && !cachedPreview.isBinary && !cachedPreview.tooLarge
          ? cachedPreview.content
          : undefined;

      const res = await fetch('/api/github/file-review', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({
          repoUrl: linkedRepoUrl,
          token: patInput.trim() || undefined,
          branch: activeBranch || undefined,
          path: targetPath,
          reviewType: targetType,
          content: reusableContent,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (reqId !== reviewReqSeqRef.current) return;

      if (!res.ok) {
        throw new Error(payload.error || `AI Code Review failed (HTTP ${res.status})`);
      }

      const result = payload as AiCodeReviewResult;
      reviewCacheRef.current.set(cacheKey, result);
      setReviewResult(result);
    } catch (err) {
      if (reqId !== reviewReqSeqRef.current) return;
      setReviewError(err instanceof Error ? err.message : 'Failed to run AI Code Review');
    } finally {
      if (reqId === reviewReqSeqRef.current) {
        setIsReviewing(false);
      }
    }
  };

  const handleCopyReviewReport = () => {
    if (!reviewResult) return;
    const lines = [
      `# Gemini ${reviewResult.reviewType === 'security' ? 'Security' : 'Performance'} Review: ${reviewResult.filePath}`,
      `Repository: ${reviewResult.repoFullName} (${reviewResult.branch})`,
      `Score: ${reviewResult.score}/100 (${reviewResult.rating})`,
      '',
      `## Summary`,
      reviewResult.summary,
      '',
      `## Findings (${reviewResult.findings.length})`,
      ...reviewResult.findings.flatMap((f, idx) => [
        `${idx + 1}. [${f.severity.toUpperCase()}] ${f.title} (${f.lineHint})`,
        `   - Impact: ${f.impact}`,
        `   - Recommendation: ${f.recommendation}`,
      ]),
      '',
      `## Strengths`,
      ...reviewResult.strengths.map((s) => `- ${s}`),
      '',
      `## Quick Wins`,
      ...reviewResult.quickWins.map((q) => `- ${q}`),
    ];
    navigator.clipboard?.writeText(lines.join('\n')).catch(() => {});
    setCopiedReviewReport(true);
    setTimeout(() => setCopiedReviewReport(false), 1500);
  };

  const fullTreeNodes = useMemo(() => {
    if (!data) return [];
    return buildHierarchicalTree(data.structure.tree, activeFolderFilter);
  }, [data, activeFolderFilter]);

  const visibleTreeNodes = useMemo(() => {
    return filterHierarchicalTree(fullTreeNodes, treeSearch);
  }, [fullTreeNodes, treeSearch]);

  const allFolderPaths = useMemo(() => collectAllFolderPaths(fullTreeNodes), [fullTreeNodes]);

  const previewLines = useMemo(() => {
    if (!filePreview || filePreview.isBinary || filePreview.tooLarge) return [];
    if (filePreview.content === '') return [];
    return filePreview.content.split(/\r?\n/);
  }, [filePreview]);

  const reviewableFiles = useMemo(() => {
    if (!data) return [];
    return data.structure.tree
      .filter((entry) => entry.type === 'blob' && isReviewableFilePath(entry.path))
      .sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }));
  }, [data]);

  const renderTreeNodes = (nodes: FileTreeNode[], depth = 0): React.ReactNode => {
    const forceExpand = Boolean(treeSearch.trim());
    return nodes.map((node) => {
      const paddingLeft = 10 + depth * 16;
      if (node.type === 'tree') {
        const isOpen = forceExpand || expandedFolders.has(node.path);
        return (
          <div key={`tree:${node.path}`}>
            <button
              type="button"
              onClick={() => handleToggleFolder(node.path)}
              style={{ paddingLeft }}
              aria-expanded={isOpen}
              className="w-full pr-3 py-1.5 flex items-center justify-between gap-2 text-left text-xs hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 transition group"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                {isOpen ? (
                  <FolderOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                )}
                <span className="font-mono text-[11px] font-semibold text-emerald-950 dark:text-emerald-50 truncate">
                  {node.name}
                </span>
              </span>
              <span className="font-mono text-[10px] text-emerald-700/75 dark:text-emerald-400/75 tabular-nums shrink-0">
                {node.children.length}
              </span>
            </button>
            {isOpen && node.children.length > 0 && (
              <div className="border-l border-emerald-200/80 dark:border-emerald-800/70 ml-3">
                {renderTreeNodes(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      const isSelected = selectedFilePath === node.path;
      return (
        <button
          key={`blob:${node.path}`}
          type="button"
          onClick={() => handleSelectFile(node.path)}
          style={{ paddingLeft: paddingLeft + 18 }}
          className={`w-full pr-3 py-1.5 flex items-center justify-between gap-2 text-left text-xs transition ${
            isSelected
              ? 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950 font-semibold'
              : 'hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-100'
          }`}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <FileCode2
              className={`w-3.5 h-3.5 shrink-0 ${
                isSelected ? 'text-white dark:text-slate-950' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            />
            <span className="font-mono text-[11px] truncate">{node.name}</span>
          </span>
          <span
            className={`font-mono text-[10px] tabular-nums shrink-0 ${
              isSelected ? 'text-emerald-100 dark:text-slate-900/80' : 'text-emerald-700/80 dark:text-emerald-400/75'
            }`}
          >
            {formatBytes(node.size)}
          </span>
        </button>
      );
    });
  };

  const recentCommits = useMemo(() => {
    if (!data) return [];
    return data.commits.slice(0, RECENT_COMMIT_LIMIT);
  }, [data]);

  const filteredCommits = useMemo(() => {
    const q = commitSearch.trim().toLowerCase();
    if (!q) return recentCommits;
    return recentCommits.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.body.toLowerCase().includes(q) ||
        c.authorName.toLowerCase().includes(q) ||
        (c.authorLogin || '').toLowerCase().includes(q) ||
        c.shortSha.toLowerCase().includes(q)
    );
  }, [recentCommits, commitSearch]);

  const renderedReadmeBlocks = useMemo(() => {
    if (!data?.readme?.content) return [];
    return renderSafeMarkdownBlocks(data.readme.content, data.repo.fullName, data.repo.selectedBranch);
  }, [data]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header & Link Form */}
      <section className="bg-white dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-emerald-950 dark:text-white tracking-tight">
              GitHub Intelligence
            </h2>
            <p className="text-xs text-emerald-800 dark:text-emerald-200/80 max-w-2xl leading-relaxed">
              Link a GitHub repository with your repository URL and personal access token to inspect directory architecture, browse source files, and run Gemini AI performance or security reviews.
            </p>
          </div>
          {data && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fetchIntelligence(linkedRepoUrl, patInput, selectedBranch)}
                disabled={isLoading}
                className="px-3.5 py-2 min-h-[40px] rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3.5 py-2 min-h-[40px] rounded-xl border border-rose-300 dark:border-rose-700/60 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleLinkSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-5 space-y-1.5">
            <label htmlFor="gh-repo-url" className="block text-xs font-medium text-emerald-900 dark:text-emerald-200">
              Repository URL
            </label>
            <div className="relative">
              <Link2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="gh-repo-url"
                type="text"
                value={repoUrlInput}
                onChange={(e) => setRepoUrlInput(e.target.value)}
                placeholder="https://github.com/owner/repository"
                autoComplete="off"
                className="w-full min-h-[44px] pl-9 pr-3 py-2.5 bg-emerald-50/70 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/80 rounded-xl text-xs text-emerald-950 dark:text-white placeholder-emerald-600/60 dark:placeholder-emerald-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-400"
              />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-1.5">
            <label htmlFor="gh-pat-input" className="block text-xs font-medium text-emerald-900 dark:text-emerald-200">
              Personal Access Token{' '}
              <span className="text-emerald-700/80 dark:text-emerald-400/70 font-normal">(optional for public repos)</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="gh-pat-input"
                type={showPat ? 'text' : 'password'}
                value={patInput}
                onChange={(e) => setPatInput(e.target.value)}
                placeholder="ghp_... or github_pat_..."
                autoComplete="off"
                spellCheck={false}
                className="w-full min-h-[44px] pl-9 pr-10 py-2.5 bg-emerald-50/70 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/80 rounded-xl text-xs font-mono text-emerald-950 dark:text-white placeholder-emerald-600/60 dark:placeholder-emerald-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-400"
              />
              <button
                type="button"
                onClick={() => setShowPat((v) => !v)}
                aria-label={showPat ? 'Hide token' : 'Show token'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-emerald-700 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-white transition"
              >
                {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={isLoading || !repoUrlInput.trim()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-400 dark:hover:bg-emerald-300 dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition disabled:opacity-50"
            >
              <GitBranch className="w-4 h-4 shrink-0" />
              <span>{isLoading ? 'Analyzing...' : data ? 'Update Link' : 'Link Repo'}</span>
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-800/80 dark:text-emerald-300/80 pt-1 border-t border-emerald-200 dark:border-emerald-800/60">
          <span>
            Tokens are held strictly in active session memory and proxied server-side to GitHub — never stored in browser storage or database.
          </span>
          {!data && (
            <button
              type="button"
              onClick={() => {
                setRepoUrlInput('https://github.com/facebook/react');
                setErrorMsg('');
              }}
              className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200 underline underline-offset-2 whitespace-nowrap shrink-0 font-medium"
            >
              Try sample public repo
            </button>
          )}
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700/70 text-xs text-rose-800 dark:text-rose-100"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Loading Skeleton */}
      {isLoading && !data && (
        <div className="space-y-6 animate-pulse">
          <div className="bg-white dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl p-6 space-y-4">
            <div className="h-6 w-64 bg-emerald-200/80 dark:bg-emerald-800/70 rounded" />
            <div className="h-4 w-96 max-w-full bg-emerald-100 dark:bg-emerald-800/50 rounded" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {[1, 2, 3, 4].map((k) => (
                <div key={k} className="h-16 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-white dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl p-5 space-y-3">
              {[1, 2, 3, 4, 5, 6].map((k) => (
                <div key={k} className="h-9 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg" />
              ))}
            </div>
            <div className="h-80 bg-white dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl p-5 space-y-3">
              {[1, 2, 3, 4, 5].map((k) => (
                <div key={k} className="h-12 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !data && (
        <section className="bg-white dark:bg-emerald-900/35 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl p-8 sm:p-10 text-center space-y-5 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/70 flex items-center justify-center mx-auto text-emerald-700 dark:text-emerald-300">
            <GitBranch className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h3 className="text-base font-bold text-emerald-950 dark:text-white">No Repository Linked Yet</h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-200/80 leading-relaxed">
              Paste any GitHub repository URL above (with your personal access token for private repositories) to map its folder structure, language breakdown, and latest commit history.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-2 text-left">
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/70 space-y-1">
              <div className="text-xs font-semibold text-emerald-950 dark:text-white">Repository Structure</div>
              <p className="text-[11px] text-emerald-800/85 dark:text-emerald-300/80">
                Top-level directory breakdown, key config manifests, file extension stats, and searchable tree.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/70 space-y-1">
              <div className="text-xs font-semibold text-emerald-950 dark:text-white">Recent Commits</div>
              <p className="text-[11px] text-emerald-800/85 dark:text-emerald-300/80">
                The 5 most recent commit messages with author names, timestamps, and copyable short commit hashes.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/70 space-y-1">
              <div className="text-xs font-semibold text-emerald-950 dark:text-white">README & Branches</div>
              <p className="text-[11px] text-emerald-800/85 dark:text-emerald-300/80">
                Read formatted README.md documentation and switch branches live without storing tokens in browser storage.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Populated Intelligence Dashboard */}
      {data && (
        <>
          {/* Repository Overview & 4-Column Tabular KPI Strip */}
          <section className="bg-white dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                {data.repo.ownerAvatar ? (
                  <img
                    src={data.repo.ownerAvatar}
                    alt={data.repo.ownerLogin}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-xl border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50 dark:bg-emerald-950 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-sm font-bold text-emerald-800 dark:text-emerald-300 shrink-0">
                    {data.repo.ownerLogin.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-emerald-950 dark:text-white truncate">
                      {data.repo.fullName}
                    </h3>
                    {data.repo.htmlUrl && (
                      <a
                        href={data.repo.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:text-amber-600 dark:text-emerald-300 dark:hover:text-amber-300 transition shrink-0"
                        title="Open repository on GitHub"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {data.repo.description && (
                    <p className="text-xs text-emerald-900/85 dark:text-emerald-100/85 leading-relaxed max-w-3xl">
                      {data.repo.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-emerald-700 dark:text-emerald-300/85 font-mono tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      {data.repo.isPrivate ? (
                        <Lock className="w-3 h-3 text-amber-600 dark:text-amber-300" />
                      ) : (
                        <Globe className="w-3 h-3 text-emerald-700 dark:text-emerald-300" />
                      )}
                      {data.repo.isPrivate ? 'Private' : 'Public'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Default: {data.repo.defaultBranch}</span>
                    {data.repo.license && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{data.repo.license}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>Updated {formatRelativeDate(data.repo.pushedAt || data.repo.updatedAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{data.authenticatedWithToken ? 'Token authenticated' : 'Public API'}</span>
                  </div>
                </div>
              </div>

              {/* Branch Selector */}
              {data.branches.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <label htmlFor="gh-branch-select" className="text-[11px] text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                    Branch
                  </label>
                  <select
                    id="gh-branch-select"
                    value={selectedBranch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    disabled={isLoading}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-xs font-mono text-emerald-950 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-400"
                  >
                    {data.branches.map((br) => (
                      <option key={br} value={br}>
                        {br}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 4-Column Tabular KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/75 border border-emerald-200 dark:border-emerald-800/70">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300/80">Files Indexed</div>
                <div className="text-lg font-bold text-emerald-950 dark:text-white font-mono tabular-nums mt-0.5">
                  {data.structure.totalFiles.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-700/85 dark:text-emerald-400/80 font-mono tabular-nums">
                  {formatBytes(data.structure.totalBytes)} tracked
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/75 border border-emerald-200 dark:border-emerald-800/70">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300/80">Directories</div>
                <div className="text-lg font-bold text-emerald-950 dark:text-white font-mono tabular-nums mt-0.5">
                  {data.structure.totalDirectories.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-700/85 dark:text-emerald-400/80 font-mono tabular-nums">
                  {data.structure.topLevelFolders.length} top-level areas
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/75 border border-emerald-200 dark:border-emerald-800/70">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300/80">Recent Commits</div>
                <div className="text-lg font-bold text-emerald-950 dark:text-white font-mono tabular-nums mt-0.5">
                  {recentCommits.length.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-700/85 dark:text-emerald-400/80 font-mono tabular-nums">
                  {data.contributors.length} active contributor{data.contributors.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/75 border border-emerald-200 dark:border-emerald-800/70">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300/80">Community & Issues</div>
                <div className="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono tabular-nums mt-0.5">
                  {data.repo.stars.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-emerald-700 dark:text-emerald-300">stars</span>
                </div>
                <div className="text-[11px] text-emerald-700/85 dark:text-emerald-400/80 font-mono tabular-nums">
                  {data.repo.forks.toLocaleString()} forks · {data.repo.openIssues.toLocaleString()} open issues
                </div>
              </div>
            </div>

            {/* Language Composition Bar */}
            {data.languages.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="h-2.5 w-full rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-950 flex">
                  {data.languages.map((lang, idx) => (
                    <div
                      key={lang.name}
                      style={{ width: `${Math.max(lang.percent, 1)}%` }}
                      className={`${LANGUAGE_BAR_COLORS[idx % LANGUAGE_BAR_COLORS.length]} h-full`}
                      title={`${lang.name}: ${lang.percent}%`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-emerald-800 dark:text-emerald-200 font-mono tabular-nums">
                  {data.languages.slice(0, 6).map((lang, idx) => (
                    <span key={lang.name} className="inline-flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-sm ${LANGUAGE_BAR_COLORS[idx % LANGUAGE_BAR_COLORS.length]}`}
                        aria-hidden="true"
                      />
                      <span className="font-sans text-emerald-950 dark:text-white font-medium">{lang.name}</span>
                      <span className="text-emerald-700/85 dark:text-emerald-300/80">{lang.percent}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Mobile Segmented Panel Switcher */}
          <div className="grid grid-cols-5 lg:hidden gap-1 p-1 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <button
              type="button"
              onClick={() => setMobilePanel('files')}
              className={`min-h-[40px] px-1.5 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                mobilePanel === 'files'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950'
                  : 'text-emerald-800 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-white'
              }`}
            >
              Files
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel('review')}
              className={`min-h-[40px] px-1.5 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                mobilePanel === 'review'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950'
                  : 'text-emerald-800 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-white'
              }`}
            >
              AI Review
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel('structure')}
              className={`min-h-[40px] px-1.5 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                mobilePanel === 'structure'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950'
                  : 'text-emerald-800 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-white'
              }`}
            >
              Summary
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel('commits')}
              className={`min-h-[40px] px-1.5 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                mobilePanel === 'commits'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950'
                  : 'text-emerald-800 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-white'
              }`}
            >
              Commits
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel('readme')}
              className={`min-h-[40px] px-1.5 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                mobilePanel === 'readme'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950'
                  : 'text-emerald-800 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-white'
              }`}
            >
              README
            </button>
          </div>

          {/* Interactive File Browser Tree & File Content Preview */}
          <section
            ref={fileBrowserRef}
            className={`bg-white dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs ${
              mobilePanel === 'files' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-emerald-200 dark:border-emerald-800/70 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-emerald-950 dark:text-white">
                    File Browser &amp; Code Preview
                  </h3>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 font-mono tabular-nums truncate">
                    {data.structure.tree.length.toLocaleString()} indexed entries · Branch: {data.repo.selectedBranch}
                    {activeFolderFilter ? ` · Scope: ${activeFolderFilter}` : ''}
                    {data.structure.truncated ? ' · Truncated by GitHub API' : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {activeFolderFilter && (
                  <button
                    type="button"
                    onClick={() => setActiveFolderFilter(null)}
                    className="px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-[11px] font-semibold inline-flex items-center gap-1 transition"
                  >
                    <span>Scope: {activeFolderFilter}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (expandedFolders.size > 0) {
                      setExpandedFolders(new Set());
                    } else {
                      setExpandedFolders(new Set(allFolderPaths));
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition"
                >
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                  <span>{expandedFolders.size > 0 ? 'Collapse All' : 'Expand All'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Collapsible Folder Tree Pane */}
              <div className="lg:col-span-5 flex flex-col space-y-2.5 min-w-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={treeSearch}
                    onChange={(e) => setTreeSearch(e.target.value)}
                    placeholder="Search folders or files..."
                    className="w-full min-h-[38px] pl-8 pr-8 py-1.5 bg-emerald-50/70 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-950 dark:text-white placeholder-emerald-600/60 dark:placeholder-emerald-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-400"
                  />
                  {treeSearch && (
                    <button
                      type="button"
                      onClick={() => setTreeSearch('')}
                      aria-label="Clear tree search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-emerald-700 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="border border-emerald-200 dark:border-emerald-800/80 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/60 py-1.5 h-[440px] overflow-y-auto">
                  {visibleTreeNodes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center px-4 text-center text-xs text-emerald-700 dark:text-emerald-300/80 space-y-1">
                      <Folder className="w-5 h-5 text-emerald-500/70" />
                      <span>No folders or files match your filter.</span>
                    </div>
                  ) : (
                    renderTreeNodes(visibleTreeNodes, 0)
                  )}
                </div>
              </div>

              {/* File Content Preview Pane */}
              <div className="lg:col-span-7 flex flex-col border border-emerald-200 dark:border-emerald-800/80 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/70 overflow-hidden min-w-0 h-[490px]">
                {/* Preview Toolbar */}
                <div className="px-3.5 py-2.5 bg-emerald-100/70 dark:bg-emerald-950 border-b border-emerald-200 dark:border-emerald-800/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span className="font-mono text-[11px] font-semibold text-emerald-950 dark:text-white truncate">
                      {selectedFilePath || 'No file selected'}
                    </span>
                  </div>

                  {filePreview && (
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md bg-white/80 dark:bg-emerald-900/70 border border-emerald-200 dark:border-emerald-800">
                        {inferLanguageLabel(filePreview.name)}
                      </span>
                      <span className="text-[10px] font-mono tabular-nums text-emerald-700 dark:text-emerald-300/80">
                        {formatBytes(filePreview.size)}
                        {!filePreview.isBinary && !filePreview.tooLarge ? ` · ${filePreview.lineCount} lines` : ''}
                      </span>

                      {!filePreview.isBinary && !filePreview.tooLarge && (
                        <>
                          <button
                            type="button"
                            disabled={isReviewing}
                            onClick={() => handleRunCodeReview('performance', filePreview.path, false, true)}
                            title="Run Gemini Performance Review on this file"
                            className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/80 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/70 text-[11px] font-semibold inline-flex items-center gap-1 transition disabled:opacity-50"
                          >
                            <Gauge className="w-3 h-3" />
                            <span>Perf</span>
                          </button>
                          <button
                            type="button"
                            disabled={isReviewing}
                            onClick={() => handleRunCodeReview('security', filePreview.path, false, true)}
                            title="Run Gemini Security Review on this file"
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-400 dark:hover:bg-emerald-300 dark:text-slate-950 text-[11px] font-bold inline-flex items-center gap-1 transition disabled:opacity-50"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Security</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setWrapCodeLines((w) => !w)}
                            title={wrapCodeLines ? 'Disable line wrap' : 'Enable line wrap'}
                            className={`p-1.5 rounded-lg border text-[11px] transition ${
                              wrapCodeLines
                                ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-400 dark:text-slate-950 dark:border-emerald-400'
                                : 'bg-white dark:bg-emerald-900/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-800'
                            }`}
                          >
                            <WrapText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyFileCode}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-800 text-[11px] font-semibold inline-flex items-center gap-1 transition"
                          >
                            {copiedFileCode ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </>
                      )}

                      {filePreview.htmlUrl && (
                        <a
                          href={filePreview.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open file on GitHub"
                          className="p-1.5 rounded-lg bg-white dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-800 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Preview Body */}
                <div className="flex-1 overflow-auto">
                  {!selectedFilePath ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <FileCode2 className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-emerald-950 dark:text-white">
                        Select a File to Preview
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 max-w-xs">
                        Expand any folder in the tree on the left and click a file to inspect its source code live from GitHub.
                      </p>
                    </div>
                  ) : isLoadingFile ? (
                    <div className="p-4 space-y-2.5 animate-pulse">
                      {[75, 92, 60, 88, 70, 95, 52, 84, 66, 90].map((w, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-6 h-3.5 rounded bg-emerald-200/70 dark:bg-emerald-800/60 shrink-0" />
                          <div
                            style={{ width: `${w}%` }}
                            className="h-3.5 rounded bg-emerald-200/60 dark:bg-emerald-800/50"
                          />
                        </div>
                      ))}
                    </div>
                  ) : fileError ? (
                    <div className="p-5">
                      <div
                        role="alert"
                        className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700/70 text-xs text-rose-800 dark:text-rose-100"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <span>{fileError}</span>
                      </div>
                    </div>
                  ) : filePreview?.isBinary ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                      <p className="text-xs font-semibold text-emerald-950 dark:text-white">
                        Binary File ({formatBytes(filePreview.size)})
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 max-w-xs">
                        This file is a binary asset and cannot be previewed as plain source code.
                      </p>
                      {filePreview.htmlUrl && (
                        <a
                          href={filePreview.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-400 dark:hover:bg-emerald-300 dark:text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition"
                        >
                          <span>View on GitHub</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ) : filePreview?.tooLarge ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                      <p className="text-xs font-semibold text-emerald-950 dark:text-white">
                        File Too Large to Preview ({formatBytes(filePreview.size)})
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 max-w-xs">
                        Files larger than 512 KB are opened directly on GitHub to keep your browser fast.
                      </p>
                      {filePreview.htmlUrl && (
                        <a
                          href={filePreview.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-400 dark:hover:bg-emerald-300 dark:text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition"
                        >
                          <span>Open on GitHub</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ) : filePreview ? (
                    <div className="min-w-full">
                      {filePreview.truncated && (
                        <div className="px-3.5 py-1.5 text-[11px] bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-200">
                          Preview truncated at 150,000 characters. Open on GitHub to read the complete file.
                        </div>
                      )}
                      {previewLines.length === 0 ? (
                        <div className="p-6 text-center text-xs text-emerald-700 dark:text-emerald-300/80 font-mono">
                          (Empty file)
                        </div>
                      ) : (
                        <table className="w-full border-collapse font-mono text-[11px] leading-relaxed">
                          <tbody>
                            {previewLines.map((lineText, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-emerald-100/50 dark:hover:bg-emerald-900/35"
                              >
                                <td className="select-none text-right align-top pl-3 pr-3 py-0.5 text-emerald-600/70 dark:text-emerald-500/80 border-r border-emerald-200/70 dark:border-emerald-800/60 w-10 tabular-nums">
                                  {idx + 1}
                                </td>
                                <td
                                  className={`pl-3 pr-4 py-0.5 text-emerald-950 dark:text-emerald-50 ${
                                    wrapCodeLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                                  }`}
                                >
                                  <code>{lineText || ' '}</code>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {/* AI Code Review (Gemini Performance & Security Audit) */}
          <section
            ref={aiReviewSectionRef}
            className={`bg-white dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs ${
              mobilePanel === 'review' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-emerald-200 dark:border-emerald-800/70 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-amber-300 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-emerald-950 dark:text-white">
                    AI Code Review (Gemini)
                  </h3>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 truncate">
                    Select any repository file and run an automated performance or security audit.
                  </p>
                </div>
              </div>

              {reviewResult && (
                <button
                  type="button"
                  onClick={handleCopyReviewReport}
                  className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-[11px] font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap shrink-0 transition"
                >
                  {copiedReviewReport ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Copied Report</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Report</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* File Picker + Focus Switcher + Run Button */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-6 space-y-1.5 min-w-0">
                <label htmlFor="gh-review-file-select" className="block text-xs font-medium text-emerald-900 dark:text-emerald-200">
                  Target Repository File
                </label>
                <select
                  id="gh-review-file-select"
                  value={reviewTargetPath}
                  onChange={(e) => {
                    const nextPath = e.target.value;
                    setReviewTargetPath(nextPath);
                    setReviewError('');
                    if (nextPath && nextPath !== selectedFilePath) {
                      void handleSelectFile(nextPath);
                    }
                  }}
                  disabled={isReviewing || reviewableFiles.length === 0}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/80 text-xs font-mono text-emerald-950 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-400"
                >
                  <option value="">
                    {reviewableFiles.length === 0
                      ? 'No reviewable source files indexed'
                      : `Select a file (${reviewableFiles.length} available)...`}
                  </option>
                  {reviewableFiles.map((file) => (
                    <option key={file.path} value={file.path}>
                      {file.path} ({formatBytes(file.size)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-4 space-y-1.5">
                <span className="block text-xs font-medium text-emerald-900 dark:text-emerald-200">
                  Review Focus
                </span>
                <div className="grid grid-cols-2 gap-1 p-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded-xl min-h-[42px]">
                  <button
                    type="button"
                    onClick={() => setReviewFocus('performance')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition ${
                      reviewFocus === 'performance'
                        ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
                        : 'text-emerald-800 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-white'
                    }`}
                  >
                    <Gauge className="w-3.5 h-3.5 shrink-0" />
                    <span>Performance</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFocus('security')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition ${
                      reviewFocus === 'security'
                        ? 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950 shadow-xs'
                        : 'text-emerald-800 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Security</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isReviewing || !reviewTargetPath}
                  onClick={() => handleRunCodeReview(reviewFocus, reviewTargetPath, Boolean(reviewResult && reviewResult.filePath === reviewTargetPath && reviewResult.reviewType === reviewFocus))}
                  className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-400 dark:hover:bg-emerald-300 dark:text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition disabled:opacity-50"
                >
                  {isReviewing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>Reviewing...</span>
                    </>
                  ) : reviewResult && reviewResult.filePath === reviewTargetPath && reviewResult.reviewType === reviewFocus ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                      <span>Re-run Review</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Run Review</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {reviewError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700/70 text-xs text-rose-800 dark:text-rose-100"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{reviewError}</span>
              </div>
            )}

            {isReviewing && (
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/60 space-y-3 animate-pulse">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>
                    Gemini is running a {reviewFocus} audit on <span className="font-mono">{reviewTargetPath}</span>...
                  </span>
                </div>
                <div className="h-4 w-3/4 bg-emerald-200/70 dark:bg-emerald-800/60 rounded" />
                <div className="h-20 w-full bg-emerald-200/50 dark:bg-emerald-800/40 rounded-xl" />
                <div className="h-20 w-full bg-emerald-200/50 dark:bg-emerald-800/40 rounded-xl" />
              </div>
            )}

            {!isReviewing && !reviewResult && !reviewError && (
              <div className="p-6 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/40 text-center space-y-1.5">
                <p className="text-xs font-semibold text-emerald-950 dark:text-white">
                  Ready for AI Code Review
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 max-w-lg mx-auto">
                  Pick a file from the dropdown above (or click any file in the File Browser tree), choose Performance or Security, and click Run Review to receive prioritized findings and fix suggestions.
                </p>
              </div>
            )}

            {!isReviewing && reviewResult && (
              <div className="space-y-4">
                {/* Summary & Score Header */}
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          reviewResult.reviewType === 'security'
                            ? 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950'
                            : 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
                        }`}
                      >
                        {reviewResult.reviewType === 'security' ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : (
                          <Gauge className="w-3 h-3" />
                        )}
                        <span>{reviewResult.reviewType} Audit</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-950 dark:text-white truncate">
                        {reviewResult.filePath}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300/80">
                        · {reviewResult.model} · {formatRelativeDate(reviewResult.generatedAt)}
                        {reviewResult.truncated ? ' · Truncated at 55 KB' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900 dark:text-emerald-100/90 leading-relaxed">
                      {reviewResult.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                    <div
                      className={`px-3.5 py-2 rounded-xl border text-center min-w-[92px] ${
                        reviewResult.score >= 85
                          ? 'bg-emerald-100 dark:bg-emerald-900/80 border-emerald-300 dark:border-emerald-600 text-emerald-950 dark:text-emerald-100'
                          : reviewResult.score >= 65
                          ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100'
                          : 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100'
                      }`}
                    >
                      <div className="text-xl font-extrabold font-mono tabular-nums leading-none">
                        {reviewResult.score}
                        <span className="text-[11px] font-normal opacity-75">/100</span>
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wide mt-1">
                        {reviewResult.rating}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prioritized Findings */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-950 dark:text-white uppercase tracking-wider">
                      Findings ({reviewResult.findings.length})
                    </h4>
                  </div>

                  {reviewResult.findings.length === 0 ? (
                    <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/50 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        No significant {reviewResult.reviewType} issues detected in this file.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {reviewResult.findings.map((finding, idx) => {
                        const sevStyle =
                          finding.severity === 'critical' || finding.severity === 'high'
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700/80'
                            : finding.severity === 'medium'
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700/80'
                            : 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700/80';

                        return (
                          <div
                            key={`${finding.title}-${idx}`}
                            className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/60 space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase inline-flex items-center gap-1 shrink-0 ${sevStyle}`}
                                >
                                  {finding.severity === 'critical' || finding.severity === 'high' ? (
                                    <AlertTriangle className="w-3 h-3" />
                                  ) : (
                                    <Info className="w-3 h-3" />
                                  )}
                                  <span>{finding.severity}</span>
                                </span>
                                <span className="text-xs font-bold text-emerald-950 dark:text-white break-words">
                                  {finding.title}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 shrink-0">
                                {finding.lineHint}
                              </span>
                            </div>

                            {finding.impact && (
                              <p className="text-xs text-emerald-900/90 dark:text-emerald-100/90 leading-relaxed">
                                <span className="font-semibold text-emerald-950 dark:text-white">Impact: </span>
                                {finding.impact}
                              </p>
                            )}
                            {finding.recommendation && (
                              <p className="text-xs text-emerald-900/90 dark:text-emerald-100/90 leading-relaxed">
                                <span className="font-semibold text-emerald-950 dark:text-white">Fix: </span>
                                {finding.recommendation}
                              </p>
                            )}
                            {finding.codeExample && (
                              <pre className="p-3 rounded-lg bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 overflow-x-auto text-[11px] font-mono text-emerald-950 dark:text-emerald-100 leading-relaxed">
                                <code>{finding.codeExample}</code>
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Strengths & Quick Wins */}
                {(reviewResult.strengths.length > 0 || reviewResult.quickWins.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reviewResult.strengths.length > 0 && (
                      <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/60 space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          What Works Well
                        </div>
                        <ul className="space-y-1 text-xs text-emerald-900 dark:text-emerald-100/90">
                          {reviewResult.strengths.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {reviewResult.quickWins.length > 0 && (
                      <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/30 space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                          Recommended Next Steps
                        </div>
                        <ul className="space-y-1 text-xs text-emerald-950 dark:text-emerald-100/90">
                          {reviewResult.quickWins.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Main 2-Column Intelligence Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: Repository Architecture Summary */}
            <section
              className={`lg:col-span-6 bg-white dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 space-y-4 shadow-xs ${
                mobilePanel === 'structure' ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-emerald-950 dark:text-white">Repository Architecture</h3>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 font-mono tabular-nums">
                    Branch: {data.repo.selectedBranch}
                    {data.structure.truncated ? ' · Tree truncated by GitHub API' : ''}
                  </p>
                </div>
                {activeFolderFilter && (
                  <button
                    type="button"
                    onClick={() => setActiveFolderFilter(null)}
                    className="text-xs text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200 underline underline-offset-2 whitespace-nowrap shrink-0"
                  >
                    Clear folder filter
                  </button>
                )}
              </div>

              {/* Key Manifests / Configs (click any config to preview directly) */}
              {data.structure.keyFiles.length > 0 && (
                <div className="text-[11px] text-emerald-800 dark:text-emerald-200/90 border-y border-emerald-200 dark:border-emerald-800/60 py-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Quick Open Configs:</span>
                  {data.structure.keyFiles.map((kf, idx) => (
                    <React.Fragment key={kf}>
                      {idx > 0 && <span aria-hidden="true" className="text-emerald-400 dark:text-emerald-600">·</span>}
                      <button
                        type="button"
                        onClick={() => handleSelectFile(kf, true)}
                        className="font-mono text-emerald-950 dark:text-white hover:text-amber-700 dark:hover:text-amber-300 underline decoration-emerald-400/60 underline-offset-2 transition"
                      >
                        {kf}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Top-Level Folder Breakdown */}
              {data.structure.topLevelFolders.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    Top-Level Modules (select to scope File Browser)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {data.structure.topLevelFolders.slice(0, 12).map((folder) => {
                      const isSelected = activeFolderFilter === folder.name;
                      return (
                        <button
                          key={folder.name}
                          type="button"
                          onClick={() => {
                            const nextFilter = isSelected ? null : folder.name;
                            setActiveFolderFilter(nextFilter);
                            if (nextFilter && nextFilter !== '(root)') {
                              setExpandedFolders((prev) => new Set(prev).add(nextFilter));
                            }
                            setMobilePanel('files');
                            fileBrowserRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className={`p-2.5 rounded-xl border text-left transition ${
                            isSelected
                              ? 'bg-emerald-100 dark:bg-emerald-400/20 border-emerald-500 dark:border-emerald-400 text-emerald-950 dark:text-white'
                              : 'bg-emerald-50/70 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-100 hover:border-emerald-400 dark:hover:border-emerald-600'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold truncate">
                            <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                            <span className="truncate">{folder.name}</span>
                          </div>
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-300/80 font-mono tabular-nums mt-1">
                            {folder.fileCount} files · {formatBytes(folder.totalBytes)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* File Extension Breakdown */}
              {data.structure.extensions.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-emerald-800 dark:text-emerald-300/85 font-mono tabular-nums pt-1 border-t border-emerald-200/80 dark:border-emerald-800/60">
                  <span className="font-sans text-emerald-700 dark:text-emerald-400 font-semibold">Top types:</span>
                  {data.structure.extensions.slice(0, 8).map((item, idx) => (
                    <React.Fragment key={item.ext}>
                      {idx > 0 && <span aria-hidden="true" className="text-emerald-400 dark:text-emerald-700">·</span>}
                      <span>
                        {item.ext} ({item.count})
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </section>

            {/* RIGHT: Latest Commit Activity */}
            <section
              className={`lg:col-span-6 bg-white dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 space-y-4 shadow-xs ${
                mobilePanel === 'commits' ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-emerald-950 dark:text-white">5 Most Recent Commits</h3>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 font-mono tabular-nums">
                    Showing {filteredCommits.length} of {recentCommits.length} most recent commits · Branch: {data.repo.selectedBranch}
                  </p>
                </div>
              </div>

              {/* Active Contributors Strip */}
              {data.contributors.length > 0 && (
                <div className="text-[11px] text-emerald-800 dark:text-emerald-200/90 border-y border-emerald-200 dark:border-emerald-800/60 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Recent Authors:</span>
                  {data.contributors.slice(0, 5).map((person, idx) => (
                    <React.Fragment key={`${person.login || person.name}-${idx}`}>
                      {idx > 0 && <span aria-hidden="true" className="text-emerald-400 dark:text-emerald-700">·</span>}
                      <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                        <span className="font-sans text-emerald-950 dark:text-white font-medium">{person.name}</span>
                        <span className="text-emerald-700 dark:text-emerald-300/80">({person.commitCount})</span>
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Commit Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={commitSearch}
                  onChange={(e) => setCommitSearch(e.target.value)}
                  placeholder="Search commit messages, authors, or SHA..."
                  className="w-full min-h-[38px] pl-8 pr-3 py-1.5 bg-emerald-50/70 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-950 dark:text-white placeholder-emerald-600/60 dark:placeholder-emerald-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-400"
                />
              </div>

              {/* Commit Feed */}
              <div className="border border-emerald-200 dark:border-emerald-800/80 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/60 divide-y divide-emerald-200/70 dark:divide-emerald-900/70 max-h-[540px] overflow-y-auto">
                {filteredCommits.length === 0 ? (
                  <div className="py-10 px-4 text-center text-xs text-emerald-700 dark:text-emerald-300/80">
                    {recentCommits.length === 0
                      ? 'No commits found on this branch.'
                      : 'No commits match your search.'}
                  </div>
                ) : (
                  filteredCommits.map((commit, index) => {
                    const hasBody = Boolean(commit.body.trim());
                    const isExpanded = expandedCommitSha === commit.sha;
                    return (
                      <div key={commit.sha || `${index}-${commit.shortSha}`} className="p-3.5 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/35 transition space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            {commit.authorAvatar ? (
                              <img
                                src={commit.authorAvatar}
                                alt={commit.authorName}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-lg border border-emerald-300 dark:border-emerald-700/70 bg-white dark:bg-emerald-950 object-cover shrink-0 mt-0.5"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-lg border border-emerald-300 dark:border-emerald-700/70 bg-white dark:bg-emerald-950 flex items-center justify-center text-[10px] font-bold text-emerald-800 dark:text-emerald-300 shrink-0 mt-0.5">
                                {commit.authorName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 space-y-1">
                              <div className="text-xs font-semibold text-emerald-950 dark:text-white leading-snug break-words">
                                {commit.title}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-emerald-700 dark:text-emerald-300/80 font-mono tabular-nums">
                                <span className="font-sans text-emerald-900 dark:text-emerald-200">{commit.authorName}</span>
                                <span aria-hidden="true">·</span>
                                <span title={formatShortDate(commit.date)}>
                                  {formatRelativeDate(commit.date)}
                                </span>
                                {commit.verified && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-emerald-700 dark:text-emerald-400">Verified</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopySha(commit.sha)}
                              title="Copy commit SHA"
                              className="px-2 py-1 rounded-lg bg-white dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700/70 text-[11px] font-mono text-amber-700 dark:text-amber-300 hover:text-emerald-950 dark:hover:text-white inline-flex items-center gap-1 transition"
                            >
                              <GitCommitHorizontal className="w-3 h-3" />
                              <span>{commit.shortSha}</span>
                              {copiedSha === commit.sha ? (
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-emerald-600/70 dark:text-emerald-400/70" />
                              )}
                            </button>
                            {commit.htmlUrl && (
                              <a
                                href={commit.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="View commit on GitHub"
                                className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:text-white dark:hover:bg-emerald-900 transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        {hasBody && (
                          <div className="pl-9">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCommitSha(isExpanded ? null : commit.sha)
                              }
                              className="text-[11px] text-emerald-700 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-white inline-flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                              <span>{isExpanded ? 'Hide commit details' : 'View commit details'}</span>
                            </button>
                            {isExpanded && (
                              <pre className="mt-2 p-2.5 rounded-lg bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/80 text-[11px] font-mono text-emerald-900 dark:text-emerald-100/90 whitespace-pre-wrap break-words">
                                {commit.body}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* README.md Viewer */}
          <section
            className={`bg-white dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs ${
              mobilePanel === 'readme' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-emerald-200 dark:border-emerald-800/70 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-amber-300 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-emerald-950 dark:text-white truncate">
                    {data.readme ? data.readme.name : 'README.md'}
                  </h3>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 font-mono tabular-nums truncate">
                    {data.readme
                      ? `${data.readme.path} · ${formatBytes(data.readme.size)} · Branch: ${data.repo.selectedBranch}${
                          data.readme.truncated ? ' · Truncated' : ''
                        }`
                      : `No README file detected on branch ${data.repo.selectedBranch}`}
                  </p>
                </div>
              </div>

              {data.readme && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 p-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setReadmeViewMode('preview')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap transition ${
                        readmeViewMode === 'preview'
                          ? 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950'
                          : 'text-emerald-800 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-white'
                      }`}
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReadmeViewMode('raw')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap transition ${
                        readmeViewMode === 'raw'
                          ? 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950'
                          : 'text-emerald-800 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3 h-3" />
                      <span>Raw</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyReadme}
                    className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition"
                  >
                    {copiedReadme ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {data.readme.htmlUrl && (
                    <a
                      href={data.readme.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition"
                    >
                      <span>GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {!data.readme ? (
              <div className="py-8 px-4 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/50 text-center space-y-1">
                <p className="text-xs font-semibold text-emerald-950 dark:text-white">No README.md Found</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80">
                  This repository does not include a README file on the <span className="font-mono">{data.repo.selectedBranch}</span> branch.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className={`rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/60 p-4 sm:p-5 overflow-y-auto transition-all ${
                    readmeExpanded ? 'max-h-[1200px]' : 'max-h-[420px]'
                  }`}
                >
                  {readmeViewMode === 'raw' ? (
                    <pre className="text-[11px] font-mono text-emerald-950 dark:text-emerald-100 whitespace-pre-wrap break-words leading-relaxed">
                      {data.readme.content}
                    </pre>
                  ) : (
                    <div className="space-y-3">{renderedReadmeBlocks}</div>
                  )}
                </div>

                {data.readme.content.length > 1400 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setReadmeExpanded((v) => !v)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-950 dark:text-amber-300 dark:hover:text-amber-200 inline-flex items-center gap-1 transition"
                    >
                      {readmeExpanded ? (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                          <span>Collapse README</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Expand Full README</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
