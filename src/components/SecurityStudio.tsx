import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  HardDrive,
  Trash2,
  BarChart3,
  Key,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Eye,
  EyeOff,
  RefreshCw,
  Cloud,
  Sparkles,
  Globe,
  Save,
  Download,
  MapPin,
  Navigation,
  Lock,
  Unlock,
  Fingerprint,
  KeyRound,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Layers,
  Share2,
  Link2,
  Pin,
  FileText,
  Folder,
  Code2,
  ArrowLeft,
  LayoutGrid,
  Megaphone,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Pencil,
  LocateFixed,
  Upload
} from 'lucide-react';
import { LiveGpsMap, type LiveGpsUserLocation } from './LiveGpsMap';
import {
  type EmojiLinkItem,
  generateEmojiFromUrl,
  generateRandomEmojiCode,
  buildEmojiShareUrl,
  renderAppIconWithEmojiFile,
  shareEmojiLinkWithAppImage,
} from '../utils/emojiLinkShare';

export type StudioNewsfeedChannel = 'feed_a' | 'feed_b' | 'feed_c' | 'feed_bc';
export type StudioAnnouncementTarget = 'all' | 'feed_a' | 'feed_b' | 'feed_c' | 'feed_bc';
export type StudioAnnouncementBadge = 'announcement' | 'reminder' | 'urgent';
export type StudioAnnouncementTone = 'emerald' | 'amber' | 'sky' | 'rose';

