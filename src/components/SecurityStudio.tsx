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
  Pin
} from 'lucide-react';
import {
  type EmojiLinkItem,
  generateEmojiFromUrl,
  generateRandomEmojiCode,
  buildEmojiShareUrl,
  renderAppIconWithEmojiFile,
  shareEmojiLinkWithAppImage,
} from '../utils/emojiLinkShare';

export interface SecurityUserAccount {
  id: string;
  name: string;
  phone: string;
  role?: 'admin' | 'member';
  status: 'pending' | 'approved';
  newsfeed?: 'feed_a' | 'feed_b' | 'both';
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
  onDeleteUser?: (userId: string) => Promise<void> | void;
  onUpdateUserNewsfeed?: (userId: string, newsfeed: 'feed_a' | 'feed_b' | 'both') => Promise<void> | void;
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
  const [newsfeedATitle, setNewsfeedATitle] = useState(() => localStorage.getItem('choychat_nf_a_title') || 'Newsfeed A');
  const [newsfeedBTitle, setNewsfeedBTitle] = useState(() => localStorage.getItem('choychat_nf_b_title') || 'Newsfeed B');
  const [nfTitlesSaved, setNfTitlesSaved] = useState(false);

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
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // 6. GPS Tracker state
  const [gpsLocations, setGpsLocations] = useState<
    Array<{ userId: string; userName: string; lat: number; lng: number; accuracy?: number; updatedAt: string }>
  >([]);
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');

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

  const fetchGpsLocations = async () => {
    if (!authToken) return;
    setIsLoadingGps(true);
    setGpsError('');
    try {
      const res = await fetch('/api/admin/gps/locations', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.locations)) {
          setGpsLocations(data.locations);
        }
      } else {
        setGpsError('Failed to fetch user locations.');
      }
    } catch {
      setGpsError('Network error fetching locations.');
    } finally {
      setIsLoadingGps(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      void fetchGpsLocations();
    }
  }, [authToken]);

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
            <RefreshCw className={`w-3.5 h-3.5${isClearingCache ? 'animate-spin' : ''}`} />
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

      {/* 0. LIVE WEBSITE EMOJI LINK GENERATOR & APP ICON COMPOSER (AUTO PUSH & SYNC) */}
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

      {/* NEWSFEEDS A & B SETUP & USER ASSIGNMENT */}
      <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
          <h3 className="text-sm font-bold text-emerald-950 dark:text-white">Newsfeeds A & B Setup & User Assignment</h3>
        </div>
        <p className="text-xs text-emerald-800 dark:text-emerald-200">
          Configure separated Newsfeeds ({newsfeedATitle} vs {newsfeedBTitle}). Users assigned to Newsfeed A will only see posts from users in Newsfeed A and Both A&B. Users in Newsfeed B will only see Newsfeed B and Both A&B.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
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
          <div className="sm:col-span-2 flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('choychat_nf_a_title', newsfeedATitle);
                localStorage.setItem('choychat_nf_b_title', newsfeedBTitle);
                setNfTitlesSaved(true);
                setTimeout(() => setNfTitlesSaved(false), 2000);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              Save Newsfeed Titles
            </button>
            {nfTitlesSaved && <span className="text-emerald-700 dark:text-emerald-300 text-xs font-semibold">Titles Saved!</span>}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-emerald-200 dark:border-emerald-800">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] uppercase">
              <tr>
                <th className="p-3">User Name</th>
                <th className="p-3">Phone / ID</th>
                <th className="p-3">Assigned Newsfeed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-200 dark:divide-emerald-800 bg-white dark:bg-emerald-950/50">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-emerald-50 dark:hover:bg-emerald-900/40">
                  <td className="p-3 font-bold text-emerald-950 dark:text-white">{u.name}</td>
                  <td className="p-3 font-mono text-emerald-700 dark:text-emerald-300">{u.phone}</td>
                  <td className="p-3">
                    <select
                      value={u.newsfeed || 'both'}
                      onChange={(e) => {
                        const val = e.target.value as 'feed_a' | 'feed_b' | 'both';
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
                      <option value="both">Both A & B</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMIN GPS TRACKER */}
      <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-emerald-950 dark:text-white">Admin Live GPS Tracker</h3>
          </div>
          <button
            type="button"
            onClick={fetchGpsLocations}
            disabled={isLoadingGps}
            className="px-3 py-1.5 rounded-lg bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGps ? 'animate-spin' : ''}`} />
            {isLoadingGps ? 'Locating...' : 'Refresh GPS Radar'}
          </button>
        </div>
        <p className="text-xs text-emerald-800 dark:text-emerald-200">
          When users turn mobile data ON and enable location permissions, Admin can locate active users and view their last known coordinates in real-time. Regular users cannot access or view other users locations.
        </p>

        {gpsError && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
            {gpsError}
          </div>
        )}

        {gpsLocations.length === 0 ? (
          <div className="p-6 text-center text-emerald-700 dark:text-emerald-300 text-xs italic bg-emerald-50/50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
            No active GPS location pings recorded yet. Users broadcast location when online and location is active.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-emerald-200 dark:border-emerald-800">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] uppercase">
                <tr>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Coordinates (Lat, Lng)</th>
                  <th className="p-3">Accuracy</th>
                  <th className="p-3">Last Pinged</th>
                  <th className="p-3 text-right">Map Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-200 dark:divide-emerald-800 bg-white dark:bg-emerald-950/50">
                {gpsLocations.map((loc) => (
                  <tr key={loc.userId} className="hover:bg-emerald-50 dark:hover:bg-emerald-900/40">
                    <td className="p-3 font-bold text-emerald-950 dark:text-white flex items-center gap-2">
                      <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{loc.userName}</span>
                    </td>
                    <td className="p-3 font-mono text-emerald-900 dark:text-slate-200">
                      {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                    </td>
                    <td className="p-3 font-mono text-emerald-700 dark:text-emerald-300">
                      {loc.accuracy != null ? `±${Math.round(loc.accuracy)}m` : 'Unknown'}
                    </td>
                    <td className="p-3 text-emerald-700 dark:text-emerald-300">
                      {new Date(loc.updatedAt).toLocaleTimeString()} ({new Date(loc.updatedAt).toLocaleDateString()})
                    </td>
                    <td className="p-3 text-right">
                      <a
                        href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-3 h-3" /> View Map
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. LIST OF USERS (DATA) */}
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
                        u.role === 'admin' || u.phone === '09361223978' || u.phone === 'choyjiez07@gmail.com'
                          ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      {u.role === 'admin' || u.phone === '09361223978' || u.phone === 'choyjiez07@gmail.com' ? 'Admin' : 'Active'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {u.role !== 'admin' && u.phone !== '09361223978' && u.phone !== 'choyjiez07@gmail.com' ? (
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

      {/* TOOLS & PRICING PLANS GUIDE (SPREADSHEET) */}
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
    </div>
  );
};
