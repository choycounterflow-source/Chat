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
  Download
} from 'lucide-react';

export interface SecurityUserAccount {
  id: string;
  name: string;
  phone: string;
  status: 'pending' | 'approved';
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
  onAddUser?: (name: string, phone: string) => Promise<void> | void;
  onToggleUserStatus?: (user: SecurityUserAccount) => Promise<void> | void;
  onDeleteUser?: (userId: string) => Promise<void> | void;
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
}

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
  onToggleUserStatus,
  onDeleteUser,
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

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const approvedCount = usersList.filter((u) => u.status === 'approved').length;
  const pendingCount = usersList.filter((u) => u.status === 'pending').length;
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
        <button
          type="button"
          onClick={handleClearAppCache}
          disabled={isClearingCache}
          className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 flex items-center gap-2 shadow transition disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5${isClearingCache ? 'animate-spin' : ''}`} />
          {isClearingCache ? 'Clearing Cache...' : 'Clear App Cache'}
        </button>
      </div>

      {cacheStatus && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 flex items-center justify-between">
          <span>{cacheStatus}</span>
          <button type="button" onClick={() => setCacheStatus('')} className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* 1. DIRECT LINKS: RENDER DOCKER & AI STUDIO */}
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

      {/* 2. SIMPLE ALL-IN-ONE KEYS SETUP (NO CLUTTER, DIRECT "GET KEY" LINKS) */}
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
      </div>

      {/* 3. ANALYTICS OVERVIEW */}
      <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
          <h3 className="text-sm font-bold text-emerald-950 dark:text-white">App Analytics</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase">Users</div>
            <div className="text-xl font-black text-emerald-950 dark:text-white font-mono">{usersList.length}</div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400">{approvedCount} active / {pendingCount} pending</div>
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

      {/* 4. STORAGE MONITORING (SUPABASE CLOUD STORAGE + CACHE) */}
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
            <div className="text-[11px] font-mono text-emerald-300/90 tabular-nums">
              <span>Status: {mediaStorageMode === 'supabase' ? 'Supabase Storage Connected' : 'Inline Fallback'}</span>
              <span aria-hidden="true"> · </span>
              <span>DB: {storageMode === 'postgres' ? 'PostgreSQL Live' : 'Memory'}</span>
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
      </div>

      {/* 5. LIST OF USERS (DATA) */}
      <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
            <h3 className="text-sm font-bold text-emerald-950 dark:text-white">List of Users (Data)</h3>
          </div>
          <button
            type="button"
            onClick={handleExportUsers}
            className="px-3 py-1.5 rounded-lg bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newUserName.trim()) return;
            if (onAddUser) {
              onAddUser(newUserName.trim(), newUserPhone.trim());
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
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
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
                        u.status === 'approved'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onToggleUserStatus) {
                          onToggleUserStatus(u);
                        } else {
                          setUsersList(
                            usersList.map((item) =>
                              item.id === u.id ? { ...item, status: item.status === 'approved' ? 'pending' : 'approved' } : item
                            )
                          );
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-700 font-semibold"
                    >
                      {u.status === 'approved' ? 'Set Pending' : 'Approve'}
                    </button>
                    {u.phone !== '09361223978' && u.phone !== 'choyjiez07@gmail.com' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onDeleteUser) {
                            onDeleteUser(u.id);
                          } else {
                            setUsersList(usersList.filter((item) => item.id !== u.id));
                          }
                        }}
                        className="p-1 text-red-400 hover:text-red-200 align-middle"
                        title="Remove User"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