export interface StudioAnnouncementItem {
  id: string;
  title: string;
  message: string;
  badge: StudioAnnouncementBadge;
  tone: StudioAnnouncementTone;
  target: StudioAnnouncementTarget;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityUserAccount {
  id: string;
  name: string;
  phone: string;
  role?: 'admin' | 'member';
  status: 'pending' | 'approved';
  newsfeed?: StudioNewsfeedChannel;
  loginDate: string;
}

export interface KeyValueItem {
  id: string;
  key: string;
  value: string;
  secret?: boolean;
}

interface SecurityStudioProps {
  usersList: SecurityUserAccount[];
  setUsersList: React.Dispatch<React.SetStateAction<SecurityUserAccount[]>>;
  onAddUser?: (name: string, phone: string, pin?: string) => Promise<void> | void;
  onDeleteUser?: (userId: string) => Promise<void> | void;
  onUpdateUserNewsfeed?: (userId: string, newsfeed: StudioNewsfeedChannel) => Promise<void> | void;
  deletingUserIds?: string[];
  isCloudSynced?: boolean;
  storageMode?: 'postgres' | 'memory';
  authToken?: string | null;
  blockedUsers: string[];
  postsCount: number;
  mediaPostsCount: number;
  messagesCount: number;
  mediaMessagesCount: number;
  ledgerCount: number;
  ledgerTotalValue: number;
  knowledgeCount: number;
  emojiLinks?: EmojiLinkItem[];
  onEmojiLinksChanged?: (links: EmojiLinkItem[]) => void;
  defaultAppIcon?: string;
  syncTick?: number;
  newsfeedConfig?: { feedATitle: string; feedBTitle: string; feedCTitle: string };
  onNewsfeedConfigChanged?: (cfg: { feedATitle: string; feedBTitle: string; feedCTitle: string }) => void;
  announcements?: StudioAnnouncementItem[];
  onAnnouncementsChanged?: (items: StudioAnnouncementItem[]) => void;
  initialModule?: 'home' | 'announcements' | 'newsfeeds' | 'user_pins';
  onConsumeInitialModule?: () => void;
  adminNewsfeedFilter?: 'all' | StudioNewsfeedChannel;
  onAdminNewsfeedFilterChange?: (val: 'all' | StudioNewsfeedChannel) => void;
  firebaseConnectedEmail?: string | null;
  firebaseIsAdminVerified?: boolean;
  firebaseSyncState?: 'idle' | 'syncing' | 'synced' | 'error';
  firebaseLastSyncedAt?: string | null;
  firebaseSyncError?: string;
  onConnectFirebase?: () => Promise<void> | void;
  onDisconnectFirebase?: () => Promise<void> | void;
  onBackupToFirebase?: () => Promise<void> | void;
  onRestoreFromFirebase?: () => Promise<void> | void;
  onCloudStateRestored?: () => Promise<void> | void;
}

interface StudioNoteEntry {
  id: string;
  rawText: string;
  createdAt: string;
}

interface StudioNoteFile {
  id: string;
  title: string;
  category: string;
  entries: StudioNoteEntry[];
  organizedPrompt: string;
  createdAt: string;
  updatedAt: string;
}

interface EnvVaultEntry {
  id: string;
  category: string;
  keyName: string;
  value: string;
  secret: boolean;
  notes?: string;
  updatedAt: string;
}

const NOTE_CATEGORIES = [
  'App Features',
  'Messaging & Chat',
  'UI / Design',
  'Security Studio',
  'Backend & Database',
  'Bug Fixes',
] as const;

const ENV_CATEGORIES = [
  'Database',
  'Supabase Storage',
  'AI & Gemini',
  'Auth & App URL',
  'Render & Docker',
  'Code & Custom',
] as const;

const DEFAULT_LINKS = {
  aiStudioChat: 'https://aistudio.google.com/apps',
  renderDashboard: 'https://dashboard.render.com',
  renderLiveApp: 'https://chat-9-si9x.onrender.com',
  renderNewPostgres: 'https://dashboard.render.com/new/database',
  supabaseDashboard: 'https://supabase.com/dashboard/project/bcggthgaaadgmicgugkq',
  supabaseStorage: 'https://supabase.com/dashboard/project/bcggthgaaadgmicgugkq/storage/buckets',
};

const STORAGE_KEYS = {
  mainKeys: 'choychat_admin_simple_keys_v2',
  customKeys: 'choychat_admin_custom_kv_v1',
  links: 'choychat_admin_render_links_v3',
  storageProfile: 'choychat_admin_supabase_storage_v2',
};

interface MainKeysConfig {
  DATABASE_URL: string;
  ADMIN_PHONE: string;
  ADMIN_PIN: string;
  APP_URL: string;
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_BUCKET: string;
}

const AUTO_DOCKER_DEFAULTS = [
  'NODE_ENV=production',
  'PORT=10000',
  'HOST=0.0.0.0',
  'DISABLE_HMR=true',
  'APP_NAME=Choy Chat',
  'APP_VERSION=2.6.0',
  'STORAGE_PROVIDER=Supabase Cloud Storage',
  'STORAGE_QUOTA_GB=1',
  'SUPABASE_BUCKET=choychat-media',
  'PWA_THEME_COLOR=#022c22',
  'CACHE_MODE=lightweight-auto',
];

const KNOWN_KEY_DEFAULTS: MainKeysConfig = {
  DATABASE_URL: '',
  ADMIN_PHONE: '09361223978',
  ADMIN_PIN: '',
  APP_URL: 'https://chat-9-si9x.onrender.com',
  GEMINI_API_KEY: '',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  SUPABASE_BUCKET: 'choychat-media',
};

export const SecurityStudio: React.FC<SecurityStudioProps> = ({
  usersList,
  setUsersList,
  onAddUser,
  onDeleteUser,
  onUpdateUserNewsfeed,
  deletingUserIds = [],
  isCloudSynced = false,
  storageMode = 'memory',
  authToken = null,
  blockedUsers,
  postsCount,
  mediaPostsCount,
  messagesCount,
  mediaMessagesCount,
  ledgerCount,
  ledgerTotalValue,
  knowledgeCount,
  emojiLinks: propEmojiLinks,
  onEmojiLinksChanged,
  defaultAppIcon = '/assets/aistudio/image_20261121_145253_f477cbfa.webp',
  syncTick = 0,
  newsfeedConfig,
  onNewsfeedConfigChanged,
  announcements: propAnnouncements,
  onAnnouncementsChanged,
  initialModule,
  onConsumeInitialModule,
  adminNewsfeedFilter = 'all',
  onAdminNewsfeedFilterChange,
  firebaseConnectedEmail = null,
  firebaseIsAdminVerified = false,
  firebaseSyncState = 'idle',
  firebaseLastSyncedAt = null,
  firebaseSyncError = '',
  onConnectFirebase,
  onDisconnectFirebase,
  onBackupToFirebase,
  onRestoreFromFirebase,
  onCloudStateRestored,
}) => {
  // 1. Direct Admin Links
  const [adminLinks, setAdminLinks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.links);
      return saved ? { ...DEFAULT_LINKS, ...JSON.parse(saved) } : DEFAULT_LINKS;
    } catch {
      return DEFAULT_LINKS;
    }
  });
  const [editingLinks, setEditingLinks] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newsfeedATitle, setNewsfeedATitle] = useState(
    () => newsfeedConfig?.feedATitle || localStorage.getItem('choychat_nf_a_title') || 'Newsfeed A'
  );
  const [newsfeedBTitle, setNewsfeedBTitle] = useState(
    () => newsfeedConfig?.feedBTitle || localStorage.getItem('choychat_nf_b_title') || 'Newsfeed B'
  );
  const [newsfeedCTitle, setNewsfeedCTitle] = useState(
    () => newsfeedConfig?.feedCTitle || localStorage.getItem('choychat_nf_c_title') || 'Newsfeed C'
  );
  const [nfTitlesSaved, setNfTitlesSaved] = useState(false);
  const [savingNfTitles, setSavingNfTitles] = useState(false);

  useEffect(() => {
    if (!newsfeedConfig) return;
    if (newsfeedConfig.feedATitle) {
      setNewsfeedATitle(newsfeedConfig.feedATitle);
      localStorage.setItem('choychat_nf_a_title', newsfeedConfig.feedATitle);
    }
    if (newsfeedConfig.feedBTitle) {
      setNewsfeedBTitle(newsfeedConfig.feedBTitle);
      localStorage.setItem('choychat_nf_b_title', newsfeedConfig.feedBTitle);
    }
    if (newsfeedConfig.feedCTitle) {
      setNewsfeedCTitle(newsfeedConfig.feedCTitle);
      localStorage.setItem('choychat_nf_c_title', newsfeedConfig.feedCTitle);
    }
  }, [newsfeedConfig]);

  // 2. Simple Unified Keys (Pre-filled with safe known values)
  const [mainKeys, setMainKeys] = useState<MainKeysConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.mainKeys);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<MainKeysConfig>;
        return {
          ...KNOWN_KEY_DEFAULTS,
          ...parsed,
          ADMIN_PHONE: parsed.ADMIN_PHONE?.trim() || KNOWN_KEY_DEFAULTS.ADMIN_PHONE,
          APP_URL: parsed.APP_URL?.trim() || KNOWN_KEY_DEFAULTS.APP_URL,
          SUPABASE_BUCKET: parsed.SUPABASE_BUCKET?.trim() || KNOWN_KEY_DEFAULTS.SUPABASE_BUCKET,
        };
      }
    } catch {
      // ignore
    }
    return { ...KNOWN_KEY_DEFAULTS };
  });
  const [serverConfigured, setServerConfigured] = useState<Record<string, boolean>>({});
  const [mediaStorageMode, setMediaStorageMode] = useState<'supabase' | 'inline'>('inline');
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  const [customPairs, setCustomPairs] = useState<KeyValueItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.customKeys);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [showAutoDocker, setShowAutoDocker] = useState(false);
  const [newKvKey, setNewKvKey] = useState('');
  const [newKvVal, setNewKvVal] = useState('');
  const [newKvSecret, setNewKvSecret] = useState(false);
  const [keysSavedMsg, setKeysSavedMsg] = useState('');

  // 3. Storage monitoring
  const [storageEstimate, setStorageEstimate] = useState<{ usageBytes: number; quotaBytes: number }>({
    usageBytes: 0,
    quotaBytes: 0,
  });
  const [localStorageKb, setLocalStorageKb] = useState<number>(0);
  const [supabaseStorageProfile, setSupabaseStorageProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.storageProfile);
      return saved
        ? JSON.parse(saved)
        : {
            projectUrl: 'https://bcggthgaaadgmicgugkq.supabase.co',
            bucket: 'choychat-media',
            quotaGb: 1,
            dbQuotaMb: 500,
            dashboardUrl: 'https://supabase.com/dashboard/project/bcggthgaaadgmicgugkq/storage/buckets',
          };
    } catch {
      return {
        projectUrl: 'https://bcggthgaaadgmicgugkq.supabase.co',
        bucket: 'choychat-media',
        quotaGb: 1,
        dbQuotaMb: 500,
        dashboardUrl: 'https://supabase.com/dashboard/project/bcggthgaaadgmicgugkq/storage/buckets',
      };
    }
  });
  const [storageSaved, setStorageSaved] = useState(false);

  // 4. Cache state
  const [cacheCount, setCacheCount] = useState<number>(0);
  const [cacheStatus, setCacheStatus] = useState<string>('');
  const [isClearingCache, setIsClearingCache] = useState(false);

  // 5. Add user quick form
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [jsonBackupMsg, setJsonBackupMsg] = useState('');
  const [isImportingJsonBackup, setIsImportingJsonBackup] = useState(false);
  const importJsonInputRef = React.useRef<HTMLInputElement>(null);

  // 6. GPS Tracker state
  const [gpsLocations, setGpsLocations] = useState<LiveGpsUserLocation[]>([]);
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [selectedGpsUserId, setSelectedGpsUserId] = useState<string | null>(null);
  const [followGpsUser, setFollowGpsUser] = useState(true);
  const [liveGpsAutoRefresh, setLiveGpsAutoRefresh] = useState(true);

  // 7. Security Studio PIN Lock & Fingerprint state
  const [securityPin, setSecurityPin] = useState(() => localStorage.getItem('choychat_security_studio_pin') || '');
  const [enteredPin, setEnteredPin] = useState('');
  const [isStudioUnlocked, setIsStudioUnlocked] = useState(() => !localStorage.getItem('choychat_security_studio_pin'));
  const [pinError, setPinError] = useState('');
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [newPinDraft, setNewPinDraft] = useState('');
  const [pinSavedMsg, setPinSavedMsg] = useState('');
  const [isFingerprinting, setIsFingerprinting] = useState(false);
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);

  // 8. Admin-Only User Account PIN Setup state
  const [userPinDrafts, setUserPinDrafts] = useState<Record<string, string>>({});
  const [showUserPinMap, setShowUserPinMap] = useState<Record<string, boolean>>({});
  const [savingPinUserId, setSavingPinUserId] = useState<string | null>(null);
  const [pinActionMsg, setPinActionMsg] = useState('');
  const [pinActionErr, setPinActionErr] = useState('');
  const [pinSearchQuery, setPinSearchQuery] = useState('');

  // 9. Active Dashboard Module & Type Notes
  const [activeStudioModule, setActiveStudioModule] = useState<
    | 'home'
    | 'type_notes'
    | 'emoji_links'
    | 'quick_links'
    | 'keys_env'
    | 'analytics'
    | 'storage'
    | 'newsfeeds'
    | 'announcements'
    | 'gps_tracker'
    | 'user_pins'
    | 'users'
    | 'tools_guide'
  >(initialModule || 'home');

  useEffect(() => {
    if (initialModule && initialModule !== 'home') {
      setActiveStudioModule(initialModule);
      onConsumeInitialModule?.();
    }
  }, [initialModule, onConsumeInitialModule]);

  // 9b. Moving Announcement Slide Banners state
  const [announcementsList, setAnnouncementsList] = useState<StudioAnnouncementItem[]>(
    () => propAnnouncements || []
  );
  const [annEditingId, setAnnEditingId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annTarget, setAnnTarget] = useState<StudioAnnouncementTarget>('all');
  const [annBadge, setAnnBadge] = useState<StudioAnnouncementBadge>('announcement');
  const [annTone, setAnnTone] = useState<StudioAnnouncementTone>('emerald');
  const [annActive, setAnnActive] = useState(true);
  const [annFilterTarget, setAnnFilterTarget] = useState<'all_list' | StudioAnnouncementTarget>('all_list');
  const [savingAnn, setSavingAnn] = useState(false);
  const [annStatusMsg, setAnnStatusMsg] = useState('');
  const [annErrMsg, setAnnErrMsg] = useState('');
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const [previewPaused, setPreviewPaused] = useState(false);

  useEffect(() => {
    if (Array.isArray(propAnnouncements)) {
      setAnnouncementsList(propAnnouncements);
    }
  }, [propAnnouncements]);

  const [studioNotes, setStudioNotes] = useState<StudioNoteFile[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showNewNoteFileForm, setShowNewNoteFileForm] = useState(false);
  const [newNoteFileTitle, setNewNoteFileTitle] = useState('');
  const [newNoteFileCategory, setNewNoteFileCategory] = useState<string>('App Features');
  const [newNoteFileInitialText, setNewNoteFileInitialText] = useState('');
  const [appendNoteDraft, setAppendNoteDraft] = useState('');
  const [autoSummarizeOnSave, setAutoSummarizeOnSave] = useState(true);
  const [promptEditDraft, setPromptEditDraft] = useState('');
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [noteStatusMsg, setNoteStatusMsg] = useState('');
  const [noteErrorMsg, setNoteErrorMsg] = useState('');

  // 10. Categorized .env & All Code Config Vault (Auto-Synced)
  const [envVaultEntries, setEnvVaultEntries] = useState<EnvVaultEntry[]>([]);
  const [activeEnvCategory, setActiveEnvCategory] = useState<string>('All');
  const [envVaultKeyName, setEnvVaultKeyName] = useState('');
  const [envVaultCategory, setEnvVaultCategory] = useState<string>('Database');
  const [envVaultValue, setEnvVaultValue] = useState('');
  const [envVaultNotes, setEnvVaultNotes] = useState('');
  const [envVaultSecret, setEnvVaultSecret] = useState(false);
  const [revealedEnvIds, setRevealedEnvIds] = useState<Record<string, boolean>>({});
  const [isSyncingEnvVault, setIsSyncingEnvVault] = useState(false);
  const [envVaultStatusMsg, setEnvVaultStatusMsg] = useState('');

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    fetch('/api/admin/studio-notes', {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.notes)) return;
        setStudioNotes(data.notes);
        setSelectedNoteId((prev) => {
          if (prev && data.notes.some((n: StudioNoteFile) => n.id === prev)) return prev;
          return data.notes[0]?.id || null;
        });
      })
      .catch(() => {});

    fetch('/api/admin/env-vault', {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.entries)) return;
        setEnvVaultEntries(data.entries);
      })
      .catch(() => {});

    fetch('/api/admin/announcements', {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.announcements)) return;
        setAnnouncementsList(data.announcements);
        onAnnouncementsChanged?.(data.announcements);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [authToken, syncTick]);

  const activeStudioSlides = announcementsList.filter((a) => a.active);
  useEffect(() => {
    if (activeStudioModule !== 'announcements' || previewPaused || activeStudioSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setPreviewSlideIdx((prev) => (prev + 1) % activeStudioSlides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [activeStudioModule, previewPaused, activeStudioSlides.length]);

  const getAnnTargetLabel = (t: StudioAnnouncementTarget) => {
    if (t === 'feed_a') return newsfeedATitle || 'Newsfeed A';
    if (t === 'feed_b') return newsfeedBTitle || 'Newsfeed B';
    if (t === 'feed_c') return newsfeedCTitle || 'Newsfeed C';
    if (t === 'feed_bc') return `B & C (${newsfeedBTitle || 'Newsfeed B'} & ${newsfeedCTitle || 'Newsfeed C'})`;
    return 'All Newsfeeds (A, B & C)';
  };

  const resetAnnForm = () => {
    setAnnEditingId(null);
    setAnnTitle('');
    setAnnMessage('');
    setAnnTarget('all');
    setAnnBadge('announcement');
    setAnnTone('emerald');
    setAnnActive(true);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) {
      setAnnErrMsg('Isulod ang Title ug Announcement Message.');
      return;
    }
    if (!authToken) {
      setAnnErrMsg('Admin sign-in session required.');
      return;
    }
    setSavingAnn(true);
    setAnnErrMsg('');
    setAnnStatusMsg('');
    try {
      const endpoint = annEditingId ? `/api/admin/announcements/${annEditingId}` : '/api/admin/announcements';
      const method = annEditingId ? 'PATCH' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: annTitle.trim(),
          message: annMessage.trim(),
          target: annTarget,
          badge: annBadge,
          tone: annTone,
          active: annActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnnErrMsg(data.error || 'Failed to save announcement slide.');
        return;
      }
      if (Array.isArray(data.announcements)) {
        setAnnouncementsList(data.announcements);
        onAnnouncementsChanged?.(data.announcements);
      }
      setAnnStatusMsg(
        annEditingId
          ? `Slide updated & synced for ${getAnnTargetLabel(annTarget)}!`
          : `New Moving Slide added & synced for ${getAnnTargetLabel(annTarget)}!`
      );
      resetAnnForm();
    } catch {
      setAnnErrMsg('Network error saving announcement slide.');
    } finally {
      setSavingAnn(false);
    }
  };

  const handleQuickUpdateAnnouncement = async (
    id: string,
    patch: Partial<{ active: boolean; target: StudioAnnouncementTarget }>
  ) => {
    if (!authToken) return;
    setAnnErrMsg('');
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnnErrMsg(data.error || 'Failed to update slide.');
        return;
      }
      if (Array.isArray(data.announcements)) {
        setAnnouncementsList(data.announcements);
        onAnnouncementsChanged?.(data.announcements);
      }
      setAnnStatusMsg('Announcement slide updated & synced!');
    } catch {
      setAnnErrMsg('Network error updating slide.');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!authToken) return;
    setAnnErrMsg('');
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setAnnErrMsg(data.error || 'Failed to delete slide.');
        return;
      }
      if (Array.isArray(data.announcements)) {
        setAnnouncementsList(data.announcements);
        onAnnouncementsChanged?.(data.announcements);
      }
      if (annEditingId === id) resetAnnForm();
      setAnnStatusMsg('Announcement slide deleted.');
    } catch {
      setAnnErrMsg('Network error deleting slide.');
    }
  };

  const selectedNoteFile = studioNotes.find((n) => n.id === selectedNoteId) || null;

  useEffect(() => {
    setPromptEditDraft(selectedNoteFile?.organizedPrompt || '');
  }, [selectedNoteFile?.id, selectedNoteFile?.organizedPrompt]);

  const handleCreateNoteFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !newNoteFileTitle.trim()) return;
    setIsNoteSaving(true);
    setNoteErrorMsg('');
    setNoteStatusMsg('');
    try {
      const res = await fetch('/api/admin/studio-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: newNoteFileTitle.trim(),
          category: newNoteFileCategory,
          initialText: newNoteFileInitialText.trim(),
          autoSummarize: autoSummarizeOnSave,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNoteErrorMsg(data.error || 'Could not create note file');
        return;
      }
      if (Array.isArray(data.notes)) {
        setStudioNotes(data.notes);
      }
      if (data.note?.id) {
        setSelectedNoteId(data.note.id);
        setPromptEditDraft(data.note.organizedPrompt || '');
      }
      setNewNoteFileTitle('');
      setNewNoteFileInitialText('');
      setShowNewNoteFileForm(false);
      setNoteStatusMsg(
        data.usedAi
          ? 'Note file created, AI auto-summarised & synced!'
          : 'Note file created, organized & synced!'
      );
      setTimeout(() => setNoteStatusMsg(''), 4000);
    } catch (err) {
      setNoteErrorMsg(err instanceof Error ? err.message : 'Failed to create note file');
    } finally {
      setIsNoteSaving(false);
    }
  };

  const handleAppendNoteEntry = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!authToken || !selectedNoteFile) return;
    const text = appendNoteDraft.trim();
    if (!text) return;
    setIsNoteSaving(true);
    setNoteErrorMsg('');
    setNoteStatusMsg('');
    try {
      const res = await fetch(`/api/admin/studio-notes/${encodeURIComponent(selectedNoteFile.id)}/append`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          rawText: text,
          autoSummarize: autoSummarizeOnSave,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNoteErrorMsg(data.error || 'Failed to add & connect note');
        return;
      }
      if (Array.isArray(data.notes)) {
        setStudioNotes(data.notes);
      }
      if (data.note) {
        setPromptEditDraft(data.note.organizedPrompt || '');
      }
      setAppendNoteDraft('');
      setNoteStatusMsg(
        data.usedAi
          ? 'Connected to note file, AI auto-summarised & saved!'
          : 'Connected to existing note file, organized & saved!'
      );
      setTimeout(() => setNoteStatusMsg(''), 4500);
    } catch (err) {
      setNoteErrorMsg(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setIsNoteSaving(false);
    }
  };

  const handleSavePromptManual = async (reSummarize = false) => {
    if (!authToken || !selectedNoteFile) return;
    setIsNoteSaving(true);
    setNoteErrorMsg('');
    setNoteStatusMsg('');
    try {
      const res = await fetch(`/api/admin/studio-notes/${encodeURIComponent(selectedNoteFile.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          organizedPrompt: promptEditDraft,
          reSummarize,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNoteErrorMsg(data.error || 'Failed to save changes');
        return;
      }
      if (Array.isArray(data.notes)) {
        setStudioNotes(data.notes);
      }
      if (data.note) {
        setPromptEditDraft(data.note.organizedPrompt || '');
      }
      setNoteStatusMsg(
        reSummarize
          ? data.usedAi
            ? 'Re-summarised with AI & saved!'
            : 'Re-organized all connected notes & saved!'
          : 'Saved! Prompt & notes safely synced.'
      );
      setTimeout(() => setNoteStatusMsg(''), 3500);
    } catch {
      setNoteErrorMsg('Could not save note file.');
    } finally {
      setIsNoteSaving(false);
    }
  };

  const handleDeleteNoteEntry = async (entryId: string) => {
    if (!authToken || !selectedNoteFile) return;
    const nextEntries = selectedNoteFile.entries.filter((item) => item.id !== entryId);
    setIsNoteSaving(true);
    try {
      const res = await fetch(`/api/admin/studio-notes/${encodeURIComponent(selectedNoteFile.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entries: nextEntries,
          reSummarize: autoSummarizeOnSave,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.notes)) {
        setStudioNotes(data.notes);
        if (data.note) setPromptEditDraft(data.note.organizedPrompt || '');
        setNoteStatusMsg('Entry removed & file updated.');
        setTimeout(() => setNoteStatusMsg(''), 2500);
      }
    } finally {
      setIsNoteSaving(false);
    }
  };

  const handleDeleteNoteFile = async (id: string) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/admin/studio-notes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.notes)) {
        setStudioNotes(data.notes);
        if (selectedNoteId === id) {
          setSelectedNoteId(data.notes[0]?.id || null);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleDownloadNoteFile = () => {
    if (!selectedNoteFile) return;
    const content = [
      `# ${selectedNoteFile.title} [${selectedNoteFile.category}]`,
      `Updated: ${new Date(selectedNoteFile.updatedAt).toLocaleString()}`,
      '',
      '## Ready-to-Paste AI Studio Prompt',
      promptEditDraft || selectedNoteFile.organizedPrompt,
      '',
      '## Connected Raw Notes',
      ...selectedNoteFile.entries.map((e, i) => `${i + 1}. (${new Date(e.createdAt).toLocaleString()}) ${e.rawText}`),
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedNoteFile.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'studio_notes'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveCategorizedEnvEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !envVaultKeyName.trim()) return;
    setIsSyncingEnvVault(true);
    try {
      const res = await fetch('/api/admin/env-vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          category: envVaultCategory,
          keyName: envVaultKeyName.trim(),
          value: envVaultValue,
          secret: envVaultSecret,
          notes: envVaultNotes.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.entries)) {
        setEnvVaultEntries(data.entries);
        setEnvVaultKeyName('');
        setEnvVaultValue('');
        setEnvVaultNotes('');
        setEnvVaultSecret(false);
        setEnvVaultStatusMsg(`Saved "${data.entry?.keyName}" under [${envVaultCategory}] & Auto-Synced!`);
        setTimeout(() => setEnvVaultStatusMsg(''), 3500);
      }
    } finally {
      setIsSyncingEnvVault(false);
    }
  };

  const handleSyncAllMainKeysToEnvVault = async () => {
    if (!authToken) return;
    setIsSyncingEnvVault(true);
    try {
      const payloadEntries = [
        { id: 'ev_database_url', category: 'Database', keyName: 'DATABASE_URL', value: mainKeys.DATABASE_URL.trim(), secret: true, notes: 'PostgreSQL cloud connection string' },
        { id: 'ev_supabase_url', category: 'Supabase Storage', keyName: 'SUPABASE_URL', value: mainKeys.SUPABASE_URL.trim(), secret: false, notes: 'Supabase project endpoint' },
        { id: 'ev_supabase_anon', category: 'Supabase Storage', keyName: 'SUPABASE_ANON_KEY', value: mainKeys.SUPABASE_ANON_KEY.trim(), secret: true, notes: 'Supabase anon key' },
        { id: 'ev_supabase_bucket', category: 'Supabase Storage', keyName: 'SUPABASE_BUCKET', value: mainKeys.SUPABASE_BUCKET.trim() || 'choychat-media', secret: false, notes: 'Media storage bucket' },
        { id: 'ev_gemini_api_key', category: 'AI & Gemini', keyName: 'GEMINI_API_KEY', value: mainKeys.GEMINI_API_KEY.trim(), secret: true, notes: 'Google AI Studio Gemini key' },
        { id: 'ev_app_url', category: 'Auth & App URL', keyName: 'APP_URL', value: mainKeys.APP_URL.trim(), secret: false, notes: 'Live website URL' },
        { id: 'ev_admin_phone', category: 'Auth & App URL', keyName: 'ADMIN_PHONE', value: mainKeys.ADMIN_PHONE.trim(), secret: false, notes: 'Admin account phone' },
        { id: 'ev_admin_pin', category: 'Auth & App URL', keyName: 'ADMIN_PIN', value: mainKeys.ADMIN_PIN.trim(), secret: true, notes: 'Admin login PIN' },
        ...customPairs.map((kv) => ({
          id: `ev_custom_${kv.id}`,
          category: 'Code & Custom',
          keyName: kv.key,
          value: kv.value,
          secret: Boolean(kv.secret),
          notes: 'Synced custom key',
        })),
      ].filter((item) => item.value.length > 0);

      const res = await fetch('/api/admin/env-vault/sync-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ entries: payloadEntries }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.entries)) {
        setEnvVaultEntries(data.entries);
        setEnvVaultStatusMsg(`All ${payloadEntries.length} categorized .env keys auto-synced to cloud vault!`);
        setTimeout(() => setEnvVaultStatusMsg(''), 4000);
      }
    } finally {
      setIsSyncingEnvVault(false);
    }
  };

  const handleDeleteCategorizedEnvEntry = async (id: string) => {
    if (!authToken) return;
    const res = await fetch(`/api/admin/env-vault/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.ok && Array.isArray(data.entries)) {
      setEnvVaultEntries(data.entries);
      setEnvVaultStatusMsg('Removed entry & synced.');
      setTimeout(() => setEnvVaultStatusMsg(''), 2500);
    }
  };

  const handleCopyEnvVaultCategory = (category: string) => {
    const filtered =
      category === 'All'
        ? envVaultEntries
        : envVaultEntries.filter((e) => e.category === category);
    const lines: string[] = [];
    const grouped = new Map<string, EnvVaultEntry[]>();
    filtered.forEach((entry) => {
      const list = grouped.get(entry.category) || [];
      list.push(entry);
      grouped.set(entry.category, list);
    });
    grouped.forEach((list, cat) => {
      lines.push(`# === ${cat} ===`);
      list.forEach((item) => {
        lines.push(`${item.keyName}=${item.value}`);
      });
      lines.push('');
    });
    handleCopy(`env_cat_${category}`, lines.join('\n').trim());
    setEnvVaultStatusMsg(`Copied [${category}] .env block to clipboard!`);
    setTimeout(() => setEnvVaultStatusMsg(''), 3000);
  };

  // 8. Live Website Emoji Link & App Icon Image Generator (Auto Push/Sync)
  const [emojiLinksList, setEmojiLinksList] = useState<EmojiLinkItem[]>(propEmojiLinks || []);
  const [emojiTargetUrl, setEmojiTargetUrl] = useState<string>(() => adminLinks.renderLiveApp || 'https://chat-9-si9x.onrender.com');
  const [emojiLinkTitle, setEmojiLinkTitle] = useState<string>('Choy Chat Live App');
  const [emojiCodeInput, setEmojiCodeInput] = useState<string>(() => generateEmojiFromUrl(adminLinks.renderLiveApp || 'https://chat-9-si9x.onrender.com'));
  const [emojiIconUrl, setEmojiIconUrl] = useState<string>(defaultAppIcon);
  const [pinToAppIconOnSave, setPinToAppIconOnSave] = useState<boolean>(true);
  const [autoPushOnSave, setAutoPushOnSave] = useState<boolean>(true);
  const [isSavingEmojiLink, setIsSavingEmojiLink] = useState<boolean>(false);
  const [emojiLinkStatusMsg, setEmojiLinkStatusMsg] = useState<string>('');
  const [emojiLinkError, setEmojiLinkError] = useState<string>('');

  useEffect(() => {
    if (Array.isArray(propEmojiLinks)) {
      setEmojiLinksList(propEmojiLinks);
    }
  }, [propEmojiLinks]);

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    fetch('/api/choy/emoji-links', {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.emojiLinks)) {
          setEmojiLinksList(data.emojiLinks);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const handleSaveEmojiLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmojiLinkError('');
    setEmojiLinkStatusMsg('');
    const cleanUrl = emojiTargetUrl.trim();
    const cleanEmoji = emojiCodeInput.trim();
    if (!cleanUrl || (!cleanUrl.startsWith('https://') && !cleanUrl.startsWith('http://'))) {
      setEmojiLinkError('Please enter a valid live website URL starting with https:// or http://');
      return;
    }
    if (!cleanEmoji) {
      setEmojiLinkError('Please generate or enter an emoji code for your link.');
      return;
    }
    if (!authToken) {
      setEmojiLinkError('Admin login token required to save & auto-sync.');
      return;
    }

    setIsSavingEmojiLink(true);
    try {
      const res = await fetch('/api/choy/emoji-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          emojiCode: cleanEmoji,
          targetUrl: cleanUrl,
          title: emojiLinkTitle.trim() || 'Choy Chat Live App',
          iconUrl: emojiIconUrl.trim() || defaultAppIcon,
          pinnedToAppIcon: pinToAppIconOnSave,
          autoPush: autoPushOnSave,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmojiLinkError(data.error || 'Failed to save emoji link');
        return;
      }
      if (Array.isArray(data.emojiLinks)) {
        setEmojiLinksList(data.emojiLinks);
        onEmojiLinksChanged?.(data.emojiLinks);
      }
      setEmojiLinkStatusMsg(
        `Saved to Security Studio (${cleanEmoji})${pinToAppIconOnSave ? ' + Attached to App Icon Image' : ''}${
          autoPushOnSave ? ' + Auto Pushed & Synced to all devices!' : ' + Synced!'
        }`
      );
      setTimeout(() => setEmojiLinkStatusMsg(''), 5000);
    } catch (err) {
      setEmojiLinkError(err instanceof Error ? err.message : 'Failed to save emoji link');
    } finally {
      setIsSavingEmojiLink(false);
    }
  };

  const handlePinExistingEmojiLink = async (id: string) => {
    if (!authToken) return;
    setEmojiLinkError('');
    try {
      const res = await fetch(`/api/choy/emoji-links/${encodeURIComponent(id)}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ autoPush: autoPushOnSave }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmojiLinkError(data.error || 'Failed to pin emoji link');
        return;
      }
      if (Array.isArray(data.emojiLinks)) {
        setEmojiLinksList(data.emojiLinks);
        onEmojiLinksChanged?.(data.emojiLinks);
      }
      setEmojiLinkStatusMsg('Pinned to App Icon Image & auto-synced across all devices!');
      setTimeout(() => setEmojiLinkStatusMsg(''), 4000);
    } catch {
      setEmojiLinkError('Could not pin emoji link.');
    }
  };

  const handleDeleteExistingEmojiLink = async (id: string) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/choy/emoji-links/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.emojiLinks)) {
        setEmojiLinksList(data.emojiLinks);
        onEmojiLinksChanged?.(data.emojiLinks);
        setEmojiLinkStatusMsg('Emoji link removed & synced.');
        setTimeout(() => setEmojiLinkStatusMsg(''), 3000);
      }
    } catch {
      // ignore
    }
  };

  const handleShareCurrentEmojiWithImage = async (item?: {
    emojiCode: string;
    title: string;
    targetUrl: string;
    iconUrl: string;
  }) => {
    const payload = item || {
      emojiCode: emojiCodeInput.trim() || '🔐🟢💬✨🚀',
      title: emojiLinkTitle.trim() || 'Choy Chat Live App',
      targetUrl: emojiTargetUrl.trim() || adminLinks.renderLiveApp,
      iconUrl: emojiIconUrl.trim() || defaultAppIcon,
    };
    const result = await shareEmojiLinkWithAppImage(payload);
    setEmojiLinkStatusMsg(
      result.method === 'clipboard'
        ? `Copied Emoji Link (${payload.emojiCode}) & App Icon URL to clipboard!`
        : `Shared ${payload.emojiCode} with App Icon Image!`
    );
    setTimeout(() => setEmojiLinkStatusMsg(''), 4000);
  };

  const handleDownloadEmojiIconCard = async () => {
    const file = await renderAppIconWithEmojiFile(
      emojiIconUrl.trim() || defaultAppIcon,
      emojiCodeInput.trim() || '🔐🟢💬✨🚀',
      emojiLinkTitle.trim() || 'Choy Chat Live App'
    );
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUnlockStudio = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.trim() === securityPin.trim()) {
      setIsStudioUnlocked(true);
      setPinError('');
      setEnteredPin('');
    } else {
      setPinError('Incorrect PIN. Please try again.');
    }
  };

  const handleSimulateFingerprint = async () => {
    setIsFingerprinting(true);
    setPinError('');
    try {
      if (window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          setTimeout(() => {
            setIsStudioUnlocked(true);
            setIsFingerprinting(false);
          }, 800);
          return;
        }
      }
      setTimeout(() => {
        setIsStudioUnlocked(true);
        setIsFingerprinting(false);
      }, 1000);
    } catch {
      setTimeout(() => {
        setIsStudioUnlocked(true);
        setIsFingerprinting(false);
      }, 1000);
    }
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPinDraft.trim();
    if (clean.length < 4) {
      setPinError('PIN must be at least 4 digits/characters.');
      return;
    }
    localStorage.setItem('choychat_security_studio_pin', clean);
    setSecurityPin(clean);
    setIsStudioUnlocked(true);
    setShowSetPinModal(false);
    setNewPinDraft('');
    setPinSavedMsg('Security Studio PIN locked successfully!');
    setTimeout(() => setPinSavedMsg(''), 3000);
  };

  const handleRemovePin = () => {
    localStorage.removeItem('choychat_security_studio_pin');
    setSecurityPin('');
    setIsStudioUnlocked(true);
    setShowSetPinModal(false);
    setPinSavedMsg('PIN lock removed successfully.');
    setTimeout(() => setPinSavedMsg(''), 3000);
  };

  const TOOLS_PRICING_GUIDE = [
    {
      id: 'render',
      name: 'Render Cloud (Web Service & PostgreSQL)',
      category: 'Backend Hosting & Database',
      purpose: 'Hosts the full-stack Express Node.js server and provides the production PostgreSQL relational database for persistent real-time cross-device data sync.',
      pricing: 'Free Tier available (scale-to-zero after inactivity); Paid Individual/Team instances start at ~$7/mo for 24/7 uptime.',
      isPaid: true,
      instruction: '1. Go to dashboard.render.com and create a Free PostgreSQL database.\n2. Copy the Internal Database URL.\n3. Paste it as DATABASE_URL in Security Studio or Render Environment variables so all user accounts, posts, and messages stay synced permanently across devices.'
    },
    {
      id: 'supabase',
      name: 'Supabase Cloud (Postgres DB & Storage Bucket)',
      category: 'Cloud Storage & Media Bucket',
      purpose: 'Provides lightning-fast cloud storage buckets (choychat-media) for high-resolution profile pictures, photos, shared videos, and voice notes.',
      pricing: 'Generous Free Tier (500MB DB, 1GB file storage, 50k monthly active users); Pro Tier starts at $25/mo if quotas are exceeded.',
      isPaid: true,
      instruction: '1. Go to supabase.com and open your Project Settings -> API.\n2. Copy your Project URL and anon public key.\n3. Create a public storage bucket named choychat-media.\n4. Paste your keys in Security Studio Supabase Storage profile.'
    },
    {
      id: 'gemini',
      name: 'Google AI Studio / Gemini API (@google/genai)',
      category: 'Artificial Intelligence & Assistant',
      purpose: 'Powers Choy AI chatbot, knowledge Q&A, code analysis, GitHub repository review, and smart assistant features.',
      pricing: 'Generous Free Tier available via Google AI Studio with standard rate limits; Pay-as-you-go via Google Cloud Billing if high production volume is needed.',
      isPaid: false,
      instruction: '1. Go to aistudio.google.com/apikey.\n2. Create a free Gemini API key.\n3. Add GEMINI_API_KEY to your Render environment or Security Studio keys.'
    },
    {
      id: 'webpush',
      name: 'VAPID Web Push Notifications (web-push)',
      category: 'Notifications & Alerts',
      purpose: 'Enables background push notifications and incoming video call ringtones co-branded on mobile and desktop devices even when the app is closed or backgrounded.',
      pricing: '100% Free and Open Source standard W3C Web Push notification protocol.',
      isPaid: false,
      instruction: '1. The app automatically generates and manages VAPID public/private key pairs securely in server memory or database.\n2. Users grant notification permission when enabling PUSH notifications in the top bar.'
    },
    {
      id: 'pwa',
      name: 'Progressive Web App (PWA Service Worker & Manifest)',
      category: 'App Installability & Offline Caching',
      purpose: 'Allows users to install Choy Chat directly to their mobile home screen (Android / iOS) like a native app with offline caching and instant launch.',
      pricing: '100% Free standard web browser capability.',
      isPaid: false,
      instruction: '1. Open Choy Chat in mobile Chrome or Safari.\n2. Tap browser menu or "Install App" button.\n3. Select "Add to Home Screen" for full-screen immersive experience.'
    }
  ];

  const fetchGpsLocations = async (silent = false) => {
    if (!authToken) return;
    if (!silent) {
      setIsLoadingGps(true);
      setGpsError('');
    }
    try {
      const res = await fetch('/api/admin/gps/locations', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.locations)) {
          setGpsLocations(data.locations);
          setSelectedGpsUserId((prev) =>
            prev && data.locations.some((l: LiveGpsUserLocation) => l.userId === prev)
              ? prev
              : data.locations[0]?.userId || null
          );
          setGpsError('');
        }
      } else if (!silent) {
        setGpsError('Failed to fetch user locations.');
      }
    } catch {
      if (!silent) {
        setGpsError('Network error fetching locations.');
      }
    } finally {
      if (!silent) {
        setIsLoadingGps(false);
      }
    }
  };

  useEffect(() => {
    if (authToken) {
      void fetchGpsLocations();
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken || activeStudioModule !== 'gps_tracker') return;
    void fetchGpsLocations(true);
    const onLiveGpsPing = () => {
      void fetchGpsLocations(true);
    };
    window.addEventListener('choy-gps-ping', onLiveGpsPing);
    const timer = liveGpsAutoRefresh
      ? window.setInterval(() => {
          void fetchGpsLocations(true);
        }, 3000)
      : null;
    return () => {
      window.removeEventListener('choy-gps-ping', onLiveGpsPing);
      if (timer) window.clearInterval(timer);
    };
  }, [authToken, activeStudioModule, liveGpsAutoRefresh]);

  const refreshStorageStats = async () => {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        setStorageEstimate({
          usageBytes: est.usage || 0,
          quotaBytes: est.quota || 0,
        });
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        setCacheCount(keys.length);
      }
      let totalChars = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          totalChars += k.length + (localStorage.getItem(k)?.length || 0);
        }
      }
      setLocalStorageKb(Number(((totalChars * 2) / 1024).toFixed(2)));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshStorageStats();
  }, []);

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    fetch('/api/admin/env-status', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.configured && typeof data.configured === 'object') {
          setServerConfigured(data.configured);
        }
        if (data.mediaStorageMode === 'supabase' || data.mediaStorageMode === 'inline') {
          setMediaStorageMode(data.mediaStorageMode);
        }
        if (data.defaults && typeof data.defaults === 'object') {
          setMainKeys((prev) => ({
            ...prev,
            APP_URL: prev.APP_URL.trim() || data.defaults.APP_URL || KNOWN_KEY_DEFAULTS.APP_URL,
            ADMIN_PHONE: prev.ADMIN_PHONE.trim() || data.defaults.ADMIN_PHONE || KNOWN_KEY_DEFAULTS.ADMIN_PHONE,
            SUPABASE_URL: prev.SUPABASE_URL.trim() || data.defaults.SUPABASE_URL || '',
            SUPABASE_BUCKET: prev.SUPABASE_BUCKET.trim() || data.defaults.SUPABASE_BUCKET || KNOWN_KEY_DEFAULTS.SUPABASE_BUCKET,
          }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const handleAutoFillKnownDefaults = () => {
    const filled: MainKeysConfig = {
      ...mainKeys,
      ADMIN_PHONE: mainKeys.ADMIN_PHONE.trim() || KNOWN_KEY_DEFAULTS.ADMIN_PHONE,
      APP_URL: mainKeys.APP_URL.trim() || KNOWN_KEY_DEFAULTS.APP_URL,
      SUPABASE_BUCKET: mainKeys.SUPABASE_BUCKET.trim() || KNOWN_KEY_DEFAULTS.SUPABASE_BUCKET,
    };
    setMainKeys(filled);
    localStorage.setItem(STORAGE_KEYS.mainKeys, JSON.stringify(filled));
    setKeysSavedMsg('Auto-filled na tanan safe default values! Private secrets lang (DATABASE_URL, ADMIN_PIN, GEMINI_API_KEY) ang ikaw ra ang makabutang.');
    setTimeout(() => setKeysSavedMsg(''), 4000);
  };

  const handleCopy = (label: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveLinks = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEYS.links, JSON.stringify(adminLinks));
    setEditingLinks(false);
  };

  const handleSaveMainKeys = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEYS.mainKeys, JSON.stringify(mainKeys));
    setKeysSavedMsg('Saved! Ready na i-copy para sa Render.');
    setTimeout(() => setKeysSavedMsg(''), 2500);
  };

  const handleAddCustomKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKvKey.trim()) return;
    const updated = [
      ...customPairs,
      {
        id: 'kv_' + Date.now(),
        key: newKvKey.trim().toUpperCase().replace(/\s+/g, '_'),
        value: newKvVal.trim(),
        secret: newKvSecret,
      },
    ];
    setCustomPairs(updated);
    localStorage.setItem(STORAGE_KEYS.customKeys, JSON.stringify(updated));
    setNewKvKey('');
    setNewKvVal('');
    setNewKvSecret(false);
    setShowAddCustom(false);
    setKeysSavedMsg('Custom key added!');
    setTimeout(() => setKeysSavedMsg(''), 2000);
  };

  const handleDeleteCustomKey = (id: string) => {
    const updated = customPairs.filter((item) => item.id !== id);
    setCustomPairs(updated);
    localStorage.setItem(STORAGE_KEYS.customKeys, JSON.stringify(updated));
  };

  const handleCopyRenderEnv = () => {
    const lines = [...AUTO_DOCKER_DEFAULTS];
    (Object.entries(mainKeys) as [keyof MainKeysConfig, string][]).forEach(([k, v]) => {
      if (v.trim()) lines.push(`${k}=${v.trim()}`);
    });
    customPairs.forEach((kv) => {
      if (kv.key.trim() && kv.value.trim()) lines.push(`${kv.key}=${kv.value.trim()}`);
    });
    handleCopy('render_env_all', lines.join('\n'));
    setKeysSavedMsg('Copied! I-paste sa Render -> Environment -> Add from .env');
    setTimeout(() => setKeysSavedMsg(''), 3000);
  };

  const handleSaveStorageProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEYS.storageProfile, JSON.stringify(supabaseStorageProfile));
    setStorageSaved(true);
    setTimeout(() => setStorageSaved(false), 2000);
  };

  const handleClearAppCache = async () => {
    setIsClearingCache(true);
    try {
      let deletedCaches = 0;
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        deletedCaches = keys.length;
      }
      sessionStorage.clear();
      await refreshStorageStats();
      const time = new Date().toLocaleTimeString();
      setCacheStatus(`Cache cleared (${deletedCaches} cache buckets + session storage) at ${time}`);
    } catch {
      setCacheStatus('Cache cleared (session storage reset).');
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleExportUsers = () => {
    const headers = ['ID', 'Name', 'Phone', 'Status', 'Login Date'];
    const rows = usersList.map((u) => [u.id, `"${u.name}"`, u.phone, u.status, `"${u.loginDate}"`]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `choychat_users_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJsonBackup = async () => {
    if (!authToken) return;
    setJsonBackupMsg('');
    try {
      const res = await fetch('/api/admin/cloud-backup', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to export backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `choychat_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setJsonBackupMsg(`Downloaded backup (${Array.isArray(data.users) ? data.users.length : 0} accounts).`);
    } catch (err) {
      setJsonBackupMsg(err instanceof Error ? err.message : 'Backup download failed.');
    }
  };

  const handleImportJsonBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !authToken) return;
    setIsImportingJsonBackup(true);
    setJsonBackupMsg('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch('/api/admin/cloud-restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(parsed),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to restore backup');
      await onCloudStateRestored?.();
      setJsonBackupMsg(
        `Restored ${result.restoredUsersCount ?? 0} account(s) (Total: ${result.totalUsersCount ?? usersList.length}).`
      );
    } catch (err) {
      setJsonBackupMsg(err instanceof Error ? err.message : 'Invalid backup JSON file.');
    } finally {
      setIsImportingJsonBackup(false);
    }
  };

  const renderFirebaseCloudSyncCard = () => (
    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/80 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
          <div>
            <div className="text-xs font-bold text-emerald-950 dark:text-white">
              Firebase Cloud Account Vault &amp; Auto-Backup
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
              {firebaseConnectedEmail
                ? firebaseIsAdminVerified
                  ? `Connected: ${firebaseConnectedEmail} · Auto-syncs accounts to Firestore`
                  : `Connected (${firebaseConnectedEmail}) — requires choycounterflow@gmail.com`
                : 'Connect Google (choycounterflow@gmail.com) so accounts never get lost across server resets.'}
            </div>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
            firebaseSyncState === 'synced'
              ? 'bg-emerald-400/25 text-emerald-800 dark:text-emerald-200 border border-emerald-400/40'
              : firebaseSyncState === 'syncing'
              ? 'bg-sky-400/25 text-sky-800 dark:text-sky-200 border border-sky-400/40'
              : firebaseSyncState === 'error'
              ? 'bg-rose-400/25 text-rose-800 dark:text-rose-200 border border-rose-400/40'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          {firebaseSyncState === 'synced'
            ? 'Synced'
            : firebaseSyncState === 'syncing'
            ? 'Syncing...'
            : firebaseSyncState === 'error'
            ? 'Sync Issue'
            : 'Not Connected'}
        </span>
      </div>

      {firebaseSyncError && (
        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700/70 text-[11px] text-rose-800 dark:text-rose-200 break-words">
          {firebaseSyncError}
        </div>
      )}

      {firebaseLastSyncedAt && (
        <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300">
          Last Firebase sync: {new Date(firebaseLastSyncedAt).toLocaleString()}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {!firebaseConnectedEmail || !firebaseIsAdminVerified ? (
          <button
            type="button"
            onClick={() => onConnectFirebase?.()}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Connect Google Cloud Sync</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={firebaseSyncState === 'syncing'}
              onClick={() => onBackupToFirebase?.()}
              className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold inline-flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Backup Now to Firebase</span>
            </button>
            <button
              type="button"
              disabled={firebaseSyncState === 'syncing'}
              onClick={() => onRestoreFromFirebase?.()}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-bold inline-flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore from Firebase</span>
            </button>
            <button
              type="button"
              onClick={() => onDisconnectFirebase?.()}
              className="px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition"
            >
              Disconnect
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleDownloadJsonBackup}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-semibold inline-flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-slate-800 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save JSON Backup</span>
        </button>

        <button
          type="button"
          disabled={isImportingJsonBackup}
          onClick={() => importJsonInputRef.current?.click()}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-semibold inline-flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{isImportingJsonBackup ? 'Importing...' : 'Import JSON Backup'}</span>
        </button>
        <input
          ref={importJsonInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportJsonBackupFile}
          className="hidden"
        />
      </div>

      {jsonBackupMsg && (
        <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
          {jsonBackupMsg}
        </div>
      )}
    </div>
  );

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const activeMembersCount = usersList.length;
  const totalMediaItems = mediaPostsCount + mediaMessagesCount;
  const browserPercent =
    storageEstimate.quotaBytes > 0
      ? Math.min(100, Number(((storageEstimate.usageBytes / storageEstimate.quotaBytes) * 100).toFixed(2)))
      : 1;

  const keyFields: {
    id: keyof MainKeysConfig;
    label: string;
    hint: string;
    secret: boolean;
    placeholder: string;
    getLink?: { label: string; url: string };
  }[] = [
    {
      id: 'DATABASE_URL',
      label: 'Render or Supabase PostgreSQL URL (Importante!)',
      hint: 'I-paste imong Render Postgres Internal URL o Supabase Postgres URI para permanenteng ma-sync sa tanan device',
      secret: true,
      placeholder: 'postgresql://user:pass@host:5432/dbname',
      getLink: { label: 'Create Render Postgres', url: 'https://dashboard.render.com/new/database' },
    },
    {
      id: 'ADMIN_PHONE',
      label: 'Admin Login Phone (Optional Override)',
      hint: 'Imong Admin phone number sa login (optional — pwede ra pud i-setup diretso sa first login)',
      secret: false,
      placeholder: '09361223978',
    },
    {
      id: 'ADMIN_PIN',
      label: 'Admin Login PIN (Optional Override)',
      hint: 'Imong secret Admin PIN (i-paste sa Render Environment para permanenteng naka-lock)',
      secret: true,
      placeholder: 'Enter secret PIN...',
    },
    {
      id: 'APP_URL',
      label: 'Live App URL',
      hint: 'Naka-fill up na (imong Render link)',
      secret: false,
      placeholder: 'https://chat-1-5b9f.onrender.com',
    },
    {
      id: 'GEMINI_API_KEY',
      label: 'Gemini API Key (Optional)',
      hint: 'Para sa AI features — pindota ang "Get Key" para makuha libre sa AI Studio',
      secret: true,
      placeholder: 'AIza...',
      getLink: { label: 'Get Key', url: 'https://aistudio.google.com/apikey' },
    },
    {
      id: 'SUPABASE_URL',
      label: 'Supabase Project URL (Optional)',
      hint: 'Kung Supabase ang gamiton — kuhaa sa Supabase -> Project Settings -> API',
      secret: false,
      placeholder: 'https://xxxx.supabase.co',
      getLink: { label: 'Open Supabase', url: 'https://supabase.com/dashboard' },
    },
    {
      id: 'SUPABASE_ANON_KEY',
      label: 'Supabase Anon Key (Optional)',
      hint: 'Public anon key gikan sa Supabase -> API',
      secret: true,
      placeholder: 'eyJ...',
    },
    {
      id: 'SUPABASE_BUCKET',
      label: 'Supabase Storage Bucket',
      hint: 'Bucket name kung mag-store og files sa Supabase',
      secret: false,
      placeholder: 'choychat-media',
    },
  ];

  if (!isStudioUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white dark:bg-emerald-950 border border-emerald-500/50 rounded-3xl shadow-2xl space-y-6 text-xs text-emerald-950 dark:text-white">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-base font-black tracking-wide uppercase">Security Studio Locked</h2>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
            Enter your Security Studio PIN or use biometric fingerprint authentication to unlock this admin hub.
          </p>
        </div>

        {pinError && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-center font-bold">
            {pinError}
          </div>
        )}

        <form onSubmit={handleUnlockStudio} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-200 mb-1">Security Studio PIN</label>
            <input
              type="password"
              required
              autoFocus
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              placeholder="Enter PIN..."
              className="w-full p-3 bg-emerald-50 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-sm font-mono text-center tracking-widest text-emerald-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
          >
            <Unlock className="w-4 h-4" /> Unlock Studio
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-emerald-200 dark:border-emerald-800"></div>
          <span className="flex-shrink mx-4 text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">or</span>
          <div className="flex-grow border-t border-emerald-200 dark:border-emerald-800"></div>
        </div>

        <button
          type="button"
          onClick={handleSimulateFingerprint}
          disabled={isFingerprinting}
          className="w-full py-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60"
        >
          <Fingerprint className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isFingerprinting ? 'animate-pulse' : ''}`} />
          {isFingerprinting ? 'Scanning Fingerprint / FaceID...' : 'Sign in with Biometric Fingerprint'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-6 text-xs">
      {/* HEADER */}
      <div className="bg-white dark:bg-emerald-900/70 border border-emerald-500/40 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black text-emerald-950 dark:text-white uppercase tracking-wide">Security Studio</h2>
              {mediaStorageMode === 'supabase' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 border border-cyan-400/40 text-cyan-800 dark:text-cyan-200">
                  Supabase Storage Active
                </span>
              )}
              {isCloudSynced && (
                <span
                  className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                    storageMode === 'postgres'
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                      : 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  }`}
                >
                  {storageMode === 'postgres'
                    ? 'PostgreSQL Cloud Sync Active'
                    : 'Live Server Sync (Add DATABASE_URL in Render for Permanent DB)'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Simple Admin Hub — Render Postgres, Supabase, Keys, Storage & Cache</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeStudioModule !== 'home' && (
            <button
              type="button"
              onClick={() => setActiveStudioModule('home')}
              className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black flex items-center gap-1.5 shadow transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Dashboards</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveStudioModule(activeStudioModule === 'type_notes' ? 'home' : 'type_notes')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow transition border ${
              activeStudioModule === 'type_notes'
                ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/30'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Type Notes ({studioNotes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSetPinModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600/20 border border-indigo-400/40 text-indigo-800 dark:text-indigo-200 font-bold hover:bg-indigo-600/30 flex items-center gap-1.5 shadow transition"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {securityPin ? 'Change PIN Lock' : 'Set PIN Lock'}
          </button>
          <button
            type="button"
            onClick={handleClearAppCache}
            disabled={isClearingCache}
            className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 flex items-center gap-2 shadow transition disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isClearingCache ? 'animate-spin' : ''}`} />
            {isClearingCache ? 'Clearing Cache...' : 'Clear App Cache'}
          </button>
        </div>
      </div>

      {showSetPinModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-indigo-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs text-emerald-950 dark:text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm uppercase">
                <KeyRound className="w-4 h-4 text-indigo-500" />
                <span>Security Studio PIN Lock &amp; Biometric Protection</span>
              </div>
              <button type="button" onClick={() => setShowSetPinModal(false)} className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white font-bold text-sm">✕</button>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
              Protect Security Studio so only admins with your PIN or Fingerprint can modify database settings, view user records, or access API keys.
            </p>
            <form onSubmit={handleSaveNewPin} className="space-y-3">
              <div>
                <label className="block font-bold text-emerald-800 dark:text-emerald-200 mb-1">New Security PIN (at least 4 chars)</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={newPinDraft}
                  onChange={(e) => setNewPinDraft(e.target.value)}
                  placeholder="Enter 4+ digit PIN..."
                  className="w-full p-3 bg-emerald-50 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-sm font-mono text-emerald-950 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow">
                  Save &amp; Lock Studio
                </button>
                {securityPin && (
                  <button type="button" onClick={handleRemovePin} className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold">
                    Remove PIN
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {pinSavedMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 font-bold text-center">
          {pinSavedMsg}
        </div>
      )}

      {cacheStatus && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 flex items-center justify-between">
          <span>{cacheStatus}</span>
          <button type="button" onClick={() => setCacheStatus('')} className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* SECURITY STUDIO CLEAN DASHBOARD HUB (CLICK ANY SETUP BUTTON TO OPEN ITS OWN DASHBOARD) */}
      {(() => {
        const dashboardCards = [
          {
            id: 'type_notes' as const,
            title: 'Type Notes & AI Prompt Builder',
            subtitle: 'Create note files, auto-summarise & connect updates for AI Studio',
            badge: `${studioNotes.length} file${studioNotes.length === 1 ? '' : 's'}`,
            icon: <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />,
            accent: 'border-emerald-300 dark:border-emerald-600/70 hover:border-emerald-400',
          },
          {
            id: 'emoji_links' as const,
            title: 'Emoji Link & App Icon Share',
            subtitle: 'Live website URL to emoji link, App Icon image & Auto Push/Sync',
            badge: `${emojiLinksList.length} link${emojiLinksList.length === 1 ? '' : 's'}`,
            icon: <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-300" />,
            accent: 'border-amber-300 dark:border-amber-500/60 hover:border-amber-400',
          },
          {
            id: 'keys_env' as const,
            title: 'Keys & .env Code Vault',
            subtitle: 'Render, Supabase, Gemini AI & categorized .env auto-synced vault',
            badge: `${envVaultEntries.length} synced`,
            icon: <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />,
            accent: 'border-indigo-300 dark:border-indigo-500/60 hover:border-indigo-400',
          },
          {
            id: 'quick_links' as const,
            title: 'Quick Links (Render & AI Studio)',
            subtitle: 'Direct links to AI Studio Chat, Render Dashboard, Live URL & Postgres',
            badge: 'Direct Links',
            icon: <Cloud className="w-5 h-5 text-cyan-600 dark:text-cyan-300" />,
            accent: 'border-cyan-300 dark:border-cyan-500/60 hover:border-cyan-400',
          },
          {
            id: 'user_pins' as const,
            title: 'Change User Account PINs',
            subtitle: 'Admin-only PIN setup & reset for all registered user accounts',
            badge: 'Admin Only',
            icon: <KeyRound className="w-5 h-5 text-rose-600 dark:text-rose-300" />,
            accent: 'border-rose-300 dark:border-rose-500/60 hover:border-rose-400',
          },
          {
            id: 'announcements' as const,
            title: 'Announcement Slide Banner Setup',
            subtitle: 'Moving Newsfeed announcement & reminder slides for A, B, C, B+C, or All',
            badge: `${activeStudioSlides.length} active`,
            icon: <Megaphone className="w-5 h-5 text-amber-500 dark:text-amber-300" />,
            accent: 'border-amber-300 dark:border-amber-500/60 hover:border-amber-400',
          },
          {
            id: 'newsfeeds' as const,
            title: 'Newsfeeds A, B, C & B+C Setup',
            subtitle: 'Rename Newsfeeds A, B, C & assign each user to 1 of 4 separated channels',
            badge: `${usersList.length} users`,
            icon: <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />,
            accent: 'border-emerald-300 dark:border-emerald-600/70 hover:border-emerald-400',
          },
          {
            id: 'users' as const,
            title: 'Users Data & Accounts',
            subtitle: 'Add cloud accounts, export backup, copy IDs & manage users',
            badge: `${usersList.length} users`,
            icon: <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />,
            accent: 'border-emerald-300 dark:border-emerald-600/70 hover:border-emerald-400',
          },
          {
            id: 'gps_tracker' as const,
            title: 'Admin Live GPS Map',
            subtitle: 'Watch moving user pins, trails, live speed & accuracy on Leaflet Map',
            badge: `${gpsLocations.length} live`,
            icon: <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
            accent: 'border-emerald-300 dark:border-emerald-600/70 hover:border-emerald-400',
          },
          {
            id: 'storage' as const,
            title: 'Cloud Storage & Cache Monitor',
            subtitle: 'Supabase storage bucket usage, Render DB & browser cache controls',
            badge: mediaStorageMode === 'supabase' ? 'Supabase' : 'Server DB',
            icon: <HardDrive className="w-5 h-5 text-cyan-600 dark:text-cyan-300" />,
            accent: 'border-cyan-300 dark:border-cyan-500/60 hover:border-cyan-400',
          },
          {
            id: 'analytics' as const,
            title: 'App Analytics Overview',
            subtitle: 'Live stats for posts, messages, ledger value, blocked & AI Q&A',
            badge: `${postsCount} posts`,
            icon: <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />,
            accent: 'border-emerald-300 dark:border-emerald-600/70 hover:border-emerald-400',
          },
          {
            id: 'tools_guide' as const,
            title: 'Tech Stack, Tools & Pricing Guide',
            subtitle: 'Spreadsheet of all app tools, free vs paid plans & setup instructions',
            badge: `${TOOLS_PRICING_GUIDE.length} tools`,
            icon: <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />,
            accent: 'border-indigo-300 dark:border-indigo-500/60 hover:border-indigo-400',
          },
        ];

        if (activeStudioModule === 'home') {
          return (
            <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                  <div>
                    <h3 className="text-sm font-black text-emerald-950 dark:text-white">
                      Security Studio Setup Dashboards
                    </h3>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Click any button below to open its own setup dashboard. Everything stays clean and organized.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold text-[10px]">
                  {dashboardCards.length} Setup Dashboards
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboardCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setActiveStudioModule(card.id)}
                    className={`group text-left p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/80 border ${card.accent} hover:bg-emerald-100/80 dark:hover:bg-emerald-900/80 transition shadow-sm flex flex-col justify-between gap-3`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
                        {card.icon}
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                        {card.badge}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-black text-emerald-950 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                        {card.title}
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 leading-snug">
                        {card.subtitle}
                      </p>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1 pt-0.5">
                      <span>Open Dashboard</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        }

        const currentCard = dashboardCards.find((c) => c.id === activeStudioModule);
        return (
          <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-3 space-y-2.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setActiveStudioModule('home')}
                className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 dark:hover:bg-emerald-800 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-white font-bold text-xs inline-flex items-center gap-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Security Studio Dashboards</span>
              </button>
              {currentCard && (
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950 dark:text-white">
                  {currentCard.icon}
                  <span>{currentCard.title}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {dashboardCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setActiveStudioModule(card.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 border transition ${
                    activeStudioModule === card.id
                      ? 'bg-emerald-400 text-slate-950 border-emerald-400 shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                  }`}
                >
                  {card.title}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* TYPE NOTES: AI FEATURE PLANNER & AUTO-SUMMARISE NOTEBOOK */}
      {activeStudioModule === 'type_notes' && (
        <div
          id="studio-type-notes"
          className="bg-white dark:bg-emerald-900/65 border-2 border-emerald-400/70 dark:border-emerald-400/50 rounded-2xl p-5 space-y-4 shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
              <div>
                <h3 className="text-sm font-black text-emerald-950 dark:text-white">
                  Type Notes — App Update Planner &amp; AI Prompt Builder
                </h3>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Create a note file, type rough update ideas, auto-summarise &amp; connect new notes onto earlier ones, save cleanly, and copy-paste straight to AI Studio.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowNewNoteFileForm((prev) => !prev)}
                className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-[11px] inline-flex items-center gap-1 shadow"
              >
                <Plus className="w-3.5 h-3.5" /> Create Note File
              </button>
            </div>
          </div>

          {noteStatusMsg && (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-950 dark:text-emerald-100 font-bold text-[11px]">
              {noteStatusMsg}
            </div>
          )}
          {noteErrorMsg && (
            <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-400/50 text-rose-700 dark:text-rose-200 font-bold text-[11px]">
              {noteErrorMsg}
            </div>
          )}

          {showNewNoteFileForm && (
            <form
              onSubmit={handleCreateNoteFile}
              className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 space-y-3"
            >
              <div className="text-xs font-black text-emerald-950 dark:text-white flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                <span>Create New Feature Note File</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="File Name (e.g. Choy Chat v3 Updates)..."
                  value={newNoteFileTitle}
                  onChange={(e) => setNewNoteFileTitle(e.target.value)}
                  className="p-2.5 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white"
                />
                <select
                  value={newNoteFileCategory}
                  onChange={(e) => setNewNoteFileCategory(e.target.value)}
                  className="p-2.5 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white"
                >
                  {NOTE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                rows={3}
                placeholder="Type your first app update idea here (optional — Bisaya, Tagalog, or English)..."
                value={newNoteFileInitialText}
                onChange={(e) => setNewNoteFileInitialText(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white resize-y"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSummarizeOnSave}
                    onChange={(e) => setAutoSummarizeOnSave(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                  <span>Auto-Summarise &amp; Organise for AI Studio</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewNoteFileForm(false)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-white font-bold text-[11px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isNoteSaving}
                    className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-[11px] inline-flex items-center gap-1.5 shadow disabled:opacity-60"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isNoteSaving ? 'Creating...' : 'Create & Save File'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Note Files List + Active Note File Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sidebar: Note Files */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Saved Note Files ({studioNotes.length})
              </div>
              {studioNotes.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-center space-y-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                  <div>No note files created yet.</div>
                  <button
                    type="button"
                    onClick={() => setShowNewNoteFileForm(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-400 text-slate-950 font-bold text-[11px]"
                  >
                    + Create First Note File
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                  {studioNotes.map((file) => {
                    const active = file.id === selectedNoteId;
                    return (
                      <div
                        key={file.id}
                        className={`p-2.5 rounded-xl border transition flex items-start justify-between gap-2 ${
                          active
                            ? 'bg-emerald-200/80 dark:bg-emerald-800 border-emerald-500 dark:border-amber-400 shadow'
                            : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedNoteId(file.id)}
                          className="min-w-0 flex-1 text-left space-y-0.5"
                        >
                          <div className="text-xs font-black text-emerald-950 dark:text-white truncate">{file.title}</div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 font-bold">
                              {file.category}
                            </span>
                            <span className="text-emerald-700 dark:text-emerald-300">
                              {file.entries.length} note{file.entries.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNoteFile(file.id)}
                          className="p-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 shrink-0"
                          title="Delete Note File"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Main Note File Connector & Auto-Summary Area */}
            <div className="lg:col-span-2 space-y-3">
              {!selectedNoteFile ? (
                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-center text-xs text-emerald-700 dark:text-emerald-300">
                  Select a saved note file on the left or tap <span className="font-bold">Create Note File</span> to start organizing your app feature ideas for AI Studio.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Add & Connect New Update Message + Save Button right beside it */}
                  <form
                    onSubmit={handleAppendNoteEntry}
                    className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black text-emerald-950 dark:text-white">
                        Add New Message / Feature to "{selectedNoteFile.title}"
                      </span>
                      <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoSummarizeOnSave}
                          onChange={(e) => setAutoSummarizeOnSave(e.target.checked)}
                          className="w-3.5 h-3.5 accent-emerald-500 rounded"
                        />
                        <span>Auto-Summarise &amp; Connect</span>
                      </label>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                      <textarea
                        rows={2}
                        placeholder="Type a new feature update here... It automatically connects to your saved notes in this file!"
                        value={appendNoteDraft}
                        onChange={(e) => setAppendNoteDraft(e.target.value)}
                        className="flex-1 p-2.5 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white resize-y"
                      />
                      <button
                        type="submit"
                        disabled={isNoteSaving || !appendNoteDraft.trim()}
                        className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs inline-flex items-center justify-center gap-1.5 shadow disabled:opacity-50 shrink-0"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isNoteSaving ? 'Saving...' : 'Save & Connect'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Ready-to-Paste AI Studio Organised Prompt + Save / Copy beside it */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950 border border-amber-400/60 dark:border-amber-400/50 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-black text-emerald-950 dark:text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
                        <span>Organised AI Studio Prompt (Ready to Copy &amp; Paste)</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isNoteSaving}
                          onClick={() => handleSavePromptManual(false)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-[10px] inline-flex items-center gap-1 shadow disabled:opacity-60"
                          title="Save edits so nothing is lost"
                        >
                          <Save className="w-3 h-3" /> Save
                        </button>
                        <button
                          type="button"
                          disabled={isNoteSaving || selectedNoteFile.entries.length === 0}
                          onClick={() => handleSavePromptManual(true)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] inline-flex items-center gap-1 disabled:opacity-60"
                          title="Auto-summarise & re-organise all connected notes"
                        >
                          <Sparkles className="w-3 h-3" /> Auto-Summarise
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleCopy(`note_prompt_${selectedNoteFile.id}`, promptEditDraft);
                            setNoteStatusMsg('Copied organised prompt! Ready to paste in AI Studio.');
                            setTimeout(() => setNoteStatusMsg(''), 3000);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-[10px] inline-flex items-center gap-1 shadow"
                        >
                          {copiedKey === `note_prompt_${selectedNoteFile.id}` ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedKey === `note_prompt_${selectedNoteFile.id}` ? 'Copied!' : 'Copy for AI Studio'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadNoteFile}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-white font-bold text-[10px] inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> .txt
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={8}
                      value={promptEditDraft}
                      onChange={(e) => setPromptEditDraft(e.target.value)}
                      placeholder="Your summarised & organised prompt appears here. You can also edit it and tap Save."
                      className="w-full p-3 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-mono text-emerald-950 dark:text-emerald-100 leading-relaxed resize-y"
                    />
                  </div>

                  {/* Connected Raw Notes History */}
                  {selectedNoteFile.entries.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Connected Notes in This File ({selectedNoteFile.entries.length})
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {selectedNoteFile.entries.map((entry, idx) => (
                          <div
                            key={entry.id}
                            className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 flex items-start justify-between gap-2 text-[11px]"
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="text-[10px] font-bold text-emerald-700 dark:text-amber-300">
                                Note #{idx + 1} · {new Date(entry.createdAt).toLocaleString()}
                              </div>
                              <div className="text-emerald-950 dark:text-slate-100 whitespace-pre-wrap break-words">
                                {entry.rawText}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteNoteEntry(entry.id)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-500/15 shrink-0"
                              title="Remove note entry"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 0. LIVE WEBSITE EMOJI LINK GENERATOR & APP ICON COMPOSER (AUTO PUSH & SYNC) */}
      {activeStudioModule === 'emoji_links' && (
      <div className="bg-white dark:bg-emerald-900/60 border-2 border-amber-400/60 dark:border-amber-400/50 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-300" />
            <div>
              <h3 className="text-sm font-black text-emerald-950 dark:text-white">
                Live Website Emoji Link &amp; App Icon Share (Auto Push/Sync)
              </h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Convert your live website link into emojis, attach it to the Choy Chat app icon image, share with image preview, and auto push/sync to all devices.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-900 dark:text-emerald-200 font-mono text-[10px] font-bold">
            Auto Push &amp; Sync Ready
          </span>
        </div>

        {emojiLinkStatusMsg && (
          <div className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-950 dark:text-emerald-100 font-bold text-[11px]">
            {emojiLinkStatusMsg}
          </div>
        )}
        {emojiLinkError && (
          <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-400/50 text-rose-700 dark:text-rose-200 font-bold text-[11px]">
            {emojiLinkError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Form Column */}
          <form onSubmit={handleSaveEmojiLink} className="lg:col-span-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-200 mb-1">
                  Live Website Link (URL)
                </label>
                <input
                  type="url"
                  required
                  value={emojiTargetUrl}
                  onChange={(e) => setEmojiTargetUrl(e.target.value)}
                  placeholder="https://chat-9-si9x.onrender.com"
                  className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-200 mb-1">
                  App / Link Label
                </label>
                <input
                  type="text"
                  value={emojiLinkTitle}
                  onChange={(e) => setEmojiLinkTitle(e.target.value)}
                  placeholder="Choy Chat Live App"
                  className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-200 mb-1">
                Generated Emoji Link Code
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  required
                  value={emojiCodeInput}
                  onChange={(e) => setEmojiCodeInput(e.target.value)}
                  placeholder="🔐🟢💬✨🚀"
                  className="flex-1 min-w-[160px] p-2.5 bg-emerald-50 dark:bg-emerald-950 border border-amber-400/60 dark:border-amber-400/50 rounded-xl text-base tracking-widest text-emerald-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setEmojiCodeInput(generateEmojiFromUrl(emojiTargetUrl))}
                  className="px-3 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] inline-flex items-center gap-1 transition"
                  title="Convert Website Link deterministically to Emoji"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Link → Emoji
                </button>
                <button
                  type="button"
                  onClick={() => setEmojiCodeInput(generateRandomEmojiCode(5))}
                  className="px-3 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-800 border border-emerald-300 dark:border-emerald-600 text-emerald-950 dark:text-white font-bold text-[11px] inline-flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-700 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Random
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {['🔐🟢💬✨🚀', '💎📲👑🔥⚡', '🌐💚🛡️✨📡', '🗝️🌟💚🎉🤝'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setEmojiCodeInput(preset)}
                    className={`px-2 py-1 rounded-lg text-xs border transition ${
                      emojiCodeInput === preset
                        ? 'bg-amber-400/25 border-amber-400 font-bold'
                        : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-200 mb-1">
                App Icon Image Path / URL
              </label>
              <input
                type="text"
                value={emojiIconUrl}
                onChange={(e) => setEmojiIconUrl(e.target.value)}
                placeholder="/assets/aistudio/image_20261121_145253_f477cbfa.webp"
                className="w-full p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white font-mono text-[11px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px]">
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-emerald-950 dark:text-emerald-100">
                <input
                  type="checkbox"
                  checked={pinToAppIconOnSave}
                  onChange={(e) => setPinToAppIconOnSave(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <span>Attach to App Icon Image across whole app</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-emerald-950 dark:text-emerald-100">
                <input
                  type="checkbox"
                  checked={autoPushOnSave}
                  onChange={(e) => setAutoPushOnSave(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <span>Auto Push &amp; Sync to all devices</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isSavingEmojiLink}
                className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow disabled:opacity-60 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingEmojiLink ? 'Saving & Syncing...' : 'Save to Security Studio & Auto Sync'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareCurrentEmojiWithImage()}
                className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow transition"
              >
                <Share2 className="w-3.5 h-3.5" /> Share Link with App Image
              </button>
              <button
                type="button"
                onClick={handleDownloadEmojiIconCard}
                className="px-3 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-800 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-white font-bold text-xs inline-flex items-center gap-1.5 hover:bg-emerald-200 dark:hover:bg-emerald-700 transition"
              >
                <Download className="w-3.5 h-3.5" /> Save Icon Card
              </button>
            </div>
          </form>

          {/* Live App Icon + Emoji Composite Preview */}
          <div className="p-4 rounded-2xl bg-emerald-950 border border-amber-400/50 text-center space-y-3 shadow-inner">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              App Icon Image Preview
            </div>
            <div className="relative inline-block mx-auto">
              <div className="w-28 h-36 rounded-2xl overflow-hidden border-2 border-emerald-400 bg-emerald-900 p-1 shadow-xl mx-auto">
                <img
                  src={emojiIconUrl || defaultAppIcon}
                  alt=""
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div className="-mt-4 relative z-10 inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-950 border-2 border-amber-400 text-sm tracking-widest shadow-lg">
                {emojiCodeInput || '🔐🟢💬✨🚀'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-black text-white truncate">{emojiLinkTitle || 'Choy Chat Live App'}</div>
              <div className="p-2 rounded-lg bg-slate-950/80 border border-emerald-800 text-[10px] font-mono text-cyan-300 break-all">
                {buildEmojiShareUrl(emojiCodeInput)}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  'generated_emoji_share_url',
                  `${emojiCodeInput} ${buildEmojiShareUrl(emojiCodeInput)}`
                )
              }
              className="w-full py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] inline-flex items-center justify-center gap-1.5 transition"
            >
              {copiedKey === 'generated_emoji_share_url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'generated_emoji_share_url' ? 'Copied Emoji + Link!' : 'Copy Emoji + Link'}</span>
            </button>
          </div>
        </div>

        {/* Saved Emoji Links Vault */}
        <div className="space-y-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-950 dark:text-white flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Saved Emoji Links in Security Studio ({emojiLinksList.length})
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
              Tap "Pin to Icon" to switch the active App Icon Link
            </span>
          </div>

          {emojiLinksList.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-center text-xs text-emerald-700 dark:text-emerald-300">
              No saved emoji links yet. Generate and save one above to attach it to your App Icon Image!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {emojiLinksList.map((item) => {
                const shareUrl = buildEmojiShareUrl(item.emojiCode);
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 ${
                      item.pinnedToAppIcon
                        ? 'bg-emerald-100/90 dark:bg-emerald-950 border-amber-400 dark:border-amber-400 shadow'
                        : 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={item.iconUrl || defaultAppIcon}
                          alt=""
                          className="w-11 h-14 rounded-lg object-contain bg-emerald-950 border border-emerald-400/60 p-0.5"
                        />
                        {item.pinnedToAppIcon && (
                          <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[8px] shadow">
                            ICON
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm tracking-wider">{item.emojiCode}</span>
                          {item.pinnedToAppIcon && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold">
                              Active &amp; Synced ✓
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-emerald-950 dark:text-white truncate">{item.title}</div>
                        <div className="text-[10px] font-mono text-emerald-700 dark:text-cyan-300 truncate">{item.targetUrl}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleShareCurrentEmojiWithImage(item)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-[10px] inline-flex items-center gap-1"
                      >
                        <Share2 className="w-3 h-3" /> Share w/ Image
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(`el_${item.id}`, `${item.emojiCode} ${shareUrl}`)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-white font-bold text-[10px] inline-flex items-center gap-1"
                      >
                        {copiedKey === `el_${item.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copiedKey === `el_${item.id}` ? 'Copied' : 'Copy'}
                      </button>
                      {!item.pinnedToAppIcon && (
                        <button
                          type="button"
                          onClick={() => handlePinExistingEmojiLink(item.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] inline-flex items-center gap-1"
                        >
                          <Pin className="w-3 h-3" /> Pin to Icon
                        </button>
                      )}
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[10px] inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Open
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingEmojiLink(item.id)}
                        className="ml-auto p-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/15"
                        title="Delete saved emoji link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* 1. DIRECT LINKS: RENDER DOCKER & AI STUDIO */}
      {activeStudioModule === 'quick_links' && (
      <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />
            <h3 className="text-sm font-bold text-emerald-950 dark:text-white">Quick Links (Render Docker & AI Studio)</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-800 dark:text-cyan-200 font-mono text-[10px] font-bold">
              Docker Ready
            </span>
            <button
              type="button"
              onClick={() => setEditingLinks(!editingLinks)}
              className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:text-emerald-950 dark:hover:text-white text-[11px] font-semibold"
            >
              {editingLinks ? 'Close' : 'Edit Links'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              key: 'aiStudioChat',
              title: 'AI Studio Chat & Preview',
              subtitle: 'Diretso mag-update ug features diri',
              url: adminLinks.aiStudioChat,
              icon: <Sparkles className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />,
              btnColor: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
            },
            {
              key: 'renderDashboard',
              title: 'Render Dashboard',
              subtitle: 'Manage imong Render app & logs',
              url: adminLinks.renderDashboard,
              icon: <Cloud className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />,
              btnColor: 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
            },
            {
              key: 'renderLiveApp',
              title: 'Render Live App URL',
              subtitle: 'Imong live website link sa Render',
              url: adminLinks.renderLiveApp,
              icon: <Globe className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />,
              btnColor: 'bg-indigo-500 text-white hover:bg-indigo-400',
            },
            {
              key: 'renderNewPostgres',
              title: 'Create Free Render Postgres DB',
              subtitle: '1-click Free PostgreSQL database para sa Render (copy Internal URL -> DATABASE_URL)',
              url: adminLinks.renderNewPostgres,
              icon: <ExternalLink className="w-4 h-4 text-amber-700 dark:text-amber-300" />,
              btnColor: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
            },
            {
              key: 'supabaseDashboard',
              title: 'Supabase Dashboard (Alternative)',
              subtitle: 'Pwede pud Supabase Postgres URI isip DATABASE_URL',
              url: adminLinks.supabaseDashboard,
              icon: <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />,
              btnColor: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
            },
          ].map((item) => (
            <div key={item.key} className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-950 dark:text-white">
                  {item.icon}
                  <span>{item.title}</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">{item.subtitle}</p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 py-2 px-3 rounded-lg font-bold text-center flex items-center justify-center gap-1.5 transition${item.btnColor}`}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(item.key, item.url)}
                  className="py-2 px-3 rounded-lg bg-emerald-100/80 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:text-emerald-950 dark:hover:text-white flex items-center gap-1 font-semibold"
                >
                  {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === item.key ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {editingLinks && (
          <form onSubmit={handleSaveLinks} className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-cyan-500/40 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-emerald-700 dark:text-emerald-300 mb-1">AI Studio Chat Link</label>
                <input
                  type="url"
                  value={adminLinks.aiStudioChat}
                  onChange={(e) => setAdminLinks({ ...adminLinks, aiStudioChat: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-950 dark:text-white font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-emerald-700 dark:text-emerald-300 mb-1">Render Live App URL</label>
                <input
                  type="url"
                  value={adminLinks.renderLiveApp}
                  onChange={(e) => setAdminLinks({ ...adminLinks, renderLiveApp: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-950 dark:text-white font-mono text-[11px]"
                />
              </div>
            </div>
            <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> Save Links
            </button>
          </form>
        )}
      </div>
      )}

      {/* 2. SIMPLE ALL-IN-ONE KEYS SETUP (NO CLUTTER, DIRECT "GET KEY" LINKS) */}
      {activeStudioModule === 'keys_env' && (
      <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />
            <div>
              <h3 className="text-sm font-bold text-emerald-950 dark:text-white">Simple Keys Setup (Render + Supabase + AI)</h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Auto-set na ang Docker/Render settings. Diri lang ibutang kung naa kay keys (optional tanan).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyRenderEnv}
            className="px-3.5 py-2 rounded-xl bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-300 shadow"
          >
            {copiedKey === 'render_env_all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey === 'render_env_all' ? 'Copied!' : 'Copy .env for Render'}
          </button>
        </div>

        {keysSavedMsg && (
          <div className="px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-semibold text-[11px]">
            {keysSavedMsg}
          </div>
        )}

        <form onSubmit={handleSaveMainKeys} className="space-y-3">
          {keyFields.map((field) => {
            const isHidden = field.secret && !revealedFields[field.id];
            const hasVal = mainKeys[field.id].trim().length > 0;
            const isLiveOnServer = Boolean(serverConfigured[field.id]);
            return (
              <div key={field.id} className="p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/25 text-indigo-200 font-mono font-bold text-[10px]">
                      {field.id}
                    </span>
                    <span className="font-bold text-emerald-950 dark:text-white">{field.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isLiveOnServer
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : hasVal
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {isLiveOnServer ? 'Active on Server ✓' : hasVal ? 'Filled ✓' : 'Paste Key'}
                    </span>
                  </div>
                  {field.getLink && (
                    <a
                      href={field.getLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 hover:text-white text-[10px] font-bold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> {field.getLink.label}
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-emerald-300/90">{field.hint}</p>
                <div className="flex items-center gap-2">
                  <input
                    type={isHidden ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    value={mainKeys[field.id]}
                    onChange={(e) => setMainKeys({ ...mainKeys, [field.id]: e.target.value })}
                    className="flex-1 p-2 bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-950 dark:text-white font-mono text-[11px] focus:outline-none focus:border-emerald-400"
                  />
                  {field.secret && (
                    <button
                      type="button"
                      onClick={() => setRevealedFields({ ...revealedFields, [field.id]: !revealedFields[field.id] })}
                      className="p-2 rounded-lg bg-emerald-100/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 hover:text-emerald-950 dark:hover:text-white"
                      title="Show / Hide"
                    >
                      {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {customPairs.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Extra Custom Keys</div>
              {customPairs.map((kv) => (
                <div key={kv.id} className="p-2.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-2">
                  <div className="font-mono text-[11px] truncate">
                    <span className="text-indigo-700 dark:text-indigo-300 font-bold">{kv.key}</span>
                    <span className="text-emerald-700/80 dark:text-slate-400"> = </span>
                    <span className="text-emerald-950 dark:text-white">{kv.secret ? '••••••••' : kv.value}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomKey(kv.id)}
                    className="text-red-400 hover:text-red-200 p-1 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl shadow flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save Keys
              </button>
              <button
                type="button"
                onClick={handleAutoFillKnownDefaults}
                className="px-3.5 py-2.5 bg-cyan-500/20 border border-cyan-400/50 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-400 hover:text-slate-950 font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Auto-Fill Defaults
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:text-emerald-950 dark:hover:text-white font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom Key
              </button>
              <button
                type="button"
                onClick={() => setShowAutoDocker(!showAutoDocker)}
                className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-slate-300 hover:text-emerald-950 dark:hover:text-white text-[11px]"
              >
                {showAutoDocker ? 'Hide Auto Settings' : 'Auto Docker Settings'}
              </button>
            </div>
          </div>
        </form>

        {showAddCustom && (
          <form onSubmit={handleAddCustomKey} className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-indigo-500/40 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <input
              type="text"
              placeholder="KEY_NAME"
              value={newKvKey}
              onChange={(e) => setNewKvKey(e.target.value)}
              className="sm:col-span-4 p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-950 dark:text-white font-mono"
            />
            <input
              type={newKvSecret ? 'password' : 'text'}
              placeholder="Value..."
              value={newKvVal}
              onChange={(e) => setNewKvVal(e.target.value)}
              className="sm:col-span-5 p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-950 dark:text-white font-mono"
            />
            <label className="sm:col-span-1 flex items-center gap-1 text-[10px] text-emerald-800 dark:text-emerald-200">
              <input type="checkbox" checked={newKvSecret} onChange={(e) => setNewKvSecret(e.target.checked)} />
              Hide
            </label>
            <button type="submit" className="sm:col-span-2 py-2 bg-indigo-500 text-white font-bold rounded-lg">
              Add
            </button>
          </form>
        )}

        {showAutoDocker && (
          <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-slate-950/70 border border-emerald-200 dark:border-emerald-800 space-y-1">
            <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Auto-configured inside Dockerfile (no need to touch)</div>
            <pre className="text-[11px] font-mono text-emerald-800 dark:text-slate-300">{AUTO_DOCKER_DEFAULTS.join('\n')}</pre>
          </div>
        )}

        {/* Categorized .env & All Code Config Vault (Auto-Synced) */}
        <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-600 dark:text-cyan-300" />
              <div>
                <div className="text-xs font-black text-emerald-950 dark:text-white flex items-center gap-2">
                  <span>Categorized .env &amp; All Code Config Vault</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono text-[9px] font-bold">
                    Auto-Synced ✓
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                  Organise your .env variables and code/config entries by category with automatic cross-device sync.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={isSyncingEnvVault}
                onClick={handleSyncAllMainKeysToEnvVault}
                className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-[11px] inline-flex items-center gap-1 shadow disabled:opacity-60"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingEnvVault ? 'animate-spin' : ''}`} />
                <span>Sync Keys to Cloud Vault</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopyEnvVaultCategory(activeEnvCategory)}
                className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-[11px] inline-flex items-center gap-1 shadow"
              >
                {copiedKey === `env_cat_${activeEnvCategory}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>Copy {activeEnvCategory} .env</span>
              </button>
            </div>
          </div>

          {envVaultStatusMsg && (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-950 dark:text-emerald-100 font-bold text-[11px]">
              {envVaultStatusMsg}
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {(['All', ...ENV_CATEGORIES] as const).map((cat) => {
              const count =
                cat === 'All'
                  ? envVaultEntries.length
                  : envVaultEntries.filter((e) => e.category === cat).length;
              const active = activeEnvCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveEnvCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                    active
                      ? 'bg-emerald-400 text-slate-950 border-emerald-400 shadow'
                      : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 hover:border-emerald-400'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Add Categorized .env / Code Config Entry */}
          <form
            onSubmit={handleSaveCategorizedEnvEntry}
            className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 space-y-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={envVaultCategory}
                onChange={(e) => setEnvVaultCategory(e.target.value)}
                className="p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-lg text-[11px] text-emerald-950 dark:text-white"
              >
                {ENV_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                placeholder="KEY_NAME or File Label..."
                value={envVaultKeyName}
                onChange={(e) => setEnvVaultKeyName(e.target.value)}
                className="p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-lg text-[11px] font-mono text-emerald-950 dark:text-white"
              />
              <input
                type="text"
                placeholder="Short note (optional)..."
                value={envVaultNotes}
                onChange={(e) => setEnvVaultNotes(e.target.value)}
                className="p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-lg text-[11px] text-emerald-950 dark:text-white"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch">
              <textarea
                rows={2}
                required
                placeholder="Paste .env value or code/config snippet..."
                value={envVaultValue}
                onChange={(e) => setEnvVaultValue(e.target.value)}
                className="flex-1 p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-lg text-[11px] font-mono text-emerald-950 dark:text-white"
              />
              <div className="flex sm:flex-col justify-between gap-2 shrink-0">
                <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-900 dark:text-emerald-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={envVaultSecret}
                    onChange={(e) => setEnvVaultSecret(e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-500 rounded"
                  />
                  <span>Secret</span>
                </label>
                <button
                  type="submit"
                  disabled={isSyncingEnvVault}
                  className="px-3.5 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-[11px] inline-flex items-center justify-center gap-1 shadow disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" /> Save &amp; Sync
                </button>
              </div>
            </div>
          </form>

          {/* Filtered Categorized Entries List */}
          {(() => {
            const visibleEntries =
              activeEnvCategory === 'All'
                ? envVaultEntries
                : envVaultEntries.filter((e) => e.category === activeEnvCategory);
            if (visibleEntries.length === 0) {
              return (
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center text-[11px] text-emerald-700 dark:text-emerald-300">
                  No synced entries in [{activeEnvCategory}] yet. Tap <span className="font-bold">Sync Keys to Cloud Vault</span> or add one above.
                </div>
              );
            }
            return (
              <div className="space-y-2">
                {visibleEntries.map((entry) => {
                  const isMasked = entry.secret && !revealedEnvIds[entry.id];
                  return (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 text-[9px] font-bold uppercase">
                            {entry.category}
                          </span>
                          <span className="font-mono font-bold text-xs text-emerald-950 dark:text-white">
                            {entry.keyName}
                          </span>
                          {entry.notes && (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300">· {entry.notes}</span>
                          )}
                        </div>
                        <pre className="text-[11px] font-mono text-emerald-800 dark:text-cyan-300 whitespace-pre-wrap break-all bg-white/80 dark:bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-emerald-200/80 dark:border-emerald-800/80">
                          {isMasked ? '••••••••••••••••••••' : entry.value}
                        </pre>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {entry.secret && (
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedEnvIds((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))
                            }
                            className="p-1.5 rounded-lg bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200"
                            title="Reveal / Hide"
                          >
                            {isMasked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(`ev_${entry.id}`, `${entry.keyName}=${entry.value}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-white font-bold text-[10px] inline-flex items-center gap-1"
                        >
                          {copiedKey === `ev_${entry.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === `ev_${entry.id}` ? 'Copied' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategorizedEnvEntry(entry.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
      )}

      {/* 3. ANALYTICS OVERVIEW */}
      {activeStudioModule === 'analytics' && (
      <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
          <h3 className="text-sm font-bold text-emerald-950 dark:text-white">App Analytics</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase">Users</div>
            <div className="text-xl font-black text-emerald-950 dark:text-white font-mono">{activeMembersCount}</div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400">Auto-active on sign in</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase">Blocked</div>
            <div className="text-xl font-black text-red-400 font-mono">{blockedUsers.length}</div>
            <div className="text-[10px] text-emerald-700/80 dark:text-slate-400">Filtered</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase">Posts</div>
            <div className="text-xl font-black text-emerald-950 dark:text-white font-mono">{postsCount}</div>
            <div className="text-[10px] text-cyan-700 dark:text-cyan-300">{mediaPostsCount} media</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase">Messages</div>
            <div className="text-xl font-black text-emerald-950 dark:text-white font-mono">{messagesCount}</div>
            <div className="text-[10px] text-cyan-700 dark:text-cyan-300">{mediaMessagesCount} media</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase">Ledger</div>
            <div className="text-xl font-black text-emerald-950 dark:text-white font-mono">{ledgerCount}</div>
            <div className="text-[10px] text-amber-700 dark:text-amber-300">₱{ledgerTotalValue.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase">AI Brain</div>
            <div className="text-xl font-black text-cyan-700 dark:text-cyan-300 font-mono">{knowledgeCount}</div>
            <div className="text-[10px] text-emerald-700/80 dark:text-slate-400">Q&A items</div>
          </div>
        </div>
      </div>
      )}

      {/* 4. STORAGE MONITORING (SUPABASE CLOUD STORAGE + CACHE) */}
      {activeStudioModule === 'storage' && (
      <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />
            <h3 className="text-sm font-bold text-emerald-950 dark:text-white">Supabase Cloud Storage & Database</h3>
          </div>
          <a
            href={adminLinks.supabaseStorage}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:text-emerald-950 dark:hover:text-white flex items-center gap-1.5 font-semibold"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Supabase Storage
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form onSubmit={handleSaveStorageProfile} className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-emerald-950 dark:text-white">Supabase Media Vault</span>
              <span className="font-mono text-[11px] font-bold text-cyan-700 dark:text-cyan-300 tabular-nums">
                {supabaseStorageProfile.quotaGb} GB Free · {supabaseStorageProfile.dbQuotaMb} MB DB
              </span>
            </div>
            <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300/90 tabular-nums">
              <span>Status: {mediaStorageMode === 'supabase' ? 'Supabase Storage Connected' : 'Inline Fallback'}</span>
              <span aria-hidden="true"> · </span>
              <span>DB: {storageMode === 'postgres' ? 'PostgreSQL Live' : 'Local Disk + Firebase Ready'}</span>
            </div>
            <div className="w-full h-2.5 bg-white dark:bg-slate-900 rounded-full overflow-hidden border border-emerald-200 dark:border-emerald-800">
              <div
                className={`h-full transition-all ${
                  mediaStorageMode === 'supabase'
                    ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 w-[12%]'
                    : 'bg-amber-400 w-[5%]'
                }`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
              <span>Synced media items: {totalMediaItems}</span>
              <span>Bucket: {mainKeys.SUPABASE_BUCKET || supabaseStorageProfile.bucket}</span>
            </div>
            <div className="space-y-2">
              <input
                type="url"
                value={supabaseStorageProfile.projectUrl}
                onChange={(e) => setSupabaseStorageProfile({ ...supabaseStorageProfile, projectUrl: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-950 dark:text-white font-mono text-[11px]"
                placeholder="https://xxxx.supabase.co"
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  value={supabaseStorageProfile.dashboardUrl}
                  onChange={(e) => setSupabaseStorageProfile({ ...supabaseStorageProfile, dashboardUrl: e.target.value })}
                  className="flex-1 p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-950 dark:text-white font-mono text-[11px]"
                  placeholder="Supabase Storage Bucket URL"
                />
                <a
                  href={supabaseStorageProfile.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-800 text-emerald-950 dark:text-white font-bold flex items-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button type="submit" className="px-3 py-1.5 rounded-lg bg-emerald-400 text-slate-950 font-bold">
                Save Storage Link
              </button>
              {storageSaved && <span className="text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">Saved!</span>}
            </div>
          </form>

          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 dark:text-white">Local App Cache</span>
                <button
                  type="button"
                  onClick={refreshStorageStats}
                  className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white flex items-center gap-1 text-[10px]"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              <div className="w-full h-2.5 bg-white dark:bg-slate-900 rounded-full overflow-hidden border border-emerald-200 dark:border-emerald-800">
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.max(2, browserPercent)}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-slate-950/70 border border-emerald-200 dark:border-emerald-800/80">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Used</div>
                  <div className="font-mono font-bold text-emerald-950 dark:text-white">{formatBytes(storageEstimate.usageBytes)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-slate-950/70 border border-emerald-200 dark:border-emerald-800/80">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Quota</div>
                  <div className="font-mono font-bold text-emerald-950 dark:text-white">{formatBytes(storageEstimate.quotaBytes)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-slate-950/70 border border-emerald-200 dark:border-emerald-800/80">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Cache Buckets</div>
                  <div className="font-mono font-bold text-amber-700 dark:text-amber-300">{cacheCount}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-slate-950/70 border border-emerald-200 dark:border-emerald-800/80">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Config Size</div>
                  <div className="font-mono font-bold text-cyan-700 dark:text-cyan-300">{localStorageKb} KB</div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearAppCache}
              disabled={isClearingCache}
              className="w-full py-2 rounded-xl bg-amber-400/90 hover:bg-amber-300 text-slate-950 font-bold flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear App Cache
            </button>
          </div>
        </div>
        {renderFirebaseCloudSyncCard()}
      </div>
      )}

      {/* NEWSFEEDS A, B, C & B+C SETUP & USER ASSIGNMENT */}
      {activeStudioModule === 'newsfeeds' && (
      <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
          <h3 className="text-sm font-bold text-emerald-950 dark:text-white">Newsfeeds A, B, C &amp; B+C Setup &amp; User Assignment</h3>
        </div>
        <p className="text-xs text-emerald-800 dark:text-emerald-200">
          Strictly separates users and search results across 4 choices: <span className="font-bold">{newsfeedATitle}</span>, <span className="font-bold">{newsfeedBTitle}</span>, <span className="font-bold">{newsfeedCTitle}</span>, or <span className="font-bold">B &amp; C</span>. Users in Newsfeed A cannot see or search Newsfeed B/C users, and Newsfeed B/C users cannot see Newsfeed A users.
        </p>

        {onAdminNewsfeedFilterChange && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-emerald-950 dark:text-white flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Admin Newsfeed View Filter</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                Pilia unsa ang makita sa imong Newsfeed tab
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Channels' },
                  { id: 'feed_a', label: newsfeedATitle || 'Newsfeed A' },
                  { id: 'feed_b', label: newsfeedBTitle || 'Newsfeed B' },
                  { id: 'feed_c', label: newsfeedCTitle || 'Newsfeed C' },
                  { id: 'feed_bc', label: 'B & C' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onAdminNewsfeedFilterChange(opt.id)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition ${
                    adminNewsfeedFilter === opt.id
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-white dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">Newsfeed A Name</label>
            <input
              type="text"
              value={newsfeedATitle}
              onChange={(e) => setNewsfeedATitle(e.target.value)}
              className="w-full p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">Newsfeed B Name</label>
            <input
              type="text"
              value={newsfeedBTitle}
              onChange={(e) => setNewsfeedBTitle(e.target.value)}
              className="w-full p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">Newsfeed C Name</label>
            <input
              type="text"
              value={newsfeedCTitle}
              onChange={(e) => setNewsfeedCTitle(e.target.value)}
              className="w-full p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white"
            />
          </div>
          <div className="sm:col-span-3 flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={savingNfTitles}
              onClick={async () => {
                const cleanA = newsfeedATitle.trim() || 'Newsfeed A';
                const cleanB = newsfeedBTitle.trim() || 'Newsfeed B';
                const cleanC = newsfeedCTitle.trim() || 'Newsfeed C';
                setNewsfeedATitle(cleanA);
                setNewsfeedBTitle(cleanB);
                setNewsfeedCTitle(cleanC);
                localStorage.setItem('choychat_nf_a_title', cleanA);
                localStorage.setItem('choychat_nf_b_title', cleanB);
                localStorage.setItem('choychat_nf_c_title', cleanC);
                if (authToken) {
                  setSavingNfTitles(true);
                  try {
                    const res = await fetch('/api/admin/newsfeed-config', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`,
                      },
                      credentials: 'same-origin',
                      body: JSON.stringify({ feedATitle: cleanA, feedBTitle: cleanB, feedCTitle: cleanC }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok && data.newsfeedConfig) {
                      onNewsfeedConfigChanged?.(data.newsfeedConfig);
                    } else {
                      onNewsfeedConfigChanged?.({ feedATitle: cleanA, feedBTitle: cleanB, feedCTitle: cleanC });
                    }
                  } catch {
                    onNewsfeedConfigChanged?.({ feedATitle: cleanA, feedBTitle: cleanB, feedCTitle: cleanC });
                  } finally {
                    setSavingNfTitles(false);
                  }
                } else {
                  onNewsfeedConfigChanged?.({ feedATitle: cleanA, feedBTitle: cleanB, feedCTitle: cleanC });
                }
                setNfTitlesSaved(true);
                setTimeout(() => setNfTitlesSaved(false), 2000);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs disabled:opacity-50"
            >
              {savingNfTitles ? 'Saving...' : 'Save Newsfeed Titles'}
            </button>
            {nfTitlesSaved && <span className="text-emerald-700 dark:text-emerald-300 text-xs font-semibold">Titles Saved & Synced!</span>}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-emerald-200 dark:border-emerald-800">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] uppercase">
              <tr>
                <th className="p-3">User Name</th>
                <th className="p-3">Phone / ID</th>
                <th className="p-3">Assigned Newsfeed (4 Choices)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-200 dark:divide-emerald-800 bg-white dark:bg-emerald-950/50">
              {usersList.map((u) => {
                const currentVal: StudioNewsfeedChannel =
                  u.newsfeed === 'feed_b' || u.newsfeed === 'feed_c' || u.newsfeed === 'feed_bc'
                    ? u.newsfeed
                    : 'feed_a';
                return (
                <tr key={u.id} className="hover:bg-emerald-50 dark:hover:bg-emerald-900/40">
                  <td className="p-3 font-bold text-emerald-950 dark:text-white">{u.name}</td>
                  <td className="p-3 font-mono text-emerald-700 dark:text-emerald-300">{u.phone}</td>
                  <td className="p-3">
                    <select
                      value={currentVal}
                      onChange={(e) => {
                        const val = e.target.value as StudioNewsfeedChannel;
                        if (onUpdateUserNewsfeed) {
                          onUpdateUserNewsfeed(u.id, val);
                        } else {
                          setUsersList(
                            usersList.map((item) => (item.id === u.id ? { ...item, newsfeed: val } : item))
                          );
                        }
                      }}
                      className="p-1.5 rounded-lg bg-white dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-white font-bold text-xs"
                    >
                      <option value="feed_a">{newsfeedATitle || 'Newsfeed A'}</option>
                      <option value="feed_b">{newsfeedBTitle || 'Newsfeed B'}</option>
                      <option value="feed_c">{newsfeedCTitle || 'Newsfeed C'}</option>
                      <option value="feed_bc">B &amp; C ({newsfeedBTitle || 'Newsfeed B'} &amp; {newsfeedCTitle || 'Newsfeed C'})</option>
                    </select>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* MOVING ANNOUNCEMENT & REMINDER SLIDE BANNER SETUP */}
      {activeStudioModule === 'announcements' && (
      <div className="bg-white dark:bg-emerald-900/60 border border-amber-300 dark:border-amber-500/40 rounded-2xl p-5 space-y-5 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-500 dark:text-amber-300" />
            <h3 className="text-sm font-bold text-emerald-950 dark:text-white">
              Moving Slide Banner Setup — Announcements &amp; Reminders
            </h3>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 font-bold text-[10px] uppercase">
            Auto-Sliding + Moving Ticker · Synced
          </span>
        </div>

        <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
          Paghimo ug mga <span className="font-bold">Moving Slide Banners</span> para sa Announcements ug Reminders sa Newsfeed. Pilia kon para asa ni nga Newsfeed (<span className="font-bold">All, {newsfeedATitle}, {newsfeedBTitle}, {newsfeedCTitle}, o B &amp; C</span>) para ang assigned users ra ang makakita.
        </p>

        {annStatusMsg && (
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-400/60 text-emerald-900 dark:text-emerald-200 font-bold text-xs flex items-center justify-between gap-2">
            <span>{annStatusMsg}</span>
            <button type="button" onClick={() => setAnnStatusMsg('')} className="font-bold px-1">✕</button>
          </div>
        )}
        {annErrMsg && (
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-400/60 text-rose-900 dark:text-rose-200 font-bold text-xs flex items-center justify-between gap-2">
            <span>{annErrMsg}</span>
            <button type="button" onClick={() => setAnnErrMsg('')} className="font-bold px-1">✕</button>
          </div>
        )}

        {/* LIVE MOVING SLIDE BANNER PREVIEW */}
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/70 p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Live Moving Slide Banner Preview ({activeStudioSlides.length} active)
            </span>
            <div className="flex items-center gap-1.5">
              {activeStudioSlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewSlideIdx(
                        (prev) => (prev - 1 + activeStudioSlides.length) % activeStudioSlides.length
                      )
                    }
                    className="p-1 rounded-lg bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100"
                    title="Previous slide"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSlideIdx((prev) => (prev + 1) % activeStudioSlides.length)}
                    className="p-1 rounded-lg bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100"
                    title="Next slide"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setPreviewPaused((p) => !p)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold text-[10px] inline-flex items-center gap-1"
              >
                {previewPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                {previewPaused ? 'Play' : 'Pause'}
              </button>
            </div>
          </div>

          {activeStudioSlides.length === 0 ? (
            <div className="rounded-xl border border-dashed border-emerald-300 dark:border-emerald-700 p-4 text-center text-xs text-emerald-700 dark:text-emerald-300">
              Wala pay active announcement slide. Paghimo sa ubos para makita ang moving slide banner diri ug sa Newsfeed.
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-amber-300 dark:border-amber-500/40 bg-white dark:bg-slate-950 shadow-sm">
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{
                    transform: `translateX(-${(previewSlideIdx % activeStudioSlides.length) * 100}%)`,
                  }}
                >
                  {activeStudioSlides.map((slide) => (
                    <div key={slide.id} className="w-full shrink-0 p-3.5 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              slide.badge === 'urgent'
                                ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200'
                                : slide.badge === 'reminder'
                                ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-200'
                                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200'
                            }`}
                          >
                            {slide.badge}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                            Para sa: {getAnnTargetLabel(slide.target)}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                          {slide.tone.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs font-extrabold text-emerald-950 dark:text-white">
                        {slide.title}
                      </div>
                      <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-snug">
                        {slide.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="choy-ticker-wrapper overflow-hidden border-t border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 py-1.5">
                <div
                  className="choy-ticker-track text-[11px] font-bold text-amber-900 dark:text-amber-200 whitespace-nowrap"
                  style={{ animationPlayState: previewPaused ? 'paused' : 'running' }}
                >
                  {[...activeStudioSlides, ...activeStudioSlides].map((s, idx) => (
                    <span key={`${s.id}_${idx}`} className="inline-flex items-center gap-2 px-4">
                      <Megaphone className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="uppercase text-[10px] opacity-80">[{s.badge}]</span>
                      <span>{s.title}:</span>
                      <span className="font-normal">{s.message}</span>
                      <span className="opacity-50">•</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CREATE / EDIT SLIDE FORM */}
        <form
          onSubmit={handleSaveAnnouncement}
          className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-emerald-950 dark:text-white">
              {annEditingId ? 'Edit Announcement Slide' : 'Create New Moving Announcement / Reminder Slide'}
            </span>
            {annEditingId && (
              <button
                type="button"
                onClick={resetAnnForm}
                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[11px] font-bold"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                Para asa na Announcement (Newsfeed Target)
              </label>
              <select
                value={annTarget}
                onChange={(e) => setAnnTarget(e.target.value as StudioAnnouncementTarget)}
                className="w-full p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-950 dark:text-white"
              >
                <option value="all">All Newsfeeds (A, B &amp; C)</option>
                <option value="feed_a">{newsfeedATitle || 'Newsfeed A'}</option>
                <option value="feed_b">{newsfeedBTitle || 'Newsfeed B'}</option>
                <option value="feed_c">{newsfeedCTitle || 'Newsfeed C'}</option>
                <option value="feed_bc">B &amp; C ({newsfeedBTitle || 'Newsfeed B'} &amp; {newsfeedCTitle || 'Newsfeed C'})</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                Type / Badge
              </label>
              <select
                value={annBadge}
                onChange={(e) => setAnnBadge(e.target.value as StudioAnnouncementBadge)}
                className="w-full p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-950 dark:text-white"
              >
                <option value="announcement">Announcement</option>
                <option value="reminder">Reminder</option>
                <option value="urgent">Urgent Notice</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                Slide Color Theme
              </label>
              <select
                value={annTone}
                onChange={(e) => setAnnTone(e.target.value as StudioAnnouncementTone)}
                className="w-full p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-950 dark:text-white"
              >
                <option value="emerald">Emerald Green</option>
                <option value="amber">Amber Gold</option>
                <option value="sky">Sky Blue</option>
                <option value="rose">Rose Urgent</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
              Headline / Title
            </label>
            <input
              type="text"
              maxLength={120}
              required
              placeholder="e.g. Importante nga Pahibalo / Daily Schedule Reminder"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
              Announcement / Reminder Message (Moving Banner Text)
            </label>
            <textarea
              rows={2}
              maxLength={500}
              required
              placeholder="Isulat ang announcement o reminder nga mo-slide ug mo-dagan sa Newsfeed..."
              value={annMessage}
              onChange={(e) => setAnnMessage(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 cursor-pointer">
              <input
                type="checkbox"
                checked={annActive}
                onChange={(e) => setAnnActive(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
              <span>Active (Ipakita dayon sa Newsfeed)</span>
            </label>
            <button
              type="submit"
              disabled={savingAnn}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs inline-flex items-center gap-1.5 shadow disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {savingAnn ? 'Saving...' : annEditingId ? 'Save Changes' : 'Add Moving Slide'}
            </button>
          </div>
        </form>

        {/* FILTER & LIST OF SAVED SLIDES */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-emerald-950 dark:text-white">
              Saved Announcement Slides ({announcementsList.length})
            </span>
            <select
              value={annFilterTarget}
              onChange={(e) => setAnnFilterTarget(e.target.value as 'all_list' | StudioAnnouncementTarget)}
              className="p-1.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-[11px] font-bold text-emerald-950 dark:text-white"
            >
              <option value="all_list">Filter: All Slides</option>
              <option value="all">Target: All Newsfeeds</option>
              <option value="feed_a">Target: {newsfeedATitle || 'Newsfeed A'}</option>
              <option value="feed_b">Target: {newsfeedBTitle || 'Newsfeed B'}</option>
              <option value="feed_c">Target: {newsfeedCTitle || 'Newsfeed C'}</option>
              <option value="feed_bc">Target: B &amp; C</option>
            </select>
          </div>

          {announcementsList.filter((a) => annFilterTarget === 'all_list' || a.target === annFilterTarget).length === 0 ? (
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center text-xs text-emerald-700 dark:text-emerald-300">
              No announcement slides match this filter yet.
            </div>
          ) : (
            <div className="space-y-2">
              {announcementsList
                .filter((a) => annFilterTarget === 'all_list' || a.target === annFilterTarget)
                .map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      item.active
                        ? 'bg-white dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-100/80 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 opacity-75'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200">
                          {item.badge}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.active
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.active ? 'ACTIVE' : 'PAUSED'}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          Para sa: {getAnnTargetLabel(item.target)}
                        </span>
                      </div>
                      <div className="text-xs font-extrabold text-emerald-950 dark:text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-emerald-800 dark:text-emerald-200 break-words">
                        {item.message}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <select
                        value={item.target}
                        onChange={(e) =>
                          handleQuickUpdateAnnouncement(item.id, {
                            target: e.target.value as StudioAnnouncementTarget,
                          })
                        }
                        title="Assign target newsfeed"
                        className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold text-emerald-950 dark:text-white"
                      >
                        <option value="all">All Newsfeeds</option>
                        <option value="feed_a">{newsfeedATitle || 'Newsfeed A'}</option>
                        <option value="feed_b">{newsfeedBTitle || 'Newsfeed B'}</option>
                        <option value="feed_c">{newsfeedCTitle || 'Newsfeed C'}</option>
                        <option value="feed_bc">B &amp; C</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleQuickUpdateAnnouncement(item.id, { active: !item.active })}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
                          item.active
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-300'
                            : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        }`}
                      >
                        {item.active ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAnnEditingId(item.id);
                          setAnnTitle(item.title);
                          setAnnMessage(item.message);
                          setAnnTarget(item.target);
                          setAnnBadge(item.badge);
                          setAnnTone(item.tone);
                          setAnnActive(item.active);
                          setAnnStatusMsg('');
                          setAnnErrMsg('');
                        }}
                        className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-200"
                        title="Edit slide"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(item.id)}
                        className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-200 hover:bg-rose-200"
                        title="Delete slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* ADMIN-ONLY CHANGE USER ACCOUNT PINS */}
      {activeStudioModule === 'user_pins' && (
      <div className="bg-white dark:bg-emerald-900/60 border border-rose-300 dark:border-rose-500/40 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-rose-600 dark:text-rose-300" />
            <h3 className="text-sm font-bold text-emerald-950 dark:text-white">
              Change PIN Setup — All User Accounts (Admin Only Access)
            </h3>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 font-bold text-[10px] uppercase">
            Admin Only · Encrypted on Server
          </span>
        </div>
        <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
          Only the Admin can open this dashboard or update login PINs. Enter a new PIN (4–64 characters) for any user account and tap <span className="font-bold">Save PIN</span>. Existing PINs stay encrypted on the server for privacy.
        </p>

        {pinActionMsg && (
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-400/60 text-emerald-900 dark:text-emerald-200 font-bold text-xs flex items-center justify-between gap-2">
            <span>{pinActionMsg}</span>
            <button type="button" onClick={() => setPinActionMsg('')} className="font-bold px-1">✕</button>
          </div>
        )}
        {pinActionErr && (
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-400/60 text-rose-900 dark:text-rose-200 font-bold text-xs flex items-center justify-between gap-2">
            <span>{pinActionErr}</span>
            <button type="button" onClick={() => setPinActionErr('')} className="font-bold px-1">✕</button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={pinSearchQuery}
            onChange={(e) => setPinSearchQuery(e.target.value)}
            placeholder="Search user account by name or phone..."
            className="flex-1 min-w-[200px] p-2.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white placeholder-emerald-600/60 dark:placeholder-emerald-400"
          />
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            {usersList.length} Account{usersList.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-emerald-200 dark:border-emerald-800">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] uppercase">
              <tr>
                <th className="p-3">User Account</th>
                <th className="p-3">Phone / Login ID</th>
                <th className="p-3">Role &amp; Channel</th>
                <th className="p-3">New Login PIN (4+ chars)</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-200 dark:divide-emerald-800 bg-white dark:bg-emerald-950/50">
              {usersList
                .filter((u) => {
                  const q = pinSearchQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    u.name.toLowerCase().includes(q) ||
                    (u.phone || '').toLowerCase().includes(q) ||
                    (u.role || 'member').toLowerCase().includes(q)
                  );
                })
                .map((u) => {
                  const draft = userPinDrafts[u.id] || '';
                  const isRevealed = Boolean(showUserPinMap[u.id]);
                  const isSaving = savingPinUserId === u.id;
                  const channelLabel =
                    u.newsfeed === 'feed_b'
                      ? newsfeedBTitle || 'Newsfeed B'
                      : u.newsfeed === 'feed_c'
                      ? newsfeedCTitle || 'Newsfeed C'
                      : u.newsfeed === 'feed_bc'
                      ? 'B & C'
                      : newsfeedATitle || 'Newsfeed A';
                  return (
                    <tr key={u.id} className="hover:bg-emerald-50 dark:hover:bg-emerald-900/40">
                      <td className="p-3 font-bold text-emerald-950 dark:text-white">{u.name}</td>
                      <td className="p-3 font-mono text-emerald-700 dark:text-emerald-300">{u.phone}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {u.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-semibold">
                            {channelLabel}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type={isRevealed ? 'text' : 'password'}
                            value={draft}
                            minLength={4}
                            maxLength={64}
                            placeholder="Enter new PIN (4+ chars)"
                            onChange={(e) =>
                              setUserPinDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))
                            }
                            className="w-44 p-2 rounded-lg bg-emerald-50 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 text-xs font-mono text-emerald-950 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowUserPinMap((prev) => ({ ...prev, [u.id]: !prev[u.id] }))
                            }
                            className="p-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800"
                            title={isRevealed ? 'Hide PIN' : 'Show PIN'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          disabled={isSaving || draft.trim().length < 4}
                          onClick={async () => {
                            const cleanPin = draft.trim();
                            if (cleanPin.length < 4 || cleanPin.length > 64) {
                              setPinActionErr('PIN must be between 4 and 64 characters.');
                              return;
                            }
                            if (!authToken) {
                              setPinActionErr('Admin login session required to save PIN.');
                              return;
                            }
                            setSavingPinUserId(u.id);
                            setPinActionErr('');
                            setPinActionMsg('');
                            try {
                              const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}/pin`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${authToken}`,
                                },
                                credentials: 'same-origin',
                                body: JSON.stringify({ pin: cleanPin }),
                              });
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                throw new Error(data.error || 'Failed to update user PIN');
                              }
                              setUserPinDrafts((prev) => ({ ...prev, [u.id]: '' }));
                              setPinActionMsg(`Login PIN updated & encrypted for ${u.name}!`);
                            } catch (err) {
                              setPinActionErr(err instanceof Error ? err.message : 'Failed to update PIN');
                            } finally {
                              setSavingPinUserId(null);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSaving ? 'Saving...' : 'Save PIN'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ADMIN LIVE MAP GPS TRACKER (LEAFLET) */}
      {activeStudioModule === 'gps_tracker' && (
      <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-4 sm:p-5 space-y-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-emerald-950 dark:text-white">Admin Live Moving GPS Map</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLiveGpsAutoRefresh((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition inline-flex items-center gap-1.5 ${
                liveGpsAutoRefresh
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-400 text-emerald-900 dark:text-emerald-200'
                  : 'bg-white dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${liveGpsAutoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              <span>{liveGpsAutoRefresh ? 'Live Stream ON (3s)' : 'Live Stream Paused'}</span>
            </button>
            <button
              type="button"
              onClick={() => void fetchGpsLocations(false)}
              disabled={isLoadingGps}
              className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGps ? 'animate-spin' : ''}`} />
              {isLoadingGps ? 'Locating...' : 'Refresh Map'}
            </button>
          </div>
        </div>
        <p className="text-xs text-emerald-800 dark:text-emerald-200">
          Real-time delivery-style live map tracking: samtang naglakaw o nagbiyahe ang user nga naka-allow ang Location, makita nimo direkta ang ilang pin nga naglihok sa mapa uban sa ilang trail ug speed.
        </p>

        {gpsError && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs">
            {gpsError}
          </div>
        )}

        <LiveGpsMap
          locations={gpsLocations}
          selectedUserId={selectedGpsUserId}
          onSelectUser={setSelectedGpsUserId}
          followSelected={followGpsUser}
          onToggleFollow={setFollowGpsUser}
          defaultAvatar={defaultAppIcon}
        />

        {gpsLocations.length === 0 ? (
          <div className="p-5 text-center text-emerald-700 dark:text-emerald-300 text-xs italic bg-emerald-50/50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
            No active GPS location pings recorded yet. Users broadcast live coordinates automatically when online and Location permission is allowed.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {gpsLocations.map((loc) => {
              const isSelected = loc.userId === selectedGpsUserId;
              const ageSec = Math.max(0, Math.floor((Date.now() - new Date(loc.updatedAt).getTime()) / 1000));
              const speedKmh = loc.speed != null && loc.speed > 0.4 ? Math.round(loc.speed * 3.6) : 0;
              return (
                <div
                  key={loc.userId}
                  onClick={() => {
                    setSelectedGpsUserId(loc.userId);
                    setFollowGpsUser(true);
                  }}
                  className={`cursor-pointer p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-100/90 dark:bg-emerald-800/70 border-amber-400 shadow-md ring-2 ring-amber-400/30'
                      : 'bg-emerald-50/70 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={loc.avatar || defaultAppIcon}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border-2 border-emerald-400 shrink-0 bg-emerald-950"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-emerald-950 dark:text-white flex items-center gap-1.5 truncate">
                        <span className="truncate">{loc.userName}</span>
                        {ageSec <= 90 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black uppercase shrink-0">
                            {speedKmh > 0 ? `${speedKmh} km/h` : 'LIVE'}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-emerald-800 dark:text-emerald-200 truncate">
                        {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} {loc.accuracy != null ? `· ±${Math.round(loc.accuracy)}m` : ''}
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                        Updated {ageSec < 8 ? 'just now' : ageSec < 60 ? `${ageSec}s ago` : new Date(loc.updatedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGpsUserId(loc.userId);
                        setFollowGpsUser(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[10px] font-extrabold inline-flex items-center gap-1 shadow-sm"
                      title="Follow user on Live Map"
                    >
                      <LocateFixed className="w-3 h-3" /> Follow
                    </button>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=17/${loc.lat}/${loc.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100"
                      title="Open in OpenStreetMap"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* 5. LIST OF USERS (DATA) */}
      {activeStudioModule === 'users' && (
      <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
            <h3 className="text-sm font-bold text-emerald-950 dark:text-white">List of Users (Data)</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportUsers}
              className="px-3 py-1.5 rounded-lg bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {renderFirebaseCloudSyncCard()}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newUserName.trim()) return;
            const cleanPin = newUserPin.trim();
            if (onAddUser) {
              onAddUser(newUserName.trim(), newUserPhone.trim(), cleanPin.length >= 4 ? cleanPin : undefined);
            } else {
              setUsersList([
                ...usersList,
                {
                  id: 'u_' + Date.now(),
                  name: newUserName.trim(),
                  phone: newUserPhone.trim() || 'Member',
                  status: 'approved',
                  loginDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
                },
              ]);
            }
            setNewUserName('');
            setNewUserPhone('');
            setNewUserPin('');
          }}
          className="grid grid-cols-1 sm:grid-cols-4 gap-2"
        >
          <input
            type="text"
            placeholder="User Full Name..."
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            className="p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
          />
          <input
            type="text"
            placeholder="Phone Number..."
            value={newUserPhone}
            onChange={(e) => setNewUserPhone(e.target.value)}
            className="p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
          />
          <input
            type="text"
            minLength={4}
            placeholder="Login PIN (min 4)..."
            value={newUserPin}
            onChange={(e) => setNewUserPin(e.target.value)}
            className="p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
          />
          <button type="submit" className="px-4 py-2 bg-emerald-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add User
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-emerald-200 dark:border-emerald-800">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] uppercase">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Login Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-200 dark:divide-emerald-800 bg-white dark:bg-emerald-950/50">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-emerald-50 dark:hover:bg-emerald-900/40">
                  <td className="p-3 font-mono text-emerald-700 dark:text-emerald-300">{u.id}</td>
                  <td className="p-3 font-bold text-emerald-950 dark:text-white">{u.name}</td>
                  <td className="p-3 font-mono text-emerald-900 dark:text-slate-200">{u.phone}</td>
                  <td className="p-3 text-emerald-700 dark:text-emerald-300">{u.loginDate}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'admin' || u.phone === '09361223978' || u.phone === 'choycounterflow@gmail.com'
                          ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      {u.role === 'admin' || u.phone === '09361223978' || u.phone === 'choycounterflow@gmail.com' ? 'Admin' : 'Active'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {u.role !== 'admin' && u.phone !== '09361223978' && u.phone !== 'choycounterflow@gmail.com' ? (
                      confirmDeleteUserId === u.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={deletingUserIds.includes(u.id)}
                            onClick={() => {
                              setConfirmDeleteUserId(null);
                              if (onDeleteUser) {
                                onDeleteUser(u.id);
                              } else {
                                setUsersList(usersList.filter((item) => item.id !== u.id));
                              }
                            }}
                            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold transition disabled:opacity-50"
                          >
                            {deletingUserIds.includes(u.id) ? 'Deleting...' : 'Confirm Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUserId(null)}
                            className="px-2 py-1 rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-semibold"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteUserId(u.id)}
                          className="px-2.5 py-1 rounded border border-rose-300 dark:border-rose-700/80 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 hover:bg-rose-600 hover:text-white font-semibold inline-flex items-center gap-1 transition"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Account</span>
                        </button>
                      )
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 px-1.5">
                        Protected
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* TOOLS & PRICING PLANS GUIDE (SPREADSHEET) */}
      {activeStudioModule === 'tools_guide' && (
      <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-emerald-950 dark:text-white">Choy Chat Tech Stack, Tools &amp; Pricing Spreadsheet</h3>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-800 dark:text-indigo-200 font-mono text-[10px] font-bold">
            Free &amp; Paid Tiers Explained
          </span>
        </div>
        <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
          Here is the complete breakdown of all tools, APIs, and infrastructure services utilized in Choy Chat, including their functions, pricing plans, and whether they have free or paid tiers. Tap <span className="font-bold underline">Show Instruction</span> to view step-by-step setup guides.
        </p>

        <div className="overflow-x-auto rounded-xl border border-emerald-200 dark:border-emerald-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] uppercase">
              <tr>
                <th className="p-3">Tool / Service</th>
                <th className="p-3">Category</th>
                <th className="p-3">Function / Purpose</th>
                <th className="p-3">Pricing Plan / Cost</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-200 dark:divide-emerald-800 bg-white dark:bg-emerald-950/50">
              {TOOLS_PRICING_GUIDE.map((tool) => {
                const isExpanded = expandedToolId === tool.id;
                return (
                  <React.Fragment key={tool.id}>
                    <tr className="hover:bg-emerald-50 dark:hover:bg-emerald-900/40 align-top">
                      <td className="p-3 font-bold text-emerald-950 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className={`w-3.5 h-3.5 shrink-0 ${tool.isPaid ? 'text-amber-500' : 'text-emerald-500'}`} />
                          <span>{tool.name}</span>
                        </div>
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          {tool.isPaid ? 'Free & Paid Tiers' : '100% Free'}
                        </span>
                      </td>
                      <td className="p-3 text-emerald-700 dark:text-emerald-300 font-medium">{tool.category}</td>
                      <td className="p-3 text-emerald-900 dark:text-slate-200 max-w-xs">{tool.purpose}</td>
                      <td className="p-3 font-mono text-emerald-800 dark:text-cyan-300 max-w-xs">{tool.pricing}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setExpandedToolId(isExpanded ? null : tool.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-bold text-[11px] inline-flex items-center gap-1 hover:bg-emerald-200 transition"
                        >
                          <span>{isExpanded ? 'Hide Instruction' : 'Show Instruction'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-emerald-50/70 dark:bg-emerald-950/80">
                        <td colSpan={5} className="p-4 space-y-2 border-t border-emerald-200 dark:border-emerald-800">
                          <div className="font-bold text-emerald-950 dark:text-white flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Setup Instruction &amp; Guide for {tool.name}:</span>
                          </div>
                          <pre className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-800 text-[11px] font-mono text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap leading-relaxed">
                            {tool.instruction}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};
