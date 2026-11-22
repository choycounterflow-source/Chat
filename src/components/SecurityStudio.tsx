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
  renderLiveApp: 'https://chat-1-5b9f.onrender.com',
  renderNewDeploy: 'https://dashboard.render.com/select-repo?type=web',
  googleOneStorage: 'https://one.google.com/storage',
};

const STORAGE_KEYS = {
  mainKeys: 'choychat_admin_simple_keys_v1',
  customKeys: 'choychat_admin_custom_kv_v1',
  links: 'choychat_admin_render_links_v1',
  storageProfile: 'choychat_admin_storage_v1',
};

interface MainKeysConfig {
  APP_URL: string;
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_BUCKET: string;
}

const AUTO_DOCKER_DEFAULTS = [
  'NODE_ENV=production',
  'PORT=10000',
  'HOST=0.0.0.0',
  'DISABLE_HMR=true',
];

export const SecurityStudio: React.FC<SecurityStudioProps> = ({
  usersList,
  setUsersList,
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

  // 2. Simple Unified Keys (Exact checklist of variables to fill up)
  const [mainKeys, setMainKeys] = useState<MainKeysConfig>(() => {
    const defaults: MainKeysConfig = {
      APP_URL: 'https://chat-1-5b9f.onrender.com',
      GEMINI_API_KEY: '',
      SUPABASE_URL: '',
      SUPABASE_ANON_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      SUPABASE_BUCKET: 'choychat-media',
    };
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.mainKeys);
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return defaults;
  });
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
  const [googleOneAccount, setGoogleOneAccount] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.storageProfile);
      return saved ? JSON.parse(saved) : { email: 'choyjiez07@gmail.com', totalTb: 5, folderUrl: 'https://drive.google.com' };
    } catch {
      return { email: 'choyjiez07@gmail.com', totalTb: 5, folderUrl: 'https://drive.google.com' };
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
    localStorage.setItem(STORAGE_KEYS.storageProfile, JSON.stringify(googleOneAccount));
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
      id: 'APP_URL',
      label: 'Live App URL',
      hint: 'Naka-fill up na (imong Render link)',
      secret: false,
      placeholder: 'https://chat-1-5b9f.onrender.com',
    },
    {
      id: 'GEMINI_API_KEY',
      label: 'Gemini API Key',
      hint: 'Para sa AI features — pindota ang "Get Key" para makuha libre sa AI Studio',
      secret: true,
      placeholder: 'AIza...',
      getLink: { label: 'Get Key', url: 'https://aistudio.google.com/apikey' },
    },
    {
      id: 'SUPABASE_URL',
      label: 'Supabase Project URL',
      hint: 'Kuhaa sa Supabase -> Project Settings -> API',
      secret: false,
      placeholder: 'https://xxxx.supabase.co',
      getLink: { label: 'Open Supabase', url: 'https://supabase.com/dashboard' },
    },
    {
      id: 'SUPABASE_ANON_KEY',
      label: 'Supabase Anon Key',
      hint: 'Public anon key gikan sa Supabase -> API',
      secret: true,
      placeholder: 'eyJ...',
    },
    {
      id: 'SUPABASE_SERVICE_ROLE_KEY',
      label: 'Supabase Secret Key',
      hint: 'Service role / secret key (Admin only)',
      secret: true,
      placeholder: 'sbp_... / eyJ...',
    },
    {
      id: 'SUPABASE_BUCKET',
      label: 'Supabase Storage Bucket',
      hint: 'Naka-fill up na (bucket name para sa images/videos)',
      secret: false,
      placeholder: 'choychat-media',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-6 text-xs">
      {/* HEADER */}
      <div className="bg-emerald-900/70 border border-emerald-500/40 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wide">Security Studio</h2>
            <p className="text-[11px] text-emerald-300">Simple Admin Hub — Render Docker, AI Studio, Keys, Storage & Cache</p>
          </div>
        </div>
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

      {cacheStatus && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 flex items-center justify-between">
          <span>{cacheStatus}</span>
          <button type="button" onClick={() => setCacheStatus('')} className="text-emerald-300 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* 1. DIRECT LINKS: RENDER DOCKER & AI STUDIO */}
      <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-cyan-300" />
            <h3 className="text-sm font-bold text-white">Quick Links (Render Docker & AI Studio)</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-mono text-[10px] font-bold">
              Docker Ready
            </span>
            <button
              type="button"
              onClick={() => setEditingLinks(!editingLinks)}
              className="px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-200 hover:text-white text-[11px] font-semibold"
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
              icon: <Sparkles className="w-4 h-4 text-cyan-300" />,
              btnColor: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
            },
            {
              key: 'renderDashboard',
              title: 'Render Dashboard',
              subtitle: 'Manage imong Render app & logs',
              url: adminLinks.renderDashboard,
              icon: <Cloud className="w-4 h-4 text-emerald-300" />,
              btnColor: 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
            },
            {
              key: 'renderLiveApp',
              title: 'Render Live App URL',
              subtitle: 'Imong live website link sa Render',
              url: adminLinks.renderLiveApp,
              icon: <Globe className="w-4 h-4 text-indigo-300" />,
              btnColor: 'bg-indigo-500 text-white hover:bg-indigo-400',
            },
            {
              key: 'renderNewDeploy',
              title: 'Deploy / Sync to Render',
              subtitle: 'Pilia imong GitHub repo + Docker',
              url: adminLinks.renderNewDeploy,
              icon: <ExternalLink className="w-4 h-4 text-amber-300" />,
              btnColor: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
            },
          ].map((item) => (
            <div key={item.key} className="p-3.5 rounded-xl bg-emerald-950 border border-emerald-800 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-white">
                  {item.icon}
                  <span>{item.title}</span>
                </div>
                <p className="text-[11px] text-emerald-300">{item.subtitle}</p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 py-2 px-3 rounded-lg font-bold text-center flex items-center justify-center gap-1.5 transition ${item.btnColor}`}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(item.key, item.url)}
                  className="py-2 px-3 rounded-lg bg-emerald-900 border border-emerald-700 text-emerald-200 hover:text-white flex items-center gap-1 font-semibold"
                >
                  {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === item.key ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {editingLinks && (
          <form onSubmit={handleSaveLinks} className="p-4 rounded-xl bg-emerald-950 border border-cyan-500/40 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-emerald-300 mb-1">AI Studio Chat Link</label>
                <input
                  type="url"
                  value={adminLinks.aiStudioChat}
                  onChange={(e) => setAdminLinks({ ...adminLinks, aiStudioChat: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-emerald-700 rounded-lg text-white font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-emerald-300 mb-1">Render Live App URL</label>
                <input
                  type="url"
                  value={adminLinks.renderLiveApp}
                  onChange={(e) => setAdminLinks({ ...adminLinks, renderLiveApp: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-emerald-700 rounded-lg text-white font-mono text-[11px]"
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
      <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-300" />
            <div>
              <h3 className="text-sm font-bold text-white">Simple Keys Setup (Render + Supabase + AI)</h3>
              <p className="text-[11px] text-emerald-300">
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
            return (
              <div key={field.id} className="p-3 bg-emerald-950 border border-emerald-800 rounded-xl space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/25 text-indigo-200 font-mono font-bold text-[10px]">
                      {field.id}
                    </span>
                    <span className="font-bold text-white">{field.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        hasVal ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {hasVal ? 'Ready' : 'To Fill'}
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
                    className="flex-1 p-2 bg-slate-950 border border-emerald-800 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-emerald-400"
                  />
                  {field.secret && (
                    <button
                      type="button"
                      onClick={() => setRevealedFields({ ...revealedFields, [field.id]: !revealedFields[field.id] })}
                      className="p-2 rounded-lg bg-emerald-900 text-emerald-200 hover:text-white"
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
              <div className="text-[10px] uppercase font-bold text-emerald-300">Extra Custom Keys</div>
              {customPairs.map((kv) => (
                <div key={kv.id} className="p-2.5 bg-emerald-950 border border-emerald-800 rounded-xl flex items-center justify-between gap-2">
                  <div className="font-mono text-[11px] truncate">
                    <span className="text-indigo-300 font-bold">{kv.key}</span>
                    <span className="text-slate-400"> = </span>
                    <span className="text-white">{kv.secret ? '••••••••' : kv.value}</span>
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
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl shadow flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Keys
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="px-3 py-2 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-200 hover:text-white font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom Key
              </button>
              <button
                type="button"
                onClick={() => setShowAutoDocker(!showAutoDocker)}
                className="px-3 py-2 rounded-xl bg-emerald-950 border border-emerald-700 text-slate-300 hover:text-white text-[11px]"
              >
                {showAutoDocker ? 'Hide Auto Settings' : 'Auto Docker Settings'}
              </button>
            </div>
          </div>
        </form>

        {showAddCustom && (
          <form onSubmit={handleAddCustomKey} className="p-3.5 rounded-xl bg-emerald-950 border border-indigo-500/40 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <input
              type="text"
              placeholder="KEY_NAME"
              value={newKvKey}
              onChange={(e) => setNewKvKey(e.target.value)}
              className="sm:col-span-4 p-2 bg-slate-950 border border-emerald-700 rounded-lg text-white font-mono"
            />
            <input
              type={newKvSecret ? 'password' : 'text'}
              placeholder="Value..."
              value={newKvVal}
              onChange={(e) => setNewKvVal(e.target.value)}
              className="sm:col-span-5 p-2 bg-slate-950 border border-emerald-700 rounded-lg text-white font-mono"
            />
            <label className="sm:col-span-1 flex items-center gap-1 text-[10px] text-emerald-200">
              <input type="checkbox" checked={newKvSecret} onChange={(e) => setNewKvSecret(e.target.checked)} />
              Hide
            </label>
            <button type="submit" className="sm:col-span-2 py-2 bg-indigo-500 text-white font-bold rounded-lg">
              Add
            </button>
          </form>
        )}

        {showAutoDocker && (
          <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-800 space-y-1">
            <div className="text-[10px] font-bold text-emerald-300 uppercase">Auto-configured inside Dockerfile (no need to touch)</div>
            <pre className="text-[11px] font-mono text-slate-300">{AUTO_DOCKER_DEFAULTS.join('\n')}</pre>
          </div>
        )}
      </div>

      {/* 3. ANALYTICS OVERVIEW */}
      <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-300" />
          <h3 className="text-sm font-bold text-white">App Analytics</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800">
            <div className="text-[10px] text-emerald-300 uppercase">Users</div>
            <div className="text-xl font-black text-white font-mono">{usersList.length}</div>
            <div className="text-[10px] text-emerald-400">{approvedCount} active / {pendingCount} pending</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800">
            <div className="text-[10px] text-emerald-300 uppercase">Blocked</div>
            <div className="text-xl font-black text-red-400 font-mono">{blockedUsers.length}</div>
            <div className="text-[10px] text-slate-400">Filtered</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800">
            <div className="text-[10px] text-emerald-300 uppercase">Posts</div>
            <div className="text-xl font-black text-white font-mono">{postsCount}</div>
            <div className="text-[10px] text-cyan-300">{mediaPostsCount} media</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800">
            <div className="text-[10px] text-emerald-300 uppercase">Messages</div>
            <div className="text-xl font-black text-white font-mono">{messagesCount}</div>
            <div className="text-[10px] text-cyan-300">{mediaMessagesCount} media</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800">
            <div className="text-[10px] text-emerald-300 uppercase">Ledger</div>
            <div className="text-xl font-black text-white font-mono">{ledgerCount}</div>
            <div className="text-[10px] text-amber-300">₱{ledgerTotalValue.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800">
            <div className="text-[10px] text-emerald-300 uppercase">AI Brain</div>
            <div className="text-xl font-black text-cyan-300 font-mono">{knowledgeCount}</div>
            <div className="text-[10px] text-slate-400">Q&A items</div>
          </div>
        </div>
      </div>

      {/* 4. STORAGE MONITORING (GOOGLE ONE 5TB + CACHE) */}
      <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-300" />
            <h3 className="text-sm font-bold text-white">Storage Monitoring (Google One 5TB)</h3>
          </div>
          <a
            href={adminLinks.googleOneStorage}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-200 hover:text-white flex items-center gap-1.5 font-semibold"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Google One 5TB
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form onSubmit={handleSaveStorageProfile} className="p-4 rounded-xl bg-emerald-950 border border-emerald-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Google One Vault</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                {googleOneAccount.totalTb} TB
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-emerald-800">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 w-[3%]" />
            </div>
            <div className="flex justify-between text-[10px] text-emerald-300">
              <span>Media files: {totalMediaItems}</span>
              <span>Capacity: {(googleOneAccount.totalTb * 1024).toLocaleString()} GB</span>
            </div>
            <div className="space-y-2">
              <input
                type="email"
                value={googleOneAccount.email}
                onChange={(e) => setGoogleOneAccount({ ...googleOneAccount, email: e.target.value })}
                className="w-full p-2 bg-slate-950 border border-emerald-700 rounded-lg text-white text-xs"
                placeholder="Google One Email"
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  value={googleOneAccount.folderUrl}
                  onChange={(e) => setGoogleOneAccount({ ...googleOneAccount, folderUrl: e.target.value })}
                  className="flex-1 p-2 bg-slate-950 border border-emerald-700 rounded-lg text-white font-mono text-[11px]"
                  placeholder="Google Drive Folder URL"
                />
                <a
                  href={googleOneAccount.folderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg bg-emerald-800 text-white font-bold flex items-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button type="submit" className="px-3 py-1.5 rounded-lg bg-emerald-400 text-slate-950 font-bold">
                Save Storage
              </button>
              {storageSaved && <span className="text-emerald-300 text-[11px] font-semibold">Saved!</span>}
            </div>
          </form>

          <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Local App Cache</span>
                <button
                  type="button"
                  onClick={refreshStorageStats}
                  className="text-emerald-300 hover:text-white flex items-center gap-1 text-[10px]"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-emerald-800">
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.max(2, browserPercent)}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-emerald-800/80">
                  <div className="text-[10px] text-emerald-300">Used</div>
                  <div className="font-mono font-bold text-white">{formatBytes(storageEstimate.usageBytes)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-emerald-800/80">
                  <div className="text-[10px] text-emerald-300">Quota</div>
                  <div className="font-mono font-bold text-white">{formatBytes(storageEstimate.quotaBytes)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-emerald-800/80">
                  <div className="text-[10px] text-emerald-300">Cache Buckets</div>
                  <div className="font-mono font-bold text-amber-300">{cacheCount}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-emerald-800/80">
                  <div className="text-[10px] text-emerald-300">Config Size</div>
                  <div className="font-mono font-bold text-cyan-300">{localStorageKb} KB</div>
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
      <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-300" />
            <h3 className="text-sm font-bold text-white">List of Users (Data)</h3>
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
            if (!newUserName.trim() || !newUserPhone.trim()) return;
            setUsersList([
              ...usersList,
              {
                id: 'u_' + Date.now(),
                name: newUserName.trim(),
                phone: newUserPhone.trim(),
                status: 'approved',
                loginDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
              },
            ]);
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
            className="p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
          />
          <input
            type="text"
            placeholder="Phone Number..."
            value={newUserPhone}
            onChange={(e) => setNewUserPhone(e.target.value)}
            className="p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
          />
          <button type="submit" className="px-4 py-2 bg-emerald-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add User
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-emerald-800">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead className="bg-emerald-950 text-emerald-300 text-[10px] uppercase">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Login Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-800 bg-emerald-950/50">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-emerald-900/40">
                  <td className="p-3 font-mono text-emerald-300">{u.id}</td>
                  <td className="p-3 font-bold text-white">{u.name}</td>
                  <td className="p-3 font-mono text-slate-200">{u.phone}</td>
                  <td className="p-3 text-emerald-300">{u.loginDate}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        setUsersList(
                          usersList.map((item) =>
                            item.id === u.id ? { ...item, status: item.status === 'approved' ? 'pending' : 'approved' } : item
                          )
                        )
                      }
                      className="px-2.5 py-1 rounded bg-emerald-800 text-emerald-100 hover:bg-emerald-700 font-semibold"
                    >
                      {u.status === 'approved' ? 'Set Pending' : 'Approve'}
                    </button>
                    {u.phone !== '09361223978' && (
                      <button
                        type="button"
                        onClick={() => setUsersList(usersList.filter((item) => item.id !== u.id))}
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
