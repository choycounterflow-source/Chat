/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home,
  MessageSquare,
  Video,
  Users,
  Share2,
  Download,
  Trash2,
  Award,
  FileSpreadsheet,
  LogOut,
  Bot,
  Plus,
  Image as ImageIcon,
  Mic,
  ShieldCheck,
  Key,
  Sliders,
  Database,
  Search,
  PhoneCall,
  Camera,
  PhoneOff,
  Edit3,
  Sparkles,
  Cloud,
  Link2,
  Loader2,
  UserPlus,
  LogIn,
  ZoomIn,
  Square,
  Send,
  Eye,
  EyeOff,
  GitBranch,
  Sun,
  Moon,
  Monitor,
  Type,
  RotateCcw,
  X,
  User,
  Ban,
  Phone,
  Clock,
  MoreVertical,
  MicOff,
  VideoOff,
  RefreshCw,
  Bell,
  BellOff,
  Forward,
  Check,
  ArrowLeft,
  Music,
  MapPin,
  Copy,
  ExternalLink,
  Globe,
  Smile,
  Megaphone,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Palette
} from 'lucide-react';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  SecurityStudio,
  type StudioAnnouncementItem,
  type StudioAnnouncementTarget,
} from './components/SecurityStudio';
import { GitHubIntelligence } from './components/GitHubIntelligence';
import { ChatVideoPlayer } from './components/ChatVideoPlayer';
import { ImageZoomModal } from './components/ImageZoomModal';
import { useThemePreferences } from './hooks/useThemePreferences';
import { COLOR_THEME_LIST, THEME_PRESETS } from './themePresets';
import {
  type EmojiLinkItem,
  buildEmojiShareUrl,
  renderAppIconWithEmojiFile,
  shareEmojiLinkWithAppImage,
} from './utils/emojiLinkShare';
import type { User as FirebaseUser } from './firebase';
import {
  connectFirebaseGoogleAdmin,
  disconnectFirebaseGoogle,
  fetchSnapshotFromFirestore,
  isVerifiedAdminFirebaseUser,
  subscribeFirebaseAuth,
  syncSnapshotToFirestore,
  type CloudBackupSnapshot,
} from './services/firebaseCloudSync';

type SelectableNewsfeed = 'feed_a' | 'feed_b' | 'feed_c' | 'feed_bc';
type PostNewsfeed = SelectableNewsfeed | 'both';

interface CurrentUser {
  id: string;
  name: string;
  phone: string;
  role: 'admin' | 'member';
  status: 'pending' | 'approved';
  blockedUsers: string[];
  avatar?: string;
  newsfeed?: SelectableNewsfeed;
}

interface UserAccount {
  id: string;
  name: string;
  phone: string;
  role?: 'admin' | 'member';
  status: 'pending' | 'approved';
  avatar?: string;
  newsfeed?: SelectableNewsfeed;
  loginDate: string;
}

interface ViewedProfile {
  id?: string;
  name: string;
  role: 'admin' | 'member';
  phone?: string;
  loginDate?: string;
  avatar: string;
  newsfeed?: SelectableNewsfeed;
  isSelf: boolean;
}

interface Post {
  id: string;
  authorId: string;
  author: { name: string; handle: string; avatar: string };
  content: string;
  mediaUrl?: string;
  mediaType?: 'text' | 'image' | 'video';
  timestamp: string;
  category: 'feed' | 'myday' | 'video';
  newsfeed?: PostNewsfeed;
}

interface Message {
  id: string;
  senderId?: string;
  sender: string;
  receiver: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'text' | 'image' | 'video' | 'audio' | 'file';
  transcript?: string;
  time: string;
  createdAtMs: number;
  isMe?: boolean;
  reactions?: string[];
  isLocalOnly?: boolean;
  isQueuedOffline?: boolean;
}

interface QueuedOfflineMessage {
  localId: string;
  userId: string;
  senderName: string;
  roomId: string;
  text: string;
  mediaUrl?: string;
  mediaType: 'text' | 'image' | 'video' | 'audio' | 'file';
  transcript?: string;
  time: string;
  createdAtMs: number;
}

const OFFLINE_MSG_QUEUE_KEY = 'choychat_offline_msg_queue_v1';

function readOfflineMsgQueue(): QueuedOfflineMessage[] {
  try {
    const raw = localStorage.getItem(OFFLINE_MSG_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is QueuedOfflineMessage =>
        Boolean(item && typeof item.localId === 'string' && typeof item.userId === 'string' && typeof item.roomId === 'string')
    );
  } catch {
    return [];
  }
}

function writeOfflineMsgQueue(queue: QueuedOfflineMessage[]): void {
  try {
    localStorage.setItem(OFFLINE_MSG_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage quota errors
  }
}

interface LedgerRow {
  id: string;
  name: string;
  fiveH: number;
  fiveHType: 'blue' | 'red';
  bulig: number;
  point5: number;
  halfSack: number;
  oneSack: number;
  bal: number;
}

interface LeaderboardItem {
  id: string;
  name: string;
  total: number;
}

interface KnowledgeQA {
  id: string;
  question: string;
  answer: string;
}

interface IncomingCallPayload {
  callId: string;
  roomId: string;
  fromUserId: string;
  fromUserName: string;
  sdp: RTCSessionDescriptionInit;
}

interface RtcSignalPayload {
  type: 'offer' | 'answer' | 'ice' | 'hangup' | 'decline';
  callId: string;
  signalId?: string;
  seq?: number;
  roomId?: string;
  targetName?: string;
  fromUserId?: string;
  fromUserName?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

const DEFAULT_AVATAR = '/assets/aistudio/image_20261121_145253_f477cbfa.webp';
const CHAT_ROOMS = ['VIP Group', 'Choy Admin'] as const;

function getChannelsForNewsfeedClient(nf?: string): Set<'a' | 'b' | 'c'> {
  const v = (nf || '').trim().toLowerCase();
  if (v === 'feed_b') return new Set(['b']);
  if (v === 'feed_c') return new Set(['c']);
  if (v === 'feed_bc') return new Set(['b', 'c']);
  if (v === 'both') return new Set(['a', 'b', 'c']);
  return new Set(['a']);
}

function canClientUserSeeCandidate(
  viewer: { id: string; role: 'admin' | 'member'; newsfeed?: string } | null,
  candidate: { id: string; role?: 'admin' | 'member'; newsfeed?: string }
): boolean {
  if (!viewer) return false;
  if (viewer.role === 'admin') return true;
  if (candidate.id === viewer.id) return true;
  if (candidate.role === 'admin') return true;
  const vSet = getChannelsForNewsfeedClient(viewer.newsfeed);
  const cSet = getChannelsForNewsfeedClient(candidate.newsfeed);
  for (const ch of vSet) {
    if (cSet.has(ch)) return true;
  }
  return false;
}

const RTC_ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

function messageBelongsToRoom(m: Message, room: string, myName: string): boolean {
  const r = room.trim().toLowerCase();
  const me = myName.trim().toLowerCase();
  const sender = (m.sender || '').trim().toLowerCase();
  const receiver = (m.receiver || '').trim().toLowerCase();

  if (r === 'vip group') {
    return receiver === 'vip group';
  }
  if (!me) {
    return receiver === r;
  }
  return (receiver === r && sender === me) || (sender === r && receiver === me);
}

function getMessageRoomLabel(m: Message, myName: string): string {
  const receiver = (m.receiver || '').trim();
  const sender = (m.sender || '').trim();
  if (receiver.toLowerCase() === 'vip group') return 'VIP Group';
  const me = myName.trim().toLowerCase();
  if (me) {
    if (sender.toLowerCase() === me) return receiver || 'Direct Chat';
    if (receiver.toLowerCase() === me) return sender || 'Direct Chat';
  }
  return receiver || sender || 'VIP Group';
}

function messageMatchesFullText(m: Message, query: string, myName: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  const terms = trimmed.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const roomLabel = getMessageRoomLabel(m, myName);
  const haystack = [
    m.text || '',
    m.transcript || '',
    m.sender || '',
    m.receiver || '',
    roomLabel,
    m.mediaType && m.mediaType !== 'text' ? m.mediaType : '',
  ]
    .join(' ')
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightSearchMatches(text: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!text || !trimmed) return text;
  const rawTerms = [trimmed, ...trimmed.split(/\s+/)].filter((t) => t.length > 0);
  const uniqueTerms = Array.from(new Set(rawTerms.map((t) => t.toLowerCase())))
    .sort((a, b) => b.length - a.length)
    .map((t) => escapeRegExp(t));
  if (uniqueTerms.length === 0) return text;
  const regex = new RegExp(`(${uniqueTerms.join('|')})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <mark
        key={idx}
        className="bg-amber-300 dark:bg-amber-400 text-slate-950 font-bold rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
}

function formatIsoTime(iso?: string): string {
  if (!iso) return 'Just now';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function App() {
  // Appearance & Theme Preferences (Color Scheme, Light / Dark / System, Text Size, Reduce Motion)
  const {
    themeMode,
    resolvedTheme,
    colorTheme,
    fontScale,
    reducedMotion,
    setThemeMode,
    setColorTheme,
    toggleLightDark,
    setFontScale,
    setReducedMotion,
    resetAppearance
  } = useThemePreferences();

  const theme = THEME_PRESETS[colorTheme];

  const [msgBgMode, setMsgBgMode] = useState<'default' | 'black' | 'white'>(() => {
    try {
      const saved = localStorage.getItem('choychat_msg_bg_mode_v1');
      if (saved === 'black' || saved === 'white' || saved === 'default') return saved;
    } catch {
      // ignore storage errors
    }
    return 'default';
  });

  const selectMsgBgMode = useCallback((mode: 'default' | 'black' | 'white') => {
    setMsgBgMode(mode);
    try {
      localStorage.setItem('choychat_msg_bg_mode_v1', mode);
    } catch {
      // ignore storage errors
    }
  }, []);

  // Auth state (Bearer session token held strictly in JS/React memory)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [storageMode, setStorageMode] = useState<'postgres' | 'memory'>('memory');

  // Auth form fields
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [showAuthPin, setShowAuthPin] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [syncNotice, setSyncNotice] = useState('');
  const [appPermissions, setAppPermissions] = useState<{
    camera: 'prompt' | 'granted' | 'denied';
    music: 'prompt' | 'granted' | 'denied';
    location: 'prompt' | 'granted' | 'denied';
  }>({
    camera: 'prompt',
    music: 'prompt',
    location: 'prompt',
  });
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [showDashboardPermissionModal, setShowDashboardPermissionModal] = useState(false);
  const [permAttemptedOnce, setPermAttemptedOnce] = useState(false);
  const initialGpsRef = useRef<{ lat: number; lng: number; accuracy?: number } | null>(null);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseSyncState, setFirebaseSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [firebaseLastSyncedAt, setFirebaseLastSyncedAt] = useState<string | null>(null);
  const [firebaseSyncError, setFirebaseSyncError] = useState('');
  const firebaseInitialSyncUidRef = useRef<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<
    | 'feed'
    | 'profile'
    | 'messages'
    | 'ledger'
    | 'analytics'
    | 'admin_approvals'
    | 'admin_knowledge'
    | 'admin_prices'
    | 'admin_newsfeeds'
    | 'admin_security'
    | 'choyai'
    | 'github'
    | 'people'
    | 'videos'
  >('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Real Live WebRTC Video Call State & Refs
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'error'>('idle');
  const [callError, setCallError] = useState('');
  const [callPartnerName, setCallPartnerName] = useState('');
  const [callElapsedSec, setCallElapsedSec] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [callPeerOfflineHint, setCallPeerOfflineHint] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<{ callId: string; candidate: RTCIceCandidateInit }[]>([]);
  const processedRtcSignalIdsRef = useRef<Set<string>>(new Set());
  const lastRtcSeqRef = useRef<number>(0);
  const activeCallIdRef = useRef<string | null>(null);
  const callTargetNameRef = useRef<string>('');
  const callRoomIdRef = useRef<string>('VIP Group');
  const incomingCallRef = useRef<IncomingCallPayload | null>(null);
  const handleRtcSignalRef = useRef<(payload: RtcSignalPayload) => void>(() => {});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const initialMsgSyncDoneRef = useRef<boolean>(false);
  const [liveMsgBanner, setLiveMsgBanner] = useState<{ sender: string; room: string; preview: string } | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [pushPermission, setPushPermission] = useState<'unsupported' | 'default' | 'granted' | 'denied'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return 'unsupported';
    }
    return Notification.permission as 'default' | 'granted' | 'denied';
  });
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [pushBannerDismissed, setPushBannerDismissed] = useState(false);
  const pendingAutoAnswerCallIdRef = useRef<string | null>(null);

  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeQA[]>([]);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');

  const [unitPrices, setUnitPrices] = useState({
    fiveH: 50,
    bulig: 100,
    point5: 150,
    halfSack: 200,
    oneSack: 400
  });

  const [defaultQuantities, setDefaultQuantities] = useState({
    fiveH: 0,
    bulig: 0,
    point5: 0,
    halfSack: 0,
    oneSack: 0
  });

  const [pricesSavedMsg, setPricesSavedMsg] = useState(false);
  const [qtySavedMsg, setQtySavedMsg] = useState(false);

  const [aiChatInput, setAiChatInput] = useState('');
  const [isChoyAIThinking, setIsChoyAIThinking] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const choyAiTabEndRef = useRef<HTMLDivElement>(null);
  const choyAiPopupEndRef = useRef<HTMLDivElement>(null);

  const [isFriend, setIsFriend] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostMedia, setNewPostMedia] = useState('');
  const [newPostMediaName, setNewPostMediaName] = useState('');
  const [newPostType, setNewPostType] = useState<'text' | 'image' | 'video'>('text');
  const [newPostCategory, setNewPostCategory] = useState<'feed' | 'myday' | 'video'>('feed');
  const [newPostNewsfeed, setNewPostNewsfeed] = useState<SelectableNewsfeed>('feed_a');
  const [newsfeedConfig, setNewsfeedConfig] = useState<{ feedATitle: string; feedBTitle: string; feedCTitle: string }>(() => ({
    feedATitle: localStorage.getItem('choychat_nf_a_title') || 'Newsfeed A',
    feedBTitle: localStorage.getItem('choychat_nf_b_title') || 'Newsfeed B',
    feedCTitle: localStorage.getItem('choychat_nf_c_title') || 'Newsfeed C',
  }));
  const [adminNewsfeedFilter, setAdminNewsfeedFilter] = useState<'all' | SelectableNewsfeed>('all');
  const [adminNfTitleA, setAdminNfTitleA] = useState(() => localStorage.getItem('choychat_nf_a_title') || 'Newsfeed A');
  const [adminNfTitleB, setAdminNfTitleB] = useState(() => localStorage.getItem('choychat_nf_b_title') || 'Newsfeed B');
  const [adminNfTitleC, setAdminNfTitleC] = useState(() => localStorage.getItem('choychat_nf_c_title') || 'Newsfeed C');
  const [savingAdminNfTitles, setSavingAdminNfTitles] = useState(false);
  const [adminNfSaved, setAdminNfSaved] = useState(false);
  const [adminNfUserSearch, setAdminNfUserSearch] = useState('');
  const [isProcessingPostMedia, setIsProcessingPostMedia] = useState(false);
  const [announcements, setAnnouncements] = useState<StudioAnnouncementItem[]>([]);
  const [bannerSlideIndex, setBannerSlideIndex] = useState(0);
  const [bannerPaused, setBannerPaused] = useState(false);
  const [securityInitialModule, setSecurityInitialModule] = useState<'home' | 'announcements'>('home');

  useEffect(() => {
    setAdminNfTitleA(newsfeedConfig.feedATitle);
    setAdminNfTitleB(newsfeedConfig.feedBTitle);
    setAdminNfTitleC(newsfeedConfig.feedCTitle);
  }, [newsfeedConfig]);
  const postFileInputRef = useRef<HTMLInputElement>(null);

  const [activeChat, setActiveChat] = useState<string>('VIP Group');
  const [activeChatMobileView, setActiveChatMobileView] = useState(false);
  const [pinnedChatRooms, setPinnedChatRooms] = useState<string[]>([]);

  useEffect(() => {
    if (!activeChat) return;
    setPinnedChatRooms((prev) => {
      const filtered = prev.filter((r) => r.toLowerCase() !== activeChat.toLowerCase());
      return [activeChat, ...filtered];
    });
  }, [activeChat]);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [galleryScope, setGalleryScope] = useState<'chat' | 'all'>('chat');
  const [selectedGalleryVideo, setSelectedGalleryVideo] = useState<Message | null>(null);
  const [cloudMessages, setCloudMessages] = useState<Message[]>([]);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<QueuedOfflineMessage[]>(() => readOfflineMsgQueue());
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isSyncingOfflineQueue, setIsSyncingOfflineQueue] = useState(false);
  const isFlushingQueueRef = useRef(false);
  const [chatHeadBubbleEnabled, setChatHeadBubbleEnabled] = useState<boolean>(() => {
    return localStorage.getItem('choychat_chat_head_bubble_v1') !== 'false';
  });
  const [activeChatHeadMessage, setActiveChatHeadMessage] = useState<Message | null>(null);
  const [chatHeadPos, setChatHeadPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('choychat_chat_head_pos_v1');
      if (saved) {
        const parsed = JSON.parse(saved) as { x?: unknown; y?: unknown };
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return { x: parsed.x, y: parsed.y };
        }
      }
    } catch {
      // ignore invalid saved coordinates
    }
    return null;
  });
  const [isDraggingChatHead, setIsDraggingChatHead] = useState(false);
  const chatHeadRef = useRef<HTMLDivElement | null>(null);
  const chatHeadDragRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    moved: boolean;
  }>({ active: false, pointerId: -1, startX: 0, startY: 0, originLeft: 0, originTop: 0, moved: false });
  const chatHeadJustDraggedRef = useRef(false);
  const lastSeenMsgIdRef = useRef<string>('');
  const [seenRoomMap, setSeenRoomMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('choychat_seen_rooms_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const queuedMessagesForUi: Message[] = currentUser
    ? offlineQueue
        .filter((q) => q.userId === currentUser.id)
        .map((q) => ({
          id: q.localId,
          senderId: q.userId,
          sender: q.senderName,
          receiver: q.roomId,
          text: q.text,
          mediaUrl: q.mediaUrl,
          mediaType: q.mediaType,
          transcript: q.transcript,
          time: q.time,
          createdAtMs: q.createdAtMs,
          isMe: true,
          reactions: [],
          isLocalOnly: true,
          isQueuedOffline: true,
        }))
    : [];

  const getLatestMessageForRoom = useCallback((room: string) => {
    const roomMsgs = [...cloudMessages, ...localMessages, ...queuedMessagesForUi].filter((m) =>
      messageBelongsToRoom(m, room, currentUser?.name || '')
    );
    if (roomMsgs.length === 0) return null;
    return roomMsgs[roomMsgs.length - 1];
  }, [cloudMessages, localMessages, queuedMessagesForUi, currentUser]);

  const markRoomSeen = useCallback((room: string) => {
    const latest = getLatestMessageForRoom(room);
    if (!latest) return;
    setSeenRoomMap((prev) => {
      if (prev[room] === latest.id) return prev;
      const next = { ...prev, [room]: latest.id };
      localStorage.setItem('choychat_seen_rooms_v1', JSON.stringify(next));
      return next;
    });
  }, [getLatestMessageForRoom]);

  useEffect(() => {
    if (activeChat) {
      markRoomSeen(activeChat);
    }
  }, [activeChat, markRoomSeen]);

  useEffect(() => {
    const clampToViewport = () => {
      setChatHeadPos((prev) => {
        if (!prev || typeof window === 'undefined') return prev;
        const rect = chatHeadRef.current?.getBoundingClientRect();
        const w = rect?.width || 280;
        const h = rect?.height || 72;
        const clampedX = Math.max(8, Math.min(window.innerWidth - w - 8, prev.x));
        const clampedY = Math.max(8, Math.min(window.innerHeight - h - 8, prev.y));
        if (clampedX === prev.x && clampedY === prev.y) return prev;
        return { x: clampedX, y: clampedY };
      });
    };
    clampToViewport();
    window.addEventListener('resize', clampToViewport);
    return () => window.removeEventListener('resize', clampToViewport);
  }, [activeChatHeadMessage?.id]);

  const [isHeadBubblePipOpen, setIsHeadBubblePipOpen] = useState(false);
  const headBubblePipWinRef = useRef<Window | null>(null);
  const isDocPipSupported =
    typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  const renderHeadBubbleIntoPip = useCallback(
    (pipWin: Window, msg: Message | null) => {
      try {
        const doc = pipWin.document;
        doc.title = 'Choy Chat · Headbubble';
        if (!doc.head.querySelector('#choy-pip-style')) {
          const style = doc.createElement('style');
          style.id = 'choy-pip-style';
          style.textContent = `
            * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
            body {
              margin: 0; padding: 10px;
              background: linear-gradient(135deg, #022c22 0%, #064e3b 60%, #0f172a 100%);
              color: #ffffff;
              display: flex; align-items: center; justify-content: center;
              min-height: 100vh;
            }
            .card {
              width: 100%; display: flex; align-items: center; gap: 10px;
              background: rgba(6, 78, 59, 0.9);
              border: 2px solid #fbbf24; border-radius: 16px; padding: 10px 12px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.45);
              cursor: pointer;
            }
            .avatar {
              width: 44px; height: 44px; border-radius: 9999px;
              object-fit: cover; border: 2px solid #fbbf24; flex-shrink: 0;
              background: #022c22;
            }
            .meta { flex: 1; min-width: 0; }
            .sender { font-size: 12px; font-weight: 800; color: #fcd34d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .text { font-size: 11px; color: #ecfdf5; margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            .btn {
              background: #34d399; color: #020617; border: 0; border-radius: 10px;
              padding: 7px 10px; font-size: 11px; font-weight: 800; cursor: pointer; flex-shrink: 0;
            }
            .btn:hover { background: #6ee7b7; }
          `;
          doc.head.appendChild(style);
        }

        doc.body.innerHTML = '';
        const card = doc.createElement('div');
        card.className = 'card';

        const img = doc.createElement('img');
        img.className = 'avatar';
        img.src = msg ? getUserAvatar({ name: msg.sender }) : DEFAULT_AVATAR;
        img.alt = '';

        const meta = doc.createElement('div');
        meta.className = 'meta';

        const senderEl = doc.createElement('div');
        senderEl.className = 'sender';
        senderEl.textContent = msg ? msg.sender : 'Choy Chat Headbubble';

        const textEl = doc.createElement('div');
        textEl.className = 'text';
        textEl.textContent = msg
          ? msg.text || 'Sent an attachment'
          : 'Always-on-top active. New messages pop up here.';

        meta.appendChild(senderEl);
        meta.appendChild(textEl);

        const openBtn = doc.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'btn';
        openBtn.textContent = msg ? 'Reply' : 'Open';
        openBtn.onclick = () => {
          try {
            window.focus();
          } catch {
            // ignore focus restrictions
          }
          if (msg && currentUser) {
            const room =
              msg.receiver.trim().toLowerCase() === 'vip group'
                ? 'VIP Group'
                : msg.sender === currentUser.name
                ? msg.receiver
                : msg.sender;
            setActiveChat(room);
          }
          setActiveTab('messages');
          setActiveChatHeadMessage(null);
        };

        card.onclick = () => openBtn.click();
        card.appendChild(img);
        card.appendChild(meta);
        card.appendChild(openBtn);
        doc.body.appendChild(card);
      } catch {
        // ignore if PiP window was closed
      }
    },
    [currentUser]
  );

  const openFloatingHeadBubbleWindow = useCallback(
    async (initialMsg?: Message | null) => {
      if (headBubblePipWinRef.current && !headBubblePipWinRef.current.closed) {
        renderHeadBubbleIntoPip(headBubblePipWinRef.current, initialMsg ?? activeChatHeadMessage);
        headBubblePipWinRef.current.focus();
        return;
      }
      const pipApi = (
        window as unknown as {
          documentPictureInPicture?: {
            requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>;
          };
        }
      ).documentPictureInPicture;

      if (!pipApi) {
        showNotice('Floating mini-window is only supported in Chrome/Edge Desktop. Use Enable Home-Screen Alerts for outside-the-app mobile popups.');
        return;
      }
      try {
        const pipWin = await pipApi.requestWindow({ width: 340, height: 120 });
        headBubblePipWinRef.current = pipWin;
        setIsHeadBubblePipOpen(true);
        renderHeadBubbleIntoPip(pipWin, initialMsg ?? activeChatHeadMessage);
        pipWin.addEventListener('pagehide', () => {
          if (headBubblePipWinRef.current === pipWin) {
            headBubblePipWinRef.current = null;
          }
          setIsHeadBubblePipOpen(false);
        });
      } catch {
        showNotice('Could not open floating outside-app window.');
      }
    },
    [activeChatHeadMessage, renderHeadBubbleIntoPip]
  );

  useEffect(() => {
    if (headBubblePipWinRef.current && !headBubblePipWinRef.current.closed) {
      renderHeadBubbleIntoPip(headBubblePipWinRef.current, activeChatHeadMessage);
    }
  }, [activeChatHeadMessage, renderHeadBubbleIntoPip]);

  useEffect(() => {
    if (!chatHeadBubbleEnabled || !currentUser) return;
    const allMsgs = [...cloudMessages, ...localMessages];
    if (allMsgs.length === 0) return;
    const latest = allMsgs[allMsgs.length - 1];
    if (!latest) return;

    const room = latest.receiver.trim().toLowerCase() === 'vip group' ? 'VIP Group' : (latest.sender === currentUser.name ? latest.receiver : latest.sender);
    const isViewingSameRoom =
      !document.hidden &&
      document.hasFocus() &&
      activeTab === 'messages' &&
      activeChat.trim().toLowerCase() === room.trim().toLowerCase();

    if (
      lastSeenMsgIdRef.current &&
      lastSeenMsgIdRef.current !== latest.id &&
      latest.sender !== currentUser.name &&
      !isViewingSameRoom
    ) {
      setActiveChatHeadMessage(latest);
      playMessageNotificationTune();

      if (headBubblePipWinRef.current && !headBubblePipWinRef.current.closed) {
        renderHeadBubbleIntoPip(headBubblePipWinRef.current, latest);
      }

      // Trigger an OS heads-up popup notification when the user is outside the app or tab
      if (
        (document.hidden || !document.hasFocus()) &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const previewBody = latest.text?.trim() || 'Sent an attachment';
        const senderAvatar = getUserAvatar({ name: latest.sender });
        const notifTitle = room === 'VIP Group' ? `${latest.sender} · VIP Group` : latest.sender;
        const notifTag = `choy-msg-${room}`;
        const openUrl = `/?openChat=${encodeURIComponent(room)}`;

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready
            .then((reg) =>
              reg.showNotification(notifTitle, {
                body: previewBody,
                icon: senderAvatar,
                badge: '/pwa-192x192.png',
                tag: notifTag,
                renotify: true,
                vibrate: [180, 100, 180],
                data: { kind: 'message', roomId: room, url: openUrl },
              } as NotificationOptions)
            )
            .catch(() => {});
        } else {
          try {
            const n = new Notification(notifTitle, {
              body: previewBody,
              icon: senderAvatar,
              tag: notifTag,
            });
            n.onclick = () => {
              window.focus();
              setActiveChat(room);
              setActiveTab('messages');
              n.close();
            };
          } catch {
            // ignore notification fallback errors
          }
        }
      }
    }
    if (!lastSeenMsgIdRef.current) {
      lastSeenMsgIdRef.current = latest.id;
    } else if (latest.id !== lastSeenMsgIdRef.current) {
      lastSeenMsgIdRef.current = latest.id;
    }
  }, [cloudMessages, localMessages, chatHeadBubbleEnabled, currentUser, activeTab, activeChat, renderHeadBubbleIntoPip]);
  const [msgInput, setMsgInput] = useState('');
  const [openReactionPickerMsgId, setOpenReactionPickerMsgId] = useState<string | null>(null);
  const [showMsgEmojiPicker, setShowMsgEmojiPicker] = useState(false);
  const [msgMediaType, setMsgMediaType] = useState<'text' | 'image' | 'video' | 'audio' | 'file'>('text');
  const [msgTranscript, setMsgTranscript] = useState('');
  const [msgMediaUrl, setMsgMediaUrl] = useState('');
  const [showMsgLinkInput, setShowMsgLinkInput] = useState(false);
  const [msgLinkDraft, setMsgLinkDraft] = useState('');
  const [msgLinkType, setMsgLinkType] = useState<'video' | 'image' | 'audio'>('video');
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [msgSearchScope, setMsgSearchScope] = useState<'all' | 'room'>('all');
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  useEffect(() => {
    setOpenReactionPickerMsgId(null);
    setShowMsgEmojiPicker(false);
  }, [activeChat]);

  useEffect(() => {
    if (!openReactionPickerMsgId) return;
    const handleClose = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-emoji-reaction-menu="true"]')) return;
      setOpenReactionPickerMsgId(null);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenReactionPickerMsgId(null);
    };
    document.addEventListener('mousedown', handleClose);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClose);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [openReactionPickerMsgId]);
  const msgFileInputRef = useRef<HTMLInputElement>(null);
  const msgImageInputRef = useRef<HTMLInputElement>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isUploadingMsgMedia, setIsUploadingMsgMedia] = useState(false);
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingActionRef = useRef<'attach' | 'send' | 'cancel'>('attach');

  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; caption?: string } | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastDrawPointRef = useRef<{ x: number; y: number } | null>(null);
  const [drawColor, setDrawColor] = useState('#10b981');
  const [drawWidth, setDrawWidth] = useState(5);
  const [editorUndoStack, setEditorUndoStack] = useState<string[]>([]);

  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [newLedgerName, setNewLedgerName] = useState('');

  const [isChoyAIPopupOpen, setIsChoyAIPopupOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [emojiLinks, setEmojiLinks] = useState<EmojiLinkItem[]>([]);
  const [activeEmojiLink, setActiveEmojiLink] = useState<EmojiLinkItem | null>(null);
  const [isAppIconShareModalOpen, setIsAppIconShareModalOpen] = useState(false);
  const [appIconShareNotice, setAppIconShareNotice] = useState('');
  const [securitySyncTick, setSecuritySyncTick] = useState(0);
  const [deletingUserIds, setDeletingUserIds] = useState<string[]>([]);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [showDeleteAccountSetup, setShowDeleteAccountSetup] = useState(false);
  const [deleteAccountPin, setDeleteAccountPin] = useState('');
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const [deleteAccountConfirmed, setDeleteAccountConfirmed] = useState(false);
  const [deletingMyAccount, setDeletingMyAccount] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<ViewedProfile | null>(null);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameEditError, setNameEditError] = useState('');
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardingTarget, setForwardingTarget] = useState<string | null>(null);
  const [forwardedTargets, setForwardedTargets] = useState<string[]>([]);
  const profileAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const soundCtxRef = useRef<AudioContext | null>(null);
  const syncSeqRef = useRef(0);
  const syncInFlightRef = useRef(false);
  const syncPendingRef = useRef(false);
  const sseConnectedRef = useRef(false);
  const syncFailureCountRef = useRef(0);
  const syncBackoffUntilRef = useRef(0);

  const [callRingtoneBlocked, setCallRingtoneBlocked] = useState(false);

  const getUnlockedAudioContext = useCallback((): AudioContext | null => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!soundCtxRef.current || soundCtxRef.current.state === 'closed') {
        soundCtxRef.current = new AudioCtx();
      }
      if (soundCtxRef.current.state === 'suspended') {
        void soundCtxRef.current.resume().catch(() => {});
      }
      return soundCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  const ensureAudioContextReady = useCallback(async (): Promise<AudioContext | null> => {
    const ctx = getUnlockedAudioContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Autoplay policy still blocking until user gesture
      }
    }
    if (ctx.state === 'running') {
      setCallRingtoneBlocked(false);
      return ctx;
    }
    return null;
  }, [getUnlockedAudioContext]);

  // Unlock Web Audio on first user interaction so message chimes & call ringtones always play audibly on mobile
  useEffect(() => {
    const unlock = () => {
      void ensureAudioContextReady();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [ensureAudioContextReady]);

  // Classic bright modern phone ringtone melody (two lively rings per cycle)
  const playSingleRingtoneBurst = useCallback(
    async (activeOscs?: Set<OscillatorNode>): Promise<boolean> => {
      try {
        const ctx = await ensureAudioContextReady();
        if (!ctx) {
          setCallRingtoneBlocked(true);
          return false;
        }
        const now = ctx.currentTime + 0.02;
        const pattern = [
          { freq: 784, start: 0.0, dur: 0.14 },
          { freq: 987.77, start: 0.14, dur: 0.14 },
          { freq: 1174.66, start: 0.28, dur: 0.16 },
          { freq: 987.77, start: 0.44, dur: 0.2 },
          { freq: 784, start: 0.78, dur: 0.14 },
          { freq: 987.77, start: 0.92, dur: 0.14 },
          { freq: 1174.66, start: 1.06, dur: 0.16 },
          { freq: 987.77, start: 1.22, dur: 0.24 },
        ];
        for (const step of pattern) {
          const osc = ctx.createOscillator();
          const harmonic = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          harmonic.type = 'triangle';
          osc.frequency.setValueAtTime(step.freq, now + step.start);
          harmonic.frequency.setValueAtTime(step.freq * 1.5, now + step.start);
          gain.gain.setValueAtTime(0.001, now + step.start);
          gain.gain.linearRampToValueAtTime(0.24, now + step.start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + step.start + step.dur);
          osc.connect(gain);
          harmonic.connect(gain);
          gain.connect(ctx.destination);
          activeOscs?.add(osc);
          activeOscs?.add(harmonic);
          osc.onended = () => activeOscs?.delete(osc);
          harmonic.onended = () => activeOscs?.delete(harmonic);
          osc.start(now + step.start);
          harmonic.start(now + step.start);
          osc.stop(now + step.start + step.dur + 0.02);
          harmonic.stop(now + step.start + step.dur + 0.02);
        }
        return true;
      } catch {
        return false;
      }
    },
    [ensureAudioContextReady]
  );

  // Crisp messenger notification tune when a new message arrives
  const playMessageNotificationTune = useCallback(() => {
    void (async () => {
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate([120, 60, 120]);
        }
        const ctx = await ensureAudioContextReady();
        if (!ctx) return;
        const now = ctx.currentTime + 0.01;
        const notes = [
          { freq: 880, start: 0, dur: 0.14, vol: 0.22 },
          { freq: 1318.5, start: 0.12, dur: 0.24, vol: 0.24 },
        ];
        for (const n of notes) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(n.freq, now + n.start);
          gain.gain.setValueAtTime(0.001, now + n.start);
          gain.gain.linearRampToValueAtTime(n.vol, now + n.start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.start);
          osc.stop(now + n.start + n.dur + 0.02);
        }
      } catch {
        // Audio playback may wait for browser gesture policy
      }
    })();
  }, [ensureAudioContextReady]);

  const showNotice = (msg: string) => {
    setSyncNotice(msg);
    setTimeout(() => setSyncNotice(''), 3500);
  };

  const getUserAvatar = useCallback(
    (target?: { id?: string; name?: string; avatar?: string } | null): string => {
      if (!target) return DEFAULT_AVATAR;
      const cleanName = (target.name || '').trim().toLowerCase();
      if (
        currentUser &&
        ((target.id && target.id === currentUser.id) ||
          (cleanName && cleanName === currentUser.name.trim().toLowerCase()))
      ) {
        if (currentUser.avatar && currentUser.avatar.trim()) {
          return currentUser.avatar.trim();
        }
      }
      const matched = usersList.find(
        (u) =>
          (target.id && u.id === target.id) ||
          (cleanName && u.name.trim().toLowerCase() === cleanName)
      );
      if (matched?.avatar && matched.avatar.trim()) {
        return matched.avatar.trim();
      }
      if (target.avatar && target.avatar.trim()) {
        return target.avatar.trim();
      }
      return DEFAULT_AVATAR;
    },
    [currentUser, usersList]
  );

  const isCustomAvatar = (url?: string | null): boolean =>
    Boolean(url && url.trim() && url.trim() !== DEFAULT_AVATAR);

  const openUserProfile = useCallback(
    (target: {
      id?: string;
      name: string;
      avatar?: string;
      role?: 'admin' | 'member';
      phone?: string;
      loginDate?: string;
    }) => {
      const cleanName = (target.name || '').trim();
      if (!cleanName) return;

      const matched = usersList.find(
        (u) =>
          (target.id && u.id === target.id) ||
          u.name.trim().toLowerCase() === cleanName.toLowerCase()
      );

      const isSelf = Boolean(
        currentUser &&
          ((target.id && target.id === currentUser.id) ||
            (matched?.id && matched.id === currentUser.id) ||
            cleanName.toLowerCase() === currentUser.name.trim().toLowerCase())
      );

      const resolvedRole: 'admin' | 'member' = isSelf
        ? currentUser!.role
        : matched?.role || target.role || (cleanName.toLowerCase() === 'choy admin' ? 'admin' : 'member');

      const rawPhone = isSelf ? currentUser?.phone : matched?.phone || target.phone;
      const safePhone =
        (isSelf || isAdmin) && rawPhone && rawPhone.toLowerCase() !== 'member' ? rawPhone : undefined;

      const resolvedAvatar = getUserAvatar({
        id: isSelf ? currentUser?.id : matched?.id || target.id,
        name: isSelf ? currentUser!.name : matched?.name || cleanName,
        avatar: target.avatar
      });

      setSelectedProfileUser({
        id: isSelf ? currentUser?.id : matched?.id || target.id,
        name: isSelf ? currentUser!.name : matched?.name || cleanName,
        role: resolvedRole,
        phone: safePhone,
        loginDate: matched?.loginDate || target.loginDate || 'Active recently',
        avatar: resolvedAvatar,
        newsfeed: (isSelf
          ? currentUser?.newsfeed || matched?.newsfeed || 'feed_a'
          : matched?.newsfeed || 'feed_a') as SelectableNewsfeed,
        isSelf
      });
    },
    [currentUser, getUserAvatar, isAdmin, usersList]
  );

  const handleMessageUser = useCallback((userName: string) => {
    const cleanName = userName.trim();
    if (!cleanName) return;
    setActiveChat(cleanName);
    setSelectedProfileUser(null);
    setActiveChatMobileView(true);
    setActiveTab('messages');
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isMenuDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuDrawerOpen]);

  useEffect(() => {
    if (!selectedProfileUser) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedProfileUser(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedProfileUser]);

  // Authenticated fetch helper using in-memory Bearer token with timeout protection
  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> | undefined),
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      const controller = options.signal ? null : new AbortController();
      const timeoutId = controller ? window.setTimeout(() => controller.abort(), 15000) : null;
      try {
        const res = await fetch(url, {
          ...options,
          headers,
          credentials: 'same-origin',
          cache: 'no-store',
          signal: options.signal ?? controller?.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401 && authToken) {
          setAuthToken(null);
          setCurrentUser(null);
          setLoginError('Session expired. Please sign in again.');
        }
        if (!res.ok) {
          throw new Error(data.error || `Request failed (${res.status})`);
        }
        return data;
      } finally {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
      }
    },
    [authToken]
  );

  // Native XHR GET fallback for /api/choy/state if window.fetch wrapper rejects transiently
  const xhrGetJson = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (url: string): Promise<any> =>
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.withCredentials = true;
        xhr.timeout = 15000;
        if (authToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        }
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onload = () => {
          let parsed: Record<string, unknown> = {};
          try {
            parsed = xhr.responseText ? (JSON.parse(xhr.responseText) as Record<string, unknown>) : {};
          } catch {
            parsed = {};
          }
          if (xhr.status === 401 && authToken) {
            setAuthToken(null);
            setCurrentUser(null);
            setLoginError('Session expired. Please sign in again.');
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(parsed);
          } else {
            reject(new Error(typeof parsed.error === 'string' ? parsed.error : `Request failed (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error('Network transport unavailable'));
        xhr.ontimeout = () => reject(new Error('Request timed out'));
        xhr.send();
      }),
    [authToken]
  );

  // 1. Check backend auth/database status & restore verified HttpOnly PWA session on mount
  const checkAuthStatus = useCallback(async () => {
    try {
      const [statusRes, sessionRes] = await Promise.all([
        fetch('/api/auth/status', { credentials: 'same-origin' }),
        fetch('/api/auth/session', { credentials: 'same-origin' })
      ]);
      const data = await statusRes.json().catch(() => ({}));
      setNeedsAdminSetup(Boolean(data.needsAdminSetup));
      if (data.storageMode === 'postgres' || data.storageMode === 'memory') {
        setStorageMode(data.storageMode);
      }
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json().catch(() => ({}));
        if (sessionData.authenticated && sessionData.token && sessionData.user) {
          setAuthToken(sessionData.token);
          setCurrentUser(sessionData.user);
        }
      }
    } catch {
      // Keep defaults if temporarily offline
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // 2. Sync full state from backend database (SSE-first + XHR fallback + backoff)
  const fetchSyncedState = useCallback(async (force = false) => {
    if (!authToken) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (!force && Date.now() < syncBackoffUntilRef.current) return;
    if (syncInFlightRef.current) {
      syncPendingRef.current = true;
      return;
    }
    syncInFlightRef.current = true;
    const seq = ++syncSeqRef.current;
    try {
      const stateUrl = `/api/choy/state?_t=${Date.now()}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try {
        data = await apiFetch(stateUrl);
      } catch (primaryErr) {
        const isFetchTransportErr =
          primaryErr instanceof TypeError ||
          (primaryErr instanceof Error && /failed to fetch|network|load failed/i.test(primaryErr.message));
        if (!isFetchTransportErr) throw primaryErr;
        data = await xhrGetJson(stateUrl);
      }
      syncFailureCountRef.current = 0;
      syncBackoffUntilRef.current = 0;
      // Ignore stale responses if a newer sync or mutation already started
      if (seq !== syncSeqRef.current) return;
      if (data.storageMode) setStorageMode(data.storageMode);
      if (data.user) {
        setCurrentUser(data.user);
        setBlockedUsers(Array.isArray(data.user.blockedUsers) ? data.user.blockedUsers : []);
      }
      if (Array.isArray(data.posts)) {
        setPosts(
          data.posts.map((p: Record<string, unknown>) => ({
            id: String(p.id),
            authorId: String(p.authorId || ''),
            author: {
              name: String(p.authorName || 'Choy User'),
              handle: String(p.authorHandle || '@choychat'),
              avatar: String(p.authorAvatar || DEFAULT_AVATAR)
            },
            content: String(p.content || ''),
            mediaUrl: typeof p.mediaUrl === 'string' ? p.mediaUrl : undefined,
            mediaType: (p.mediaType as 'text' | 'image' | 'video') || 'text',
            timestamp: formatIsoTime(typeof p.createdAt === 'string' ? p.createdAt : undefined),
            category: (p.category as 'feed' | 'myday' | 'video') || 'feed',
            newsfeed: (
              p.newsfeed === 'feed_a' ||
              p.newsfeed === 'feed_b' ||
              p.newsfeed === 'feed_c' ||
              p.newsfeed === 'feed_bc' ||
              p.newsfeed === 'both'
                ? p.newsfeed
                : 'feed_a'
            ) as PostNewsfeed,
          }))
        );
      }
      if (Array.isArray(data.messages)) {
        const myId = data.user?.id;
        const myNameLower = String(data.user?.name || '').trim().toLowerCase();
        const mappedMsgs: Message[] = data.messages.map((m: Record<string, unknown>) => ({
          id: String(m.id),
          senderId: String(m.senderId || ''),
          sender: String(m.senderName || 'Member'),
          receiver: String(m.roomId || 'VIP Group'),
          text: String(m.text || ''),
          mediaUrl: typeof m.mediaUrl === 'string' ? m.mediaUrl : undefined,
          mediaType: (m.mediaType as Message['mediaType']) || 'text',
          transcript: typeof m.transcript === 'string' ? m.transcript : undefined,
          time: formatIsoTime(typeof m.createdAt === 'string' ? m.createdAt : undefined),
          createdAtMs: typeof m.createdAt === 'string' ? new Date(m.createdAt).getTime() : Date.now(),
          isMe: m.senderId === myId,
          reactions: Array.isArray(m.reactions) ? (m.reactions as string[]) : []
        }));

        if (initialMsgSyncDoneRef.current) {
          const brandNewIncoming = mappedMsgs.filter(
            (m) =>
              !seenMessageIdsRef.current.has(m.id) &&
              !m.isMe &&
              (m.receiver.trim().toLowerCase() === 'vip group' ||
                m.receiver.trim().toLowerCase() === myNameLower)
          );
          if (brandNewIncoming.length > 0) {
            const latest = brandNewIncoming[brandNewIncoming.length - 1];
            const targetRoom =
              latest.receiver.trim().toLowerCase() === 'vip group' ? 'VIP Group' : latest.sender;
            const preview =
              latest.text ||
              (latest.mediaType === 'image'
                ? 'Sent a photo'
                : latest.mediaType === 'video'
                ? 'Sent a video'
                : latest.mediaType === 'audio'
                ? 'Sent a voice message'
                : 'New message');
            setLiveMsgBanner({ sender: latest.sender, room: targetRoom, preview });
            playMessageNotificationTune();
          }
        } else {
          initialMsgSyncDoneRef.current = true;
        }
        mappedMsgs.forEach((m) => seenMessageIdsRef.current.add(m.id));
        setCloudMessages(mappedMsgs);
      }
      if (Array.isArray(data.users)) {
        setUsersList(data.users);
      }
      if (Array.isArray(data.knowledge)) {
        setKnowledgeBase(data.knowledge);
      }
      if (Array.isArray(data.leaderboard)) {
        setLeaderboard(data.leaderboard);
      }
      if (Array.isArray(data.emojiLinks)) {
        setEmojiLinks(data.emojiLinks);
      }
      if (data.activeEmojiLink !== undefined) {
        setActiveEmojiLink(data.activeEmojiLink || null);
      } else if (Array.isArray(data.emojiLinks)) {
        setActiveEmojiLink(
          data.emojiLinks.find((l: EmojiLinkItem) => l.pinnedToAppIcon) || data.emojiLinks[0] || null
        );
      }
      if (Array.isArray(data.onlineUsers)) {
        setOnlineUsers(data.onlineUsers.map((u: unknown) => String(u || '').trim().toLowerCase()));
      }
      if (data.newsfeedConfig) {
        const nextCfg = {
          feedATitle: String(data.newsfeedConfig.feedATitle || '').trim() || 'Newsfeed A',
          feedBTitle: String(data.newsfeedConfig.feedBTitle || '').trim() || 'Newsfeed B',
          feedCTitle: String(data.newsfeedConfig.feedCTitle || '').trim() || 'Newsfeed C',
        };
        setNewsfeedConfig(nextCfg);
        localStorage.setItem('choychat_nf_a_title', nextCfg.feedATitle);
        localStorage.setItem('choychat_nf_b_title', nextCfg.feedBTitle);
        localStorage.setItem('choychat_nf_c_title', nextCfg.feedCTitle);
      }
      if (Array.isArray(data.announcements)) {
        setAnnouncements(data.announcements);
      }
      if (Array.isArray(data.ledger)) {
        setLedgerRows(data.ledger);
      }
      if (data.settings) {
        setUnitPrices({
          fiveH: Number(data.settings.fiveH) || 0,
          bulig: Number(data.settings.bulig) || 0,
          point5: Number(data.settings.point5) || 0,
          halfSack: Number(data.settings.halfSack) || 0,
          oneSack: Number(data.settings.oneSack) || 0
        });
        setDefaultQuantities({
          fiveH: Number(data.settings.defFiveH) || 0,
          bulig: Number(data.settings.defBulig) || 0,
          point5: Number(data.settings.defPoint5) || 0,
          halfSack: Number(data.settings.defHalfSack) || 0,
          oneSack: Number(data.settings.defOneSack) || 0
        });
      }
    } catch (err) {
      syncFailureCountRef.current = Math.min(syncFailureCountRef.current + 1, 5);
      const backoffMs = Math.min(30000, 3000 * Math.pow(2, syncFailureCountRef.current - 1));
      syncBackoffUntilRef.current = Date.now() + backoffMs;
      const msg = err instanceof Error ? err.message : String(err || '');
      const isTransientNetwork =
        err instanceof TypeError ||
        (err instanceof Error && err.name === 'AbortError') ||
        /failed to fetch|network|load failed|aborted|timed out/i.test(msg);
      if (!isTransientNetwork) {
        console.warn('Sync refresh notice:', msg);
      }
    } finally {
      syncInFlightRef.current = false;
      if (syncPendingRef.current) {
        syncPendingRef.current = false;
        window.setTimeout(() => {
          if (typeof navigator === 'undefined' || navigator.onLine !== false) {
            void fetchSyncedState(true);
          }
        }, 250);
      }
    }
  }, [authToken, apiFetch, xhrGetJson, playMessageNotificationTune]);

  // 3. Initial sync + Real-Time SSE stream + Adaptive Polling Fallback (Messages + Calls)
  useEffect(() => {
    if (!authToken) {
      initialMsgSyncDoneRef.current = false;
      seenMessageIdsRef.current.clear();
      lastRtcSeqRef.current = 0;
      sseConnectedRef.current = false;
      syncFailureCountRef.current = 0;
      syncBackoffUntilRef.current = 0;
      return;
    }
    fetchSyncedState(true);

    const abortController = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let lastFallbackPollMs = Date.now();

    const connectSSE = async () => {
      if (abortController.signal.aborted) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        sseConnectedRef.current = false;
        reconnectTimer = setTimeout(connectSSE, 3000);
        return;
      }
      try {
        const res = await fetch('/api/choy/stream', {
          headers: { Authorization: `Bearer ${authToken}` },
          credentials: 'same-origin',
          cache: 'no-store',
          signal: abortController.signal
        });
        if (!res.ok || !res.body) {
          sseConnectedRef.current = false;
          return;
        }
        sseConnectedRef.current = true;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() || '';
          for (const frame of frames) {
            const lines = frame.split('\n');
            let eventName = 'message';
            const dataLines: string[] = [];
            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trim());
              }
            }
            if (eventName === 'sync') {
              fetchSyncedState(true);
              setSecuritySyncTick((prev) => prev + 1);
            } else if (eventName === 'gps') {
              window.dispatchEvent(new CustomEvent('choy-gps-ping'));
            } else if (eventName === 'rtc' && dataLines.length > 0) {
              try {
                const payload = JSON.parse(dataLines.join('\n')) as RtcSignalPayload;
                handleRtcSignalRef.current(payload);
              } catch {
                // Ignore malformed RTC frame
              }
            }
          }
        }
      } catch {
        // Ignore abort / reconnect cleanly
      } finally {
        sseConnectedRef.current = false;
      }
      if (!abortController.signal.aborted) {
        reconnectTimer = setTimeout(connectSSE, 3000);
      }
    };

    connectSSE();

    // Adaptive fallback polling: 15s safety check when SSE is live, 4s when SSE is disconnected
    const statePollInterval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      const targetGapMs = sseConnectedRef.current ? 15000 : 4000;
      if (now - lastFallbackPollMs >= targetGapMs) {
        lastFallbackPollMs = now;
        void fetchSyncedState();
      }
    }, 2000);

    // Immediate sync when returning to the tab / unlocking phone
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        lastFallbackPollMs = Date.now();
        void fetchSyncedState(true);
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      abortController.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      window.clearInterval(statePollInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [authToken, fetchSyncedState]);

  // 2b. Firebase Cloud Sync & Auto-Backup / Auto-Restore (Admin Google Session)
  useEffect(() => {
    const unsub = subscribeFirebaseAuth((user) => {
      setFirebaseUser(user);
      if (!user) {
        firebaseInitialSyncUidRef.current = null;
        setFirebaseSyncState('idle');
        setFirebaseSyncError('');
      }
    });
    return unsub;
  }, []);

  const pushBackupToFirebase = useCallback(
    async (silent = true) => {
      if (!isAdmin || !authToken || !isVerifiedAdminFirebaseUser(firebaseUser)) return;
      setFirebaseSyncState('syncing');
      setFirebaseSyncError('');
      try {
        const snapshot = (await apiFetch('/api/admin/cloud-backup')) as CloudBackupSnapshot;
        const result = await syncSnapshotToFirestore(snapshot);
        setFirebaseSyncState('synced');
        setFirebaseLastSyncedAt(new Date().toISOString());
        if (!silent) {
          showNotice(`Synced ${result.accountsSynced} user account(s) to Firebase Cloud!`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Firebase sync failed';
        setFirebaseSyncState('error');
        setFirebaseSyncError(msg);
        if (!silent) showNotice(msg);
      }
    },
    [isAdmin, authToken, firebaseUser, apiFetch]
  );

  const restoreBackupFromFirebase = useCallback(
    async (silent = true) => {
      if (!authToken || !isVerifiedAdminFirebaseUser(firebaseUser)) return;
      setFirebaseSyncState('syncing');
      setFirebaseSyncError('');
      try {
        const cloudData = await fetchSnapshotFromFirestore();
        const result = (await apiFetch('/api/admin/cloud-restore', {
          method: 'POST',
          body: JSON.stringify(cloudData),
        })) as {
          restoredUsersCount: number;
          totalUsersCount: number;
          restoredLedgerCount: number;
          restoredKnowledgeCount: number;
          restoredAnnouncementsCount: number;
        };
        if (
          result.restoredUsersCount > 0 ||
          result.restoredLedgerCount > 0 ||
          result.restoredKnowledgeCount > 0 ||
          result.restoredAnnouncementsCount > 0
        ) {
          await fetchSyncedState(true);
          showNotice(
            `Restored ${result.restoredUsersCount} user account(s) from Firebase Cloud!`
          );
        } else if (!silent) {
          showNotice(`Firebase Cloud checked — all ${result.totalUsersCount} user accounts are already up to date.`);
        }
        setFirebaseSyncState('synced');
        setFirebaseLastSyncedAt(new Date().toISOString());
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Firebase restore failed';
        setFirebaseSyncState('error');
        setFirebaseSyncError(msg);
        if (!silent) showNotice(msg);
      }
    },
    [authToken, firebaseUser, apiFetch, fetchSyncedState]
  );

  const handleConnectFirebaseAdmin = useCallback(async () => {
    setFirebaseSyncError('');
    try {
      const user = await connectFirebaseGoogleAdmin();
      setFirebaseUser(user);
      if (!isVerifiedAdminFirebaseUser(user)) {
        setFirebaseSyncState('error');
        const msg = `Connected ${user.email || 'account'}, but Admin email (choycounterflow@gmail.com) is required for Firebase Cloud Sync.`;
        setFirebaseSyncError(msg);
        showNotice(msg);
        return;
      }
      showNotice(`Connected Firebase Cloud (${user.email})! Auto-restoring cloud backup...`);
      await restoreBackupFromFirebase(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setFirebaseSyncState('error');
      setFirebaseSyncError(msg);
      showNotice(msg);
    }
  }, [restoreBackupFromFirebase]);

  const handleDisconnectFirebaseAdmin = useCallback(async () => {
    await disconnectFirebaseGoogle();
    setFirebaseUser(null);
    firebaseInitialSyncUidRef.current = null;
    setFirebaseSyncState('idle');
    setFirebaseSyncError('');
    showNotice('Disconnected Firebase Cloud Sync.');
  }, []);

  useEffect(() => {
    if (!authToken || !isVerifiedAdminFirebaseUser(firebaseUser) || !firebaseUser) return;
    if (firebaseInitialSyncUidRef.current === `${currentUser?.id || 'anon'}:${firebaseUser.uid}`) return;
    firebaseInitialSyncUidRef.current = `${currentUser?.id || 'anon'}:${firebaseUser.uid}`;
    void (async () => {
      await restoreBackupFromFirebase(true);
      await pushBackupToFirebase(true);
    })();
  }, [authToken, currentUser?.id, firebaseUser, restoreBackupFromFirebase, pushBackupToFirebase]);

  useEffect(() => {
    if (!isAdmin || !authToken || !isVerifiedAdminFirebaseUser(firebaseUser)) return;
    if (!firebaseInitialSyncUidRef.current) return;
    const timer = window.setTimeout(() => {
      void pushBackupToFirebase(true);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [
    isAdmin,
    authToken,
    firebaseUser,
    usersList.length,
    ledgerRows.length,
    knowledgeBase.length,
    announcements.length,
    newsfeedConfig.feedATitle,
    newsfeedConfig.feedBTitle,
    newsfeedConfig.feedCTitle,
    securitySyncTick,
    pushBackupToFirebase,
  ]);

  // Dedicated RTC Signal Polling Fallback (1.2s idle / 0.5s during active call) so calls ALWAYS ring even if SSE is buffered
  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    let inFlight = false;

    const pollRtc = async () => {
      if (cancelled || inFlight) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      inFlight = true;
      try {
        const data = await apiFetch(`/api/choy/rtc/poll?since=${lastRtcSeqRef.current}&_t=${Date.now()}`);
        if (cancelled) return;
        if (typeof data.latestSeq === 'number' && data.latestSeq > lastRtcSeqRef.current) {
          lastRtcSeqRef.current = data.latestSeq;
        }
        if (Array.isArray(data.signals)) {
          for (const sig of data.signals) {
            handleRtcSignalRef.current(sig as RtcSignalPayload);
          }
        }
      } catch {
        // Ignore transient poll errors
      } finally {
        inFlight = false;
      }
    };

    void pollRtc();
    const intervalMs =
      isInVideoCall && callStatus === 'connected'
        ? 1400
        : isInVideoCall || Boolean(incomingCall)
        ? 280
        : 650;
    const rtcPollTimer = window.setInterval(pollRtc, intervalMs);
    const handleRtcWake = () => {
      if (document.visibilityState === 'visible') {
        void pollRtc();
      }
    };
    window.addEventListener('focus', handleRtcWake);
    document.addEventListener('visibilitychange', handleRtcWake);
    return () => {
      cancelled = true;
      window.clearInterval(rtcPollTimer);
      window.removeEventListener('focus', handleRtcWake);
      document.removeEventListener('visibilitychange', handleRtcWake);
    };
  }, [authToken, apiFetch, isInVideoCall, incomingCall, callStatus]);

  // ---- BACKGROUND WEB PUSH NOTIFICATIONS (HOME SCREEN MESSAGES & CALL ALERTS) ----
  const subscribeToBackgroundPush = useCallback(
    async (silent = false) => {
      if (!authToken) return false;
      if (
        typeof window === 'undefined' ||
        !('Notification' in window) ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
      ) {
        setPushPermission('unsupported');
        if (!silent) {
          showNotice('Background push requires Chrome/Edge on Android or installed Home Screen PWA on iPhone.');
        }
        return false;
      }

      setIsSubscribingPush(true);
      try {
        let perm: NotificationPermission = Notification.permission;
        if (perm === 'default' && !silent) {
          perm = await Notification.requestPermission();
        }
        setPushPermission(perm);

        if (perm !== 'granted') {
          if (!silent) {
            showNotice(
              perm === 'denied'
                ? 'Notifications are blocked in browser settings. Enable Notifications for Choy Chat to get home-screen alerts.'
                : 'Notification permission was not granted.'
            );
          }
          return false;
        }

        const keyRes = await apiFetch('/api/choy/push/vapid-public-key');
        const publicKey = typeof keyRes?.publicKey === 'string' ? keyRes.publicKey : '';
        if (!publicKey) throw new Error('Push service key unavailable');

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });
        }

        await apiFetch('/api/choy/push/subscribe', {
          method: 'POST',
          body: JSON.stringify({ subscription: subscription.toJSON() })
        });

        setIsPushSubscribed(true);
        if (!silent) {
          showNotice('Home-screen notifications enabled! You will now receive messages & video calls even when the app is closed.');
        }
        return true;
      } catch (err) {
        if (!silent) {
          showNotice(err instanceof Error ? err.message : 'Unable to enable background notifications.');
        }
        return false;
      } finally {
        setIsSubscribingPush(false);
      }
    },
    [authToken, apiFetch]
  );

  const unsubscribeFromBackgroundPush = useCallback(async () => {
    setIsSubscribingPush(true);
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe().catch(() => {});
          if (authToken) {
            await apiFetch('/api/choy/push/unsubscribe', {
              method: 'POST',
              body: JSON.stringify({ endpoint })
            }).catch(() => {});
          }
        }
      }
      setIsPushSubscribed(false);
      showNotice('Background push notifications turned off on this device.');
    } finally {
      setIsSubscribingPush(false);
    }
  }, [authToken, apiFetch]);

  // Silently re-register push subscription on login if user already granted permission
  useEffect(() => {
    if (!authToken || !currentUser) return;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      void subscribeToBackgroundPush(true);
    }
  }, [authToken, currentUser?.id, subscribeToBackgroundPush]);

  const enqueueOfflineMessage = useCallback(
    (payload: {
      roomId: string;
      text: string;
      mediaUrl?: string;
      mediaType: 'text' | 'image' | 'video' | 'audio' | 'file';
      transcript?: string;
    }) => {
      if (!currentUser) return null;
      const now = Date.now();
      const item: QueuedOfflineMessage = {
        localId: `offline_${now}_${Math.random().toString(36).slice(2, 7)}`,
        userId: currentUser.id,
        senderName: currentUser.name,
        roomId: payload.roomId,
        text: payload.text,
        mediaUrl: payload.mediaUrl,
        mediaType: payload.mediaType,
        transcript: payload.transcript,
        time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAtMs: now,
      };
      setOfflineQueue((prev) => {
        const next = [...prev, item];
        writeOfflineMsgQueue(next);
        return next;
      });
      return item;
    },
    [currentUser]
  );

  const flushOfflineQueue = useCallback(async () => {
    if (!authToken || !currentUser || !navigator.onLine || isFlushingQueueRef.current) return 0;
    const allQueued = readOfflineMsgQueue();
    const myQueued = allQueued.filter((q) => q.userId === currentUser.id);
    if (myQueued.length === 0) return 0;

    isFlushingQueueRef.current = true;
    setIsSyncingOfflineQueue(true);
    let sentCount = 0;

    try {
      for (const item of myQueued) {
        if (!navigator.onLine) break;
        try {
          await apiFetch('/api/choy/messages', {
            method: 'POST',
            body: JSON.stringify({
              roomId: item.roomId,
              text: item.text,
              mediaUrl: item.mediaUrl || undefined,
              mediaType: item.mediaUrl ? item.mediaType : 'text',
              transcript: item.mediaType === 'audio' ? item.transcript || 'Voice message transcription' : undefined,
            }),
          });
          sentCount += 1;
          setOfflineQueue((prev) => {
            const next = prev.filter((q) => q.localId !== item.localId);
            writeOfflineMsgQueue(next);
            return next;
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message.toLowerCase() : '';
          const isNetworkErr =
            !navigator.onLine ||
            err instanceof TypeError ||
            msg.includes('failed to fetch') ||
            msg.includes('network') ||
            msg.includes('load failed');
          if (isNetworkErr) {
            break;
          }
          setOfflineQueue((prev) => {
            const next = prev.filter((q) => q.localId !== item.localId);
            writeOfflineMsgQueue(next);
            return next;
          });
        }
      }

      if (sentCount > 0) {
        await fetchSyncedState();
        showNotice(`Synced ${sentCount} offline message${sentCount > 1 ? 's' : ''}!`);
      }
      return sentCount;
    } finally {
      isFlushingQueueRef.current = false;
      setIsSyncingOfflineQueue(false);
    }
  }, [authToken, currentUser, apiFetch, fetchSyncedState]);

  // Auto-detect when user turns mobile data / Wi-Fi ON or OFF -> update online status, flush offline queue & sync
  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  useEffect(() => {
    if (!authToken || !currentUser || !isOnline) return;
    const hasMyQueued = offlineQueue.some((q) => q.userId === currentUser.id);
    if (hasMyQueued) {
      void flushOfflineQueue();
    }
  }, [authToken, currentUser, isOnline, offlineQueue, flushOfflineQueue]);

  useEffect(() => {
    if (!authToken) return;
    const handleReconnectOnline = async () => {
      setIsOnline(navigator.onLine);
      if (!navigator.onLine) return;
      try {
        await apiFetch('/api/choy/presence', { method: 'POST', body: JSON.stringify({}) }).catch(() => {});
        await flushOfflineQueue();
        await fetchSyncedState();
        const rtcData = await apiFetch(`/api/choy/rtc/poll?since=${lastRtcSeqRef.current}&_t=${Date.now()}`).catch(
          () => null
        );
        if (rtcData && Array.isArray(rtcData.signals)) {
          if (typeof rtcData.latestSeq === 'number' && rtcData.latestSeq > lastRtcSeqRef.current) {
            lastRtcSeqRef.current = rtcData.latestSeq;
          }
          for (const sig of rtcData.signals) {
            handleRtcSignalRef.current(sig as RtcSignalPayload);
          }
        }
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          void subscribeToBackgroundPush(true);
        }
        showNotice('Data connected — live messages & calls synced.');
      } catch {
        // Ignore transient reconnect error
      }
    };

    window.addEventListener('online', handleReconnectOnline);
    const navConn = (navigator as unknown as { connection?: EventTarget }).connection;
    const handleConnChange = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        void apiFetch('/api/choy/presence', { method: 'POST', body: JSON.stringify({}) }).catch(() => {});
        void flushOfflineQueue();
        void fetchSyncedState();
      }
    };
    navConn?.addEventListener?.('change', handleConnChange);

    // Send immediate presence ping when logged in
    void apiFetch('/api/choy/presence', { method: 'POST', body: JSON.stringify({}) }).catch(() => {});

    return () => {
      window.removeEventListener('online', handleReconnectOnline);
      navConn?.removeEventListener?.('change', handleConnChange);
    };
  }, [authToken, apiFetch, fetchSyncedState, subscribeToBackgroundPush, flushOfflineQueue]);

  // Continuous real-time GPS movement watch for Admin Live Map tracking
  useEffect(() => {
    if (!authToken || !currentUser) return;
    if (!('geolocation' in navigator)) return;

    let lastSentAt = 0;
    let lastCoords: { lat: number; lng: number } | null = null;
    let inFlight = false;

    const approxDistMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
      return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(x)));
    };

    const emitPosition = (pos: GeolocationPosition, force = false) => {
      if (!navigator.onLine || inFlight) return;
      const { latitude, longitude, accuracy, speed, heading } = pos.coords;
      const now = Date.now();
      const movedMeters = lastCoords ? approxDistMeters(lastCoords, { lat: latitude, lng: longitude }) : 999;
      const elapsed = now - lastSentAt;

      if (!force) {
        if (elapsed < 3500) return;
        if (movedMeters < 5 && elapsed < 12000) return;
      }

      inFlight = true;
      lastSentAt = now;
      lastCoords = { lat: latitude, lng: longitude };

      void apiFetch('/api/choy/gps/ping', {
        method: 'POST',
        body: JSON.stringify({
          lat: latitude,
          lng: longitude,
          accuracy,
          speed: typeof speed === 'number' && Number.isFinite(speed) ? speed : undefined,
          heading: typeof heading === 'number' && Number.isFinite(heading) ? heading : undefined,
        }),
      })
        .catch(() => {})
        .finally(() => {
          inFlight = false;
        });
    };

    // Immediate initial position ping
    navigator.geolocation.getCurrentPosition(
      (pos) => emitPosition(pos, true),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // Live movement watcher so pins glide smoothly on Admin's Live Map
    const watchId = navigator.geolocation.watchPosition(
      (pos) => emitPosition(pos, false),
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );

    // Fallback heartbeat every 15s while online
    const gpsInterval = window.setInterval(() => {
      if (navigator.onLine && Date.now() - lastSentAt >= 14000) {
        navigator.geolocation.getCurrentPosition(
          (pos) => emitPosition(pos, true),
          () => {},
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
      }
    }, 15000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(gpsInterval);
    };
  }, [authToken, currentUser?.id, apiFetch]);

  // Deep-link handler when user taps a Home-Screen Message or Video Call Notification
  useEffect(() => {
    if (!authToken || !currentUser) return;

    const applyNotificationRoute = (params: {
      kind?: string;
      roomId?: string;
      callId?: string;
      callerName?: string;
      action?: string;
    }) => {
      if (params.kind === 'call' && params.callId) {
        const targetRoom = (params.callerName || params.roomId || 'VIP Group').trim();
        setActiveChat(targetRoom);
        setActiveTab('messages');
        if (params.action === 'answer') {
          pendingAutoAnswerCallIdRef.current = params.callId;
        }
        // Immediately fetch queued offer/ICE from server (since=0) in case app just launched from closed state
        void apiFetch(`/api/choy/rtc/poll?since=0&_t=${Date.now()}`)
          .then((data) => {
            if (typeof data?.latestSeq === 'number' && data.latestSeq > lastRtcSeqRef.current) {
              lastRtcSeqRef.current = data.latestSeq;
            }
            if (Array.isArray(data?.signals)) {
              for (const sig of data.signals) {
                handleRtcSignalRef.current(sig as RtcSignalPayload);
              }
            }
          })
          .catch(() => {});
        return;
      }

      if (params.roomId) {
        setActiveChat(params.roomId);
        setActiveTab('messages');
        void fetchSyncedState();
      }
    };

    // 1. Check URL params (when opened from completely closed app)
    const urlParams = new URLSearchParams(window.location.search);
    const openChatParam = urlParams.get('openChat');
    const incomingCallParam = urlParams.get('incomingCall');
    if (incomingCallParam) {
      applyNotificationRoute({
        kind: 'call',
        callId: incomingCallParam,
        callerName: urlParams.get('caller') || undefined,
        roomId: urlParams.get('room') || undefined,
        action: urlParams.get('action') || 'open'
      });
      window.history.replaceState({}, '', '/');
    } else if (openChatParam) {
      applyNotificationRoute({ kind: 'message', roomId: openChatParam });
      window.history.replaceState({}, '', '/');
    }

    // 2. Listen for Service Worker messages (when app was minimized in background)
    const handleSwMessage = (event: MessageEvent) => {
      const msg = event.data as {
        type?: string;
        kind?: string;
        roomId?: string;
        callId?: string;
        callerName?: string;
        action?: string;
      };
      if (msg && msg.type === 'CHOY_NOTIFICATION_ACTION') {
        applyNotificationRoute(msg);
      }
    };
    navigator.serviceWorker?.addEventListener?.('message', handleSwMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener?.('message', handleSwMessage);
    };
  }, [authToken, currentUser, apiFetch, fetchSyncedState]);

  const visibleUsersList = usersList.filter((u) => canClientUserSeeCandidate(currentUser, u));

  const messages = [...cloudMessages, ...localMessages, ...queuedMessagesForUi].sort(
    (a, b) => a.createdAtMs - b.createdAtMs
  );
  const chatRoomsList = (() => {
    const seen = new Set<string>();
    const rooms: string[] = [];
    const meLower = (currentUser?.name || '').trim().toLowerCase();
    const visibleNameSet = new Set(visibleUsersList.map((u) => u.name.trim().toLowerCase()));
    const isAllowedRoom = (name: string) => {
      const lower = name.trim().toLowerCase();
      if (isAdmin) return true;
      if (lower === 'vip group' || lower === 'choy admin') return true;
      return visibleNameSet.has(lower);
    };
    const addRoom = (name?: string, allowSelf = false) => {
      const clean = (name || '').trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      if (!allowSelf && meLower && lower === meLower) return;
      if (!isAllowedRoom(clean)) return;
      if (seen.has(lower)) return;
      seen.add(lower);
      rooms.push(clean);
    };

    addRoom('VIP Group', true);
    if (activeChat) addRoom(activeChat, true);
    pinnedChatRooms.forEach((r) => addRoom(r, true));
    visibleUsersList.forEach((u) => addRoom(u.name));
    CHAT_ROOMS.forEach((r) => addRoom(r));
    messages.forEach((m) => {
      const recv = (m.receiver || '').trim();
      const snd = (m.sender || '').trim();
      if (recv.toLowerCase() === 'vip group') return;
      if (meLower && snd.toLowerCase() === meLower) {
        addRoom(recv);
      } else if (meLower && recv.toLowerCase() === meLower) {
        addRoom(snd);
      }
    });
    return rooms;
  })();

  // ---- REAL LIVE WEBRTC VIDEO CALL ENGINE ----
  const sendRtcSignalToServer = useCallback(
    async (payload: {
      type: 'offer' | 'answer' | 'ice' | 'hangup' | 'decline';
      callId: string;
      roomId: string;
      targetName: string;
      sdp?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    }): Promise<{ ok: boolean; delivered: number; targetOnline: boolean }> => {
      try {
        const data = await apiFetch('/api/choy/rtc/signal', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        return {
          ok: true,
          delivered: Number(data?.delivered) || 0,
          targetOnline: Boolean(data?.targetOnline) || (Number(data?.delivered) || 0) > 0
        };
      } catch {
        return { ok: false, delivered: 0, targetOnline: false };
      }
    },
    [apiFetch]
  );

  const cleanupVideoCallResources = useCallback((preservePendingIce = false) => {
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.close();
      } catch {
        // ignore
      }
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (!preservePendingIce) {
      pendingIceCandidatesRef.current = [];
    }
    activeCallIdRef.current = null;
    callTargetNameRef.current = '';
    setHasRemoteStream(false);
    setCallPeerOfflineHint(false);
    setIsAudioMuted(false);
    setIsVideoMuted(false);
    setCallElapsedSec(0);
  }, []);

  const endVideoCall = useCallback(
    (notifyRemote = true) => {
      const currentCallId = activeCallIdRef.current;
      const currentTarget = callTargetNameRef.current;
      const currentRoom = callRoomIdRef.current;
      if (notifyRemote && currentCallId && currentTarget) {
        void sendRtcSignalToServer({
          type: 'hangup',
          callId: currentCallId,
          roomId: currentRoom,
          targetName: currentTarget
        });
      }
      cleanupVideoCallResources();
      setIsInVideoCall(false);
      setCallStatus('idle');
      setCallError('');
    },
    [cleanupVideoCallResources, sendRtcSignalToServer]
  );

  const acquireCallMedia = useCallback(async (facing: 'user' | 'environment'): Promise<MediaStream> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera & microphone require HTTPS or a supported browser.');
    }
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
    } catch (firstErr) {
      if (firstErr instanceof Error && firstErr.name === 'NotAllowedError') {
        throw new Error('Camera/microphone permission denied. Please allow access in your browser settings.');
      }
      try {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
        showNotice('Camera not detected — connected with microphone audio only.');
        return audioOnly;
      }
    }
  }, []);

  const flushPendingIceCandidates = useCallback(async (pc: RTCPeerConnection, callId: string) => {
    while (true) {
      const idx = pendingIceCandidatesRef.current.findIndex((item) => item.callId === callId);
      if (idx < 0) break;
      const [item] = pendingIceCandidatesRef.current.splice(idx, 1);
      if (!pc.remoteDescription) {
        pendingIceCandidatesRef.current.unshift(item);
        break;
      }
      await pc.addIceCandidate(new RTCIceCandidate(item.candidate)).catch(() => {});
    }
  }, []);

  const createPeerConnection = useCallback(
    (callId: string, targetName: string, roomId: string) => {
      const pc = new RTCPeerConnection(RTC_ICE_CONFIG);
      peerConnectionRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void sendRtcSignalToServer({
            type: 'ice',
            callId,
            roomId,
            targetName,
            candidate: event.candidate.toJSON()
          });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0] || remoteStreamRef.current || new MediaStream();
        if (!event.streams[0]) {
          stream.addTrack(event.track);
        }
        remoteStreamRef.current = stream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(() => {});
        }
        setHasRemoteStream(true);
        setCallPeerOfflineHint(false);
        setCallStatus('connected');
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallStatus('connected');
          setCallPeerOfflineHint(false);
        } else if (pc.connectionState === 'failed') {
          setCallError('Connection lost. Tap Retry Call to reconnect.');
          setCallStatus('error');
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setCallStatus('connected');
          setCallPeerOfflineHint(false);
        } else if (pc.iceConnectionState === 'disconnected') {
          try {
            pc.restartIce?.();
          } catch {
            // ignore
          }
        } else if (pc.iceConnectionState === 'failed') {
          setCallError('Connection lost. Tap Retry Call to reconnect.');
          setCallStatus('error');
        }
      };

      return pc;
    },
    [sendRtcSignalToServer]
  );

  const startVideoCall = useCallback(
    async (explicitTarget?: string) => {
      getUnlockedAudioContext();
      const targetName = (explicitTarget || activeChat || 'VIP Group').trim();
      cleanupVideoCallResources();
      setIncomingCall(null);
      setIsInVideoCall(true);
      setCallPartnerName(targetName);
      setCallStatus('calling');
      setCallError('');
      setCameraFacing('user');

      try {
        const stream = await acquireCallMedia('user');
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        const hasVideoTrack = stream.getVideoTracks().length > 0;
        setIsVideoMuted(!hasVideoTrack);

        const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        activeCallIdRef.current = callId;
        callTargetNameRef.current = targetName;
        callRoomIdRef.current = targetName;

        const pc = createPeerConnection(callId, targetName, targetName);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const signalRes = await sendRtcSignalToServer({
          type: 'offer',
          callId,
          roomId: targetName,
          targetName,
          sdp: offer
        });

        if (!signalRes.targetOnline) {
          setCallPeerOfflineHint(true);
        }
      } catch (err) {
        setCallStatus('error');
        setCallError(err instanceof Error ? err.message : 'Unable to start video call.');
      }
    },
    [activeChat, acquireCallMedia, cleanupVideoCallResources, createPeerConnection, getUnlockedAudioContext, sendRtcSignalToServer]
  );

  const acceptIncomingCall = useCallback(async () => {
    const callData = incomingCallRef.current || incomingCall;
    if (!callData) return;
    getUnlockedAudioContext();
    incomingCallRef.current = null;
    setIncomingCall(null);
    // Preserve queued ICE candidates received while ringing!
    cleanupVideoCallResources(true);
    // Bind active call refs immediately so hangup/ICE arriving during camera init are not dropped
    activeCallIdRef.current = callData.callId;
    callTargetNameRef.current = callData.fromUserName;
    callRoomIdRef.current = callData.roomId;
    setIsInVideoCall(true);
    setCallPartnerName(callData.fromUserName);
    setCallStatus('ringing');
    setCallError('');
    setCameraFacing('user');

    try {
      const pc = createPeerConnection(callData.callId, callData.fromUserName, callData.roomId);
      await pc.setRemoteDescription(new RTCSessionDescription(callData.sdp));
      await flushPendingIceCandidates(pc, callData.callId);

      const stream = await acquireCallMedia('user');
      // If caller hung up while camera was initializing, clean up and exit
      if (activeCallIdRef.current !== callData.callId) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      const hasVideoTrack = stream.getVideoTracks().length > 0;
      setIsVideoMuted(!hasVideoTrack);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendRtcSignalToServer({
        type: 'answer',
        callId: callData.callId,
        roomId: callData.roomId,
        targetName: callData.fromUserName,
        sdp: answer
      });
      await flushPendingIceCandidates(pc, callData.callId);
    } catch (err) {
      setCallStatus('error');
      setCallError(err instanceof Error ? err.message : 'Failed to accept video call.');
    }
  }, [incomingCall, acquireCallMedia, cleanupVideoCallResources, createPeerConnection, flushPendingIceCandidates, getUnlockedAudioContext, sendRtcSignalToServer]);

  const declineIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    void sendRtcSignalToServer({
      type: 'decline',
      callId: incomingCall.callId,
      roomId: incomingCall.roomId,
      targetName: incomingCall.fromUserName
    });
    setIncomingCall(null);
  }, [incomingCall, sendRtcSignalToServer]);

  const toggleCallAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMuted = !isAudioMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsAudioMuted(nextMuted);
  }, [isAudioMuted]);

  const toggleCallVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getVideoTracks();
    if (tracks.length === 0) {
      showNotice('No camera track available on this device.');
      return;
    }
    const nextMuted = !isVideoMuted;
    tracks.forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsVideoMuted(nextMuted);
  }, [isVideoMuted]);

  const flipCallCamera = useCallback(async () => {
    if (!localStreamRef.current || !navigator.mediaDevices?.getUserMedia) return;
    const nextFacing: 'user' | 'environment' = cameraFacing === 'user' ? 'environment' : 'user';
    try {
      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing } },
        audio: false
      });
      const newTrack = newVideoStream.getVideoTracks()[0];
      if (!newTrack) return;
      newTrack.enabled = !isVideoMuted;

      const oldStream = localStreamRef.current;
      oldStream.getVideoTracks().forEach((oldTrack) => {
        oldTrack.stop();
        oldStream.removeTrack(oldTrack);
      });
      oldStream.addTrack(newTrack);

      const sender = peerConnectionRef.current
        ?.getSenders()
        .find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = oldStream;
        localVideoRef.current.play().catch(() => {});
      }
      setCameraFacing(nextFacing);
    } catch {
      showNotice('Only one camera is available on this device.');
    }
  }, [cameraFacing, isVideoMuted]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  // Keep SSE + Poll RTC signal handler always up-to-date & deduplicated
  useEffect(() => {
    handleRtcSignalRef.current = async (payload: RtcSignalPayload) => {
      if (!payload || !payload.type || !payload.callId) return;

      if (typeof payload.seq === 'number' && payload.seq > lastRtcSeqRef.current) {
        lastRtcSeqRef.current = payload.seq;
      }
      if (payload.signalId) {
        if (processedRtcSignalIdsRef.current.has(payload.signalId)) return;
        processedRtcSignalIdsRef.current.add(payload.signalId);
        if (processedRtcSignalIdsRef.current.size > 400) {
          const oldest = Array.from(processedRtcSignalIdsRef.current).slice(0, 150);
          oldest.forEach((id) => processedRtcSignalIdsRef.current.delete(id));
        }
      }

      if (payload.type === 'offer' && payload.sdp) {
        if (activeCallIdRef.current && activeCallIdRef.current !== payload.callId) {
          void sendRtcSignalToServer({
            type: 'decline',
            callId: payload.callId,
            roomId: payload.roomId || 'VIP Group',
            targetName: payload.fromUserName || 'Member'
          });
          return;
        }
        if (incomingCallRef.current?.callId === payload.callId) return;
        const nextIncoming: IncomingCallPayload = {
          callId: payload.callId,
          roomId: payload.roomId || 'VIP Group',
          fromUserId: payload.fromUserId || '',
          fromUserName: payload.fromUserName || 'Member',
          sdp: payload.sdp
        };
        incomingCallRef.current = nextIncoming;
        setIncomingCall(nextIncoming);
        return;
      }

      if (payload.type === 'answer' && payload.sdp) {
        const pc = peerConnectionRef.current;
        if (activeCallIdRef.current !== payload.callId || !pc) return;
        try {
          if (payload.fromUserName) {
            callTargetNameRef.current = payload.fromUserName;
            setCallPartnerName(payload.fromUserName);
          }
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          await flushPendingIceCandidates(pc, payload.callId);
          setCallPeerOfflineHint(false);
          setCallStatus('connected');
        } catch {
          // Ignore stale answer
        }
        return;
      }

      if (payload.type === 'ice' && payload.candidate) {
        const pc = peerConnectionRef.current;
        if (pc && activeCallIdRef.current === payload.callId && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
        } else {
          pendingIceCandidatesRef.current.push({
            callId: payload.callId,
            candidate: payload.candidate
          });
        }
        return;
      }

      if (payload.type === 'decline') {
        pendingIceCandidatesRef.current = pendingIceCandidatesRef.current.filter(
          (item) => item.callId !== payload.callId
        );
        if (activeCallIdRef.current === payload.callId) {
          showNotice(`${payload.fromUserName || 'User'} declined the video call.`);
          endVideoCall(false);
        }
        return;
      }

      if (payload.type === 'hangup') {
        pendingIceCandidatesRef.current = pendingIceCandidatesRef.current.filter(
          (item) => item.callId !== payload.callId
        );
        if (incomingCallRef.current?.callId === payload.callId) {
          incomingCallRef.current = null;
          setIncomingCall(null);
        }
        if (activeCallIdRef.current === payload.callId) {
          showNotice(`${payload.fromUserName || 'User'} ended the video call.`);
          endVideoCall(false);
        }
      }
    };
  }, [endVideoCall, flushPendingIceCandidates, sendRtcSignalToServer]);

  // Auto-answer incoming call if user tapped "Answer Call" directly from the home-screen push notification
  useEffect(() => {
    if (
      incomingCall &&
      !isInVideoCall &&
      pendingAutoAnswerCallIdRef.current &&
      pendingAutoAnswerCallIdRef.current === incomingCall.callId
    ) {
      pendingAutoAnswerCallIdRef.current = null;
      void acceptIncomingCall();
    }
  }, [incomingCall, isInVideoCall, acceptIncomingCall]);

  // Continuous audible phone ringtone + strong vibration while an incoming video call is ringing
  useEffect(() => {
    if (!incomingCall || isInVideoCall) {
      setCallRingtoneBlocked(false);
      return;
    }
    let cancelled = false;
    const activeOscs = new Set<OscillatorNode>();

    const triggerRingBurst = () => {
      if (cancelled) return;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([450, 200, 450, 200, 450]);
      }
      void playSingleRingtoneBurst(activeOscs);
    };

    triggerRingBurst();
    const ringInterval = window.setInterval(triggerRingBurst, 2100);
    return () => {
      cancelled = true;
      window.clearInterval(ringInterval);
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(0);
      }
      activeOscs.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // Already stopped
        }
      });
      activeOscs.clear();
    };
  }, [incomingCall, isInVideoCall, playSingleRingtoneBurst]);

  // Audible outgoing caller ringback tone while calling and waiting for peer to answer
  useEffect(() => {
    if (!isInVideoCall || callStatus !== 'calling') return;
    let cancelled = false;
    const activeOscs = new Set<OscillatorNode>();

    const playRingbackBurst = async () => {
      if (cancelled) return;
      try {
        const ctx = await ensureAudioContextReady();
        if (!ctx || cancelled) return;
        const now = ctx.currentTime + 0.02;
        const freqs = [440, 480];
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.11, now + 0.04);
        gain.gain.setValueAtTime(0.11, now + 0.88);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.96);
        gain.connect(ctx.destination);

        for (const freq of freqs) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          osc.connect(gain);
          activeOscs.add(osc);
          osc.onended = () => activeOscs.delete(osc);
          osc.start(now);
          osc.stop(now + 0.98);
        }
      } catch {
        // Ignore ringback errors
      }
    };

    void playRingbackBurst();
    const ringbackTimer = window.setInterval(() => {
      void playRingbackBurst();
    }, 2800);

    return () => {
      cancelled = true;
      window.clearInterval(ringbackTimer);
      activeOscs.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // Already stopped
        }
      });
      activeOscs.clear();
    };
  }, [isInVideoCall, callStatus, ensureAudioContextReady]);

  // Auto-dismiss live incoming message banner after 5s
  useEffect(() => {
    if (!liveMsgBanner) return;
    const t = window.setTimeout(() => setLiveMsgBanner(null), 5000);
    return () => window.clearTimeout(t);
  }, [liveMsgBanner]);

  // Auto-scroll active chat to bottom when new messages arrive
  const activeRoomMessageCount = messages.filter((m) =>
    messageBelongsToRoom(m, activeChat, currentUser?.name || '')
  ).length;
  useEffect(() => {
    if (activeTab === 'messages' && !highlightedMsgId && !msgSearchQuery.trim()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [activeTab, activeChat, activeRoomMessageCount, highlightedMsgId, msgSearchQuery]);

  useEffect(() => {
    if (!highlightedMsgId || activeTab !== 'messages') return;
    const scrollTimer = window.setTimeout(() => {
      const el = document.getElementById(`chat-msg-${highlightedMsgId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 90);
    const clearTimer = window.setTimeout(() => {
      setHighlightedMsgId(null);
    }, 3500);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightedMsgId, activeTab, activeChat, activeChatMobileView]);

  const jumpToSearchResultMessage = useCallback(
    (m: Message) => {
      const targetRoom = getMessageRoomLabel(m, currentUser?.name || '');
      setActiveChat(targetRoom);
      setActiveChatMobileView(true);
      setMsgSearchScope('room');
      setMsgSearchQuery('');
      setHighlightedMsgId(m.id);
      markRoomSeen(targetRoom);
    },
    [currentUser, markRoomSeen]
  );

  // Bind live MediaStreams whenever the Video Call modal mounts/updates
  useEffect(() => {
    if (!isInVideoCall) return;
    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [isInVideoCall, hasRemoteStream, callStatus]);

  // Live call duration timer
  useEffect(() => {
    if (!isInVideoCall || callStatus !== 'connected') return;
    const timer = window.setInterval(() => {
      setCallElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isInVideoCall, callStatus]);

  // Stop media tracks cleanly on unmount
  useEffect(() => {
    return () => {
      cleanupVideoCallResources();
    };
  }, [cleanupVideoCallResources]);

  // Photo Editor Canvas Loader (preserves aspect ratio & accurate pixel coordinates)
  useEffect(() => {
    if (isPhotoEditorOpen && msgMediaUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const maxDim = 900;
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setEditorUndoStack([]);
      };
      img.src = msgMediaUrl;
    }
  }, [isPhotoEditorOpen, msgMediaUrl]);

  const handleFirstRunAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/auth/setup-admin', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authName.trim() || 'Choy Admin',
          phone: authPhone.trim(),
          pin: authPin.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Admin setup failed');
      setNeedsAdminSetup(false);
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setAuthPin('');
      setActiveTab('feed');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Admin setup failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const requestRequiredAppPermissions = useCallback(async () => {
    setIsRequestingPermissions(true);
    let camStatus: 'prompt' | 'granted' | 'denied' = 'prompt';
    let musicStatus: 'prompt' | 'granted' | 'denied' = 'prompt';
    let locStatus: 'prompt' | 'granted' | 'denied' = 'prompt';

    // 1. Unlock Audio / Music Playback Context
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        if (!soundCtxRef.current) {
          soundCtxRef.current = new AudioCtx();
        }
        if (soundCtxRef.current.state === 'suspended') {
          await soundCtxRef.current.resume().catch(() => {});
        }
      }
    } catch {
      // ignore audio context init errors
    }

    // 2. Request Camera & Music/Audio (Microphone) permissions together first
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach((t) => t.stop());
        camStatus = 'granted';
        musicStatus = 'granted';
      } catch {
        // Probe camera and music/audio individually to accurately detect each permission
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
          vStream.getTracks().forEach((t) => t.stop());
          camStatus = 'granted';
        } catch (vErr) {
          const vName = vErr instanceof DOMException ? vErr.name : '';
          camStatus = vName === 'NotAllowedError' || vName === 'PermissionDeniedError' ? 'denied' : 'granted';
        }
        try {
          const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          aStream.getTracks().forEach((t) => t.stop());
          musicStatus = 'granted';
        } catch (aErr) {
          const aName = aErr instanceof DOMException ? aErr.name : '';
          musicStatus = aName === 'NotAllowedError' || aName === 'PermissionDeniedError' ? 'denied' : 'granted';
        }
      }
    } else {
      camStatus = 'granted';
      musicStatus = 'granted';
    }

    // 3. Request Location (GPS) permission
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      locStatus = await new Promise<'prompt' | 'granted' | 'denied'>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            initialGpsRef.current = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            };
            resolve('granted');
          },
          async (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              resolve('denied');
            } else {
              try {
                if (navigator.permissions?.query) {
                  const p = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                  if (p.state === 'granted') {
                    resolve('granted');
                    return;
                  }
                  if (p.state === 'denied') {
                    resolve('denied');
                    return;
                  }
                }
              } catch {
                // ignore permissions query unsupported errors
              }
              resolve(err.code === err.POSITION_UNAVAILABLE ? 'granted' : 'prompt');
            }
          },
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 120000 }
        );
      });
    } else {
      locStatus = 'granted';
    }

    const result = { camera: camStatus, music: musicStatus, location: locStatus };
    setAppPermissions(result);
    setIsRequestingPermissions(false);
    return result;
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      setShowDashboardPermissionModal(false);
      setPermAttemptedOnce(false);
      return;
    }
    const storageKey = `choychat_perm_prompt_v1_${currentUser.id}`;
    try {
      if (localStorage.getItem(storageKey) === 'done') {
        setShowDashboardPermissionModal(false);
        return;
      }
    } catch {
      // ignore localStorage read errors
    }

    let cancelled = false;
    (async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
          const [cam, mic, geo] = await Promise.all([
            navigator.permissions.query({ name: 'camera' as PermissionName }).catch(() => null),
            navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null),
            navigator.permissions.query({ name: 'geolocation' as PermissionName }).catch(() => null),
          ]);
          if (cancelled) return;
          const camState = cam?.state === 'granted' ? 'granted' : cam?.state === 'denied' ? 'denied' : 'prompt';
          const micState = mic?.state === 'granted' ? 'granted' : mic?.state === 'denied' ? 'denied' : 'prompt';
          const geoState = geo?.state === 'granted' ? 'granted' : geo?.state === 'denied' ? 'denied' : 'prompt';
          setAppPermissions({ camera: camState, music: micState, location: geoState });
          if (camState === 'granted' && micState === 'granted' && geoState === 'granted') {
            try {
              localStorage.setItem(storageKey, 'done');
            } catch {
              // ignore storage errors
            }
            setShowDashboardPermissionModal(false);
            return;
          }
        }
      } catch {
        // ignore unsupported browser permission queries
      }
      if (!cancelled) {
        setPermAttemptedOnce(false);
        setShowDashboardPermissionModal(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setAuthSubmitting(true);
    try {

      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body =
        authMode === 'register'
          ? { name: authName.trim(), phone: authPhone.trim(), pin: authPin.trim() }
          : { phone: authPhone.trim(), pin: authPin.trim() };
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setAuthPin('');
      setActiveTab('feed');
      if (initialGpsRef.current && data.token) {
        fetch('/api/choy/gps/ping', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.token}`,
          },
          body: JSON.stringify(initialGpsRef.current),
        }).catch(() => {});
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    setAuthToken(null);
    setCurrentUser(null);
    setPosts([]);
    setCloudMessages([]);
    setLocalMessages([]);
    setUsersList([]);
    setKnowledgeBase([]);
    setLedgerRows([]);
    setLeaderboard([]);
    setBlockedUsers([]);
    setActiveTab('feed');
    checkAuthStatus();
  };

  const handleToggleBlockUser = async (targetName: string) => {
    const trimmed = targetName.slice(0, 80);
    const isBlocked = blockedUsers.includes(trimmed);
    const next = isBlocked ? blockedUsers.filter((n) => n !== trimmed) : [...blockedUsers, trimmed].slice(0, 100);
    setBlockedUsers(next);
    try {
      await apiFetch('/api/choy/blocked-users', {
        method: 'PUT',
        body: JSON.stringify({ blockedUsers: next })
      });
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to update blocked users');
    }
  };

  const isImageFile = (file: File) =>
    file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name || '');

  const isVideoFile = (file: File) =>
    file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv|3gp|mkv)$/i.test(file.name || '');

  const isAudioFile = (file: File) =>
    file.type.startsWith('audio/') || /\.(mp3|wav|ogg|webm|m4a|aac|flac)$/i.test(file.name || '');

  const compressImageToBlob = (file: File): Promise<{ blob: Blob; dataUrl: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = () => {
        const rawDataUrl = String(reader.result || '');
        const img = new Image();
        img.onerror = () => {
          if (rawDataUrl.startsWith('data:image/') && rawDataUrl.length <= 2_500_000) {
            resolve({ blob: file, dataUrl: rawDataUrl });
          } else {
            reject(new Error('Unsupported or corrupted image file. Please try JPG, PNG, or WebP.'));
          }
        };
        img.onload = () => {
          let maxDim = 1280;
          let quality = 0.82;
          let dataUrl = '';
          let finalCanvas: HTMLCanvasElement | null = null;

          for (let attempt = 0; attempt < 4; attempt++) {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width >= height) {
                height = Math.max(1, Math.round((height * maxDim) / width));
                width = maxDim;
              } else {
                width = Math.max(1, Math.round((width * maxDim) / height));
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve({ blob: file, dataUrl: rawDataUrl });
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            finalCanvas = canvas;
            if (dataUrl.length <= 1_600_000) break;
            maxDim = Math.round(maxDim * 0.72);
            quality = Math.max(0.5, quality - 0.12);
          }

          if (!finalCanvas) {
            resolve({ blob: file, dataUrl: rawDataUrl });
            return;
          }
          finalCanvas.toBlob(
            (blob) => {
              resolve({ blob: blob || file, dataUrl });
            },
            'image/jpeg',
            quality
          );
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });

  const uploadMediaToCloud = async (
    blob: Blob,
    folder: 'posts' | 'messages' | 'voice' | 'avatars'
  ): Promise<{ url: string; mediaType: 'image' | 'video' | 'audio' } | null> => {
    const headers: Record<string, string> = {
      'Content-Type': blob.type || 'application/octet-stream',
      'X-Media-Folder': folder,
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    const res = await fetch('/api/media/upload', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: blob,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Upload failed (${res.status})`);
    }
    if (data.uploaded && typeof data.url === 'string') {
      return {
        url: data.url,
        mediaType: (data.mediaType as 'image' | 'video' | 'audio') || 'image',
      };
    }
    return null;
  };

  const tryUploadMediaToCloud = async (
    blob: Blob,
    folder: 'posts' | 'messages' | 'voice' | 'avatars'
  ): Promise<{ url: string; mediaType: 'image' | 'video' | 'audio' } | null> => {
    try {
      return await uploadMediaToCloud(blob, folder);
    } catch {
      return null;
    }
  };

  const compressAvatarToBlob = (file: File): Promise<{ blob: Blob; dataUrl: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read selected photo'));
      reader.onload = () => {
        const rawDataUrl = String(reader.result || '');
        const img = new Image();
        img.onerror = () => {
          if (rawDataUrl.startsWith('data:image/') && rawDataUrl.length <= 800_000) {
            resolve({ blob: file, dataUrl: rawDataUrl });
          } else {
            reject(new Error('Unsupported photo format. Please choose JPG, PNG, or WebP.'));
          }
        };
        img.onload = () => {
          let maxDim = 512;
          let quality = 0.85;
          let dataUrl = '';
          let finalCanvas: HTMLCanvasElement | null = null;

          for (let attempt = 0; attempt < 4; attempt++) {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width >= height) {
                height = Math.max(1, Math.round((height * maxDim) / width));
                width = maxDim;
              } else {
                width = Math.max(1, Math.round((width * maxDim) / height));
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve({ blob: file, dataUrl: rawDataUrl });
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            finalCanvas = canvas;
            if (dataUrl.length <= 240_000) break;
            maxDim = Math.round(maxDim * 0.75);
            quality = Math.max(0.55, quality - 0.1);
          }

          if (!finalCanvas) {
            resolve({ blob: file, dataUrl: rawDataUrl });
            return;
          }
          finalCanvas.toBlob(
            (blob) => {
              resolve({ blob: blob || file, dataUrl });
            },
            'image/jpeg',
            quality
          );
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });

  const applyLocalAvatarUpdate = (nextAvatar: string | undefined) => {
    if (!currentUser) return;
    const myId = currentUser.id;
    const myLower = currentUser.name.trim().toLowerCase();
    const resolvedDisplay = nextAvatar || DEFAULT_AVATAR;

    setCurrentUser((prev) => (prev ? { ...prev, avatar: nextAvatar } : prev));
    setUsersList((prev) =>
      prev.map((u) =>
        u.id === myId || u.name.trim().toLowerCase() === myLower ? { ...u, avatar: nextAvatar } : u
      )
    );
    setPosts((prev) =>
      prev.map((p) =>
        p.authorId === myId || p.author.name.trim().toLowerCase() === myLower
          ? { ...p, author: { ...p.author, avatar: resolvedDisplay } }
          : p
      )
    );
    setSelectedProfileUser((prev) =>
      prev && prev.isSelf ? { ...prev, avatar: resolvedDisplay } : prev
    );
  };

  const handleProfileAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentUser) return;
    if (!isImageFile(file)) {
      showNotice('Please choose an image file (JPG, PNG, or WebP) for your profile picture.');
      return;
    }
    setIsUpdatingAvatar(true);
    try {
      const { blob, dataUrl } = await compressAvatarToBlob(file);
      const cloud = await tryUploadMediaToCloud(blob, 'avatars');
      const finalUrl = cloud ? cloud.url : dataUrl;
      const resp = (await apiFetch('/api/auth/avatar', {
        method: 'POST',
        body: JSON.stringify({ avatarUrl: finalUrl }),
      })) as { ok?: boolean; avatar?: string | null };
      const savedAvatar = typeof resp.avatar === 'string' && resp.avatar.trim() ? resp.avatar.trim() : finalUrl;
      applyLocalAvatarUpdate(savedAvatar);
      showNotice('Profile picture updated!');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to update profile picture');
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleRemoveProfileAvatar = async () => {
    if (!currentUser || isUpdatingAvatar) return;
    setIsUpdatingAvatar(true);
    try {
      await apiFetch('/api/auth/avatar', {
        method: 'POST',
        body: JSON.stringify({ avatarUrl: null }),
      });
      applyLocalAvatarUpdate(undefined);
      showNotice('Profile picture reset to default.');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to reset profile picture');
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const openNameEditor = () => {
    if (!currentUser) return;
    setNameDraft(currentUser.name);
    setNameEditError('');
    setIsEditingName(true);
  };

  const cancelNameEditor = () => {
    setIsEditingName(false);
    setNameEditError('');
    setNameDraft('');
  };

  const handleSaveProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isUpdatingName) return;
    const cleanName = nameDraft.replace(/\s+/g, ' ').trim();
    if (cleanName.length < 2 || cleanName.length > 60) {
      setNameEditError('Name must be between 2 and 60 characters.');
      return;
    }
    if (cleanName === currentUser.name.trim()) {
      cancelNameEditor();
      return;
    }

    setIsUpdatingName(true);
    setNameEditError('');
    try {
      const resp = (await apiFetch('/api/auth/name', {
        method: 'POST',
        body: JSON.stringify({ name: cleanName }),
      })) as { ok?: boolean; name?: string; previousName?: string };

      const savedName = typeof resp.name === 'string' && resp.name.trim() ? resp.name.trim() : cleanName;
      const previousName =
        typeof resp.previousName === 'string' && resp.previousName.trim()
          ? resp.previousName.trim()
          : currentUser.name;
      const prevLower = previousName.trim().toLowerCase();
      const myId = currentUser.id;
      const nextHandle = `@${savedName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'member'}`;

      setCurrentUser((prev) => (prev ? { ...prev, name: savedName } : prev));
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === myId || u.name.trim().toLowerCase() === prevLower ? { ...u, name: savedName } : u
        )
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.authorId === myId || p.author.name.trim().toLowerCase() === prevLower
            ? { ...p, author: { ...p.author, name: savedName, handle: nextHandle } }
            : p
        )
      );
      const renameMsgList = (prev: Message[]) =>
        prev.map((m) => ({
          ...m,
          sender: m.senderId === myId || m.sender.trim().toLowerCase() === prevLower ? savedName : m.sender,
          receiver:
            prevLower !== 'vip group' && m.receiver.trim().toLowerCase() === prevLower
              ? savedName
              : m.receiver,
        }));
      setCloudMessages(renameMsgList);
      setLocalMessages(renameMsgList);
      setSelectedProfileUser((prev) => (prev && prev.isSelf ? { ...prev, name: savedName } : prev));
      setIsEditingName(false);
      setNameDraft('');
      showNotice(`Name changed to ${savedName}!`);
    } catch (err) {
      setNameEditError(err instanceof Error ? err.message : 'Failed to change name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handlePostFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPostMedia(true);
    try {
      if (isImageFile(file)) {
        const { blob, dataUrl } = await compressImageToBlob(file);
        const cloud = await tryUploadMediaToCloud(blob, 'posts');
        setNewPostMedia(cloud ? cloud.url : dataUrl);
        setNewPostType('image');
        setNewPostMediaName(file.name);
      } else if (isVideoFile(file)) {
        if (file.size > 25 * 1024 * 1024) {
          showNotice('Video must be 25 MB or smaller.');
          return;
        }
        const cloud = await tryUploadMediaToCloud(file, 'posts');
        if (cloud) {
          setNewPostMedia(cloud.url);
          setNewPostType('video');
          setNewPostMediaName(file.name);
        } else {
          if (file.size > 6 * 1024 * 1024) {
            showNotice('Videos over 6 MB require Supabase Storage keys (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) in Render.');
            return;
          }
          const dataUrl = await readFileAsDataUrl(file);
          setNewPostMedia(dataUrl);
          setNewPostType('video');
          setNewPostMediaName(file.name);
        }
      } else {
        showNotice('Please select an image or video file.');
      }
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to upload selected file');
    } finally {
      setIsProcessingPostMedia(false);
      e.target.value = '';
    }
  };

  const handleUpdateUserNewsfeed = async (userId: string, newsfeed: SelectableNewsfeed) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/newsfeed`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ newsfeed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update newsfeed');
      }
      const data = await res.json();
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, newsfeed: data.user.newsfeed } : u))
      );
      setCurrentUser((prev) =>
        prev && prev.id === userId ? { ...prev, newsfeed: data.user.newsfeed } : prev
      );
      setSelectedProfileUser((prev) =>
        prev && prev.id === userId ? { ...prev, newsfeed: data.user.newsfeed } : prev
      );
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to update newsfeed');
    }
  };

  const handleSaveAdminNewsfeedTitles = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanA = adminNfTitleA.trim() || 'Newsfeed A';
    const cleanB = adminNfTitleB.trim() || 'Newsfeed B';
    const cleanC = adminNfTitleC.trim() || 'Newsfeed C';
    setAdminNfTitleA(cleanA);
    setAdminNfTitleB(cleanB);
    setAdminNfTitleC(cleanC);
    localStorage.setItem('choychat_nf_a_title', cleanA);
    localStorage.setItem('choychat_nf_b_title', cleanB);
    localStorage.setItem('choychat_nf_c_title', cleanC);
    setSavingAdminNfTitles(true);
    try {
      const data = await apiFetch('/api/admin/newsfeed-config', {
        method: 'PUT',
        body: JSON.stringify({ feedATitle: cleanA, feedBTitle: cleanB, feedCTitle: cleanC }),
      });
      const saved = data.newsfeedConfig || { feedATitle: cleanA, feedBTitle: cleanB, feedCTitle: cleanC };
      setNewsfeedConfig(saved);
      setAdminNfSaved(true);
      setTimeout(() => setAdminNfSaved(false), 2000);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to save newsfeed titles');
    } finally {
      setSavingAdminNfTitles(false);
    }
  };

  const handleDownloadChatBackup = (format: 'json' | 'txt') => {
    const roomMsgs = [...cloudMessages, ...localMessages].filter((m) =>
      messageBelongsToRoom(m, activeChat, currentUser?.name || '')
    );
    const uniqueMsgs = Array.from(new Map(roomMsgs.map((m) => [m.id, m])).values()).sort(
      (a, b) => a.createdAtMs - b.createdAtMs
    );

    if (uniqueMsgs.length === 0) {
      showNotice(`No messages found in ${activeChat} to backup.`);
      return;
    }

    let fileContent = '';
    let filename = `choychat-backup-${activeChat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'json') {
      fileContent = JSON.stringify(
        {
          room: activeChat,
          exportedAt: new Date().toISOString(),
          totalMessages: uniqueMsgs.length,
          messages: uniqueMsgs,
        },
        null,
        2
      );
      filename += '.json';
    } else {
      fileContent = `=== CHOY CHAT BACKUP ===\nRoom: ${activeChat}\nExported At: ${new Date().toISOString()}\nTotal Messages: ${uniqueMsgs.length}\n========================================\n\n` +
        uniqueMsgs
          .map(
            (m) =>
              `[${new Date(m.createdAtMs).toISOString().replace('T', ' ').slice(0, 19)}] ${m.sender}: ${m.text || (m.mediaUrl ? `[Media: ${m.mediaType}]` : '')}${
                m.transcript ? `\n   Voice Transcript: "${m.transcript}"` : ''
              }${m.reactions && m.reactions.length > 0 ? `\n   Reactions: ${m.reactions.join(' ')}` : ''}`
          )
          .join('\n\n');
      filename += '.txt';
    }

    const blob = new Blob([fileContent], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotice(`Successfully downloaded ${activeChat} backup (${format.toUpperCase()})!`);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() && !newPostMedia.trim()) return;
    try {
      await apiFetch('/api/choy/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: newPostText.trim(),
          mediaUrl: newPostMedia.trim() || undefined,
          mediaType: newPostMedia.trim() ? newPostType : 'text',
          category: newPostCategory,
          ...(isAdmin ? { newsfeed: newPostNewsfeed } : {}),
        }),
      });
      setNewPostText('');
      setNewPostMedia('');
      setNewPostMediaName('');
      setNewPostType('text');
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to publish post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await apiFetch(`/api/choy/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to delete post');
    }
  };

  const cleanupAudioRecording = useCallback(() => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecordingAudio(false);
    setRecordingSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          recordingActionRef.current = 'cancel';
          mediaRecorderRef.current.stop();
        }
      } catch {
        // ignore
      }
      cleanupAudioRecording();
    };
  }, [cleanupAudioRecording]);

  const formatRecordingTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const stopAudioRecording = (action: 'attach' | 'send' | 'cancel') => {
    recordingActionRef.current = action;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      cleanupAudioRecording();
    }
  };

  const speechRecognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef<string>('');

  const startAudioRecording = async () => {
    if (isRecordingAudio || isProcessingAudio) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showNotice('Voice recording is not supported in this browser.');
      return;
    }
    try {
      voiceTranscriptRef.current = '';
      const SpeechRecognitionAPI =
        typeof window !== 'undefined'
          ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
          : null;
      if (SpeechRecognitionAPI) {
        try {
          const recognition = new SpeechRecognitionAPI();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = navigator.language || 'en-US';
          let finalWords = '';
          recognition.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalWords += event.results[i][0].transcript + ' ';
              } else {
                interim += event.results[i][0].transcript;
              }
            }
            voiceTranscriptRef.current = (finalWords + interim).trim();
          };
          recognition.onerror = () => {};
          recognition.onend = () => {};
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {
          // Speech recognition not supported or blocked
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ];
      const mimeType =
        typeof MediaRecorder.isTypeSupported === 'function'
          ? preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || ''
          : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordingActionRef.current = 'attach';

      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        const action = recordingActionRef.current;
        const chunks = audioChunksRef.current;
        const finalMime = recorder.mimeType || mimeType || 'audio/webm';
        cleanupAudioRecording();

        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch {}
          speechRecognitionRef.current = null;
        }
        const transcript = voiceTranscriptRef.current.trim();

        if (action === 'cancel' || chunks.length === 0) {
          return;
        }

        const audioBlob = new Blob(chunks, { type: finalMime });
        if (audioBlob.size > 15 * 1024 * 1024) {
          showNotice('Voice snippet is too large (max 15 MB). Please record a shorter clip.');
          return;
        }

        setIsProcessingAudio(true);
        try {
          const cloud = await tryUploadMediaToCloud(audioBlob, 'voice');
          let mediaUrl = cloud ? cloud.url : '';
          if (!mediaUrl) {
            if (audioBlob.size > 3.5 * 1024 * 1024) {
              showNotice('Long voice notes (>3.5 MB) require Supabase Storage keys in Render.');
              return;
            }
            mediaUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error('Failed to encode voice recording'));
              reader.onload = () => resolve(String(reader.result || ''));
              reader.readAsDataURL(audioBlob);
            });
          }

          if (action === 'send') {
            if (!navigator.onLine) {
              enqueueOfflineMessage({
                roomId: activeChat,
                text: msgInput.trim() || 'Voice message',
                mediaUrl,
                mediaType: 'audio',
                transcript: transcript || 'Voice message transcription',
              });
              setMsgInput('');
              setMsgMediaUrl('');
              setMsgTranscript('');
              setMsgMediaType('text');
              showNotice('Offline: Voice message queued and will auto-sync when online.');
            } else {
              try {
                await apiFetch('/api/choy/messages', {
                  method: 'POST',
                  body: JSON.stringify({
                    roomId: activeChat,
                    text: msgInput.trim() || 'Voice message',
                    mediaUrl,
                    mediaType: 'audio',
                    transcript: transcript || 'Voice message transcription'
                  })
                });
                setMsgInput('');
                setMsgMediaUrl('');
                setMsgTranscript('');
                setMsgMediaType('text');
                await fetchSyncedState();
              } catch (sendErr) {
                const errMsg = sendErr instanceof Error ? sendErr.message.toLowerCase() : '';
                if (!navigator.onLine || sendErr instanceof TypeError || errMsg.includes('failed to fetch')) {
                  enqueueOfflineMessage({
                    roomId: activeChat,
                    text: msgInput.trim() || 'Voice message',
                    mediaUrl,
                    mediaType: 'audio',
                    transcript: transcript || 'Voice message transcription',
                  });
                  setMsgInput('');
                  setMsgMediaUrl('');
                  setMsgTranscript('');
                  setMsgMediaType('text');
                  showNotice('Connection dropped: Voice message queued for auto-sync.');
                } else {
                  throw sendErr;
                }
              }
            }
          } else {
            setMsgMediaType('audio');
            setMsgMediaUrl(mediaUrl);
            setMsgTranscript(transcript);
          }
        } catch (err) {
          showNotice(err instanceof Error ? err.message : 'Failed to process voice recording');
        } finally {
          setIsProcessingAudio(false);
        }
      };

      recorder.start(250);
      setIsRecordingAudio(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= 120) {
            stopAudioRecording('attach');
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      cleanupAudioRecording();
      showNotice(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access to record voice messages.'
          : 'Unable to access microphone.'
      );
    }
  };

  const handleMsgFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMsgMedia(true);
    try {
      if (isImageFile(file)) {
        const { blob, dataUrl } = await compressImageToBlob(file);
        const cloud = await tryUploadMediaToCloud(blob, 'messages');
        setMsgMediaType('image');
        setMsgMediaUrl(cloud ? cloud.url : dataUrl);
      } else if (isVideoFile(file)) {
        if (file.size <= 25 * 1024 * 1024) {
          const cloud = await tryUploadMediaToCloud(file, 'messages');
          if (cloud) {
            setMsgMediaType('video');
            setMsgMediaUrl(cloud.url);
            return;
          }
        }
        if (file.size <= 6 * 1024 * 1024) {
          const dataUrl = await readFileAsDataUrl(file);
          setMsgMediaType('video');
          setMsgMediaUrl(dataUrl);
        } else {
          const url = URL.createObjectURL(file);
          setMsgMediaType('video');
          setMsgMediaUrl(url);
          showNotice('Video preview is local-only until Supabase Storage keys are active (max 25 MB).');
        }
      } else if (isAudioFile(file)) {
        if (file.size <= 15 * 1024 * 1024) {
          const cloud = await tryUploadMediaToCloud(file, 'messages');
          if (cloud) {
            setMsgMediaType('audio');
            setMsgMediaUrl(cloud.url);
            return;
          }
        }
        if (file.size <= 3.5 * 1024 * 1024) {
          const dataUrl = await readFileAsDataUrl(file);
          setMsgMediaType('audio');
          setMsgMediaUrl(dataUrl);
        } else {
          const url = URL.createObjectURL(file);
          setMsgMediaType('audio');
          setMsgMediaUrl(url);
        }
      } else {
        const url = URL.createObjectURL(file);
        setMsgMediaType('file');
        setMsgMediaUrl(url);
      }
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to prepare selected image/file');
    } finally {
      setIsUploadingMsgMedia(false);
      e.target.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isSendingMsg || (!msgInput.trim() && !msgMediaUrl)) return;
    setShowMsgEmojiPicker(false);

    const isLocalBlob = Boolean(msgMediaUrl) && msgMediaUrl.startsWith('blob:');

    if (isLocalBlob) {
      const localMsg: Message = {
        id: 'local_' + Date.now(),
        senderId: currentUser.id,
        sender: currentUser.name,
        receiver: activeChat,
        text: msgInput.trim(),
        mediaType: msgMediaType,
        mediaUrl: msgMediaUrl,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAtMs: Date.now(),
        isMe: true,
        reactions: [],
        isLocalOnly: true
      };
      setLocalMessages((prev) => [...prev, localMsg]);
      showNotice('Large local file sent on this device. Images & short videos (<= 6 MB) auto-sync to all devices.');
      setMsgInput('');
      setMsgMediaUrl('');
      setMsgMediaType('text');
      return;
    }

    if (!navigator.onLine) {
      enqueueOfflineMessage({
        roomId: activeChat,
        text: msgInput.trim(),
        mediaUrl: msgMediaUrl || undefined,
        mediaType: msgMediaUrl ? msgMediaType : 'text',
        transcript: msgMediaType === 'audio' ? msgTranscript || 'Voice message transcription' : undefined,
      });
      setMsgInput('');
      setMsgMediaUrl('');
      setMsgTranscript('');
      setMsgMediaType('text');
      showNotice('Offline: Message queued locally and will send automatically when back online.');
      return;
    }

    setIsSendingMsg(true);
    try {
      await apiFetch('/api/choy/messages', {
        method: 'POST',
        body: JSON.stringify({
          roomId: activeChat,
          text: msgInput.trim(),
          mediaUrl: msgMediaUrl || undefined,
          mediaType: msgMediaUrl ? msgMediaType : 'text',
          transcript: msgMediaType === 'audio' ? msgTranscript || 'Voice message transcription' : undefined
        })
      });
      setMsgInput('');
      setMsgMediaUrl('');
      setMsgTranscript('');
      setMsgMediaType('text');
      await fetchSyncedState();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message.toLowerCase() : '';
      const isNetworkErr =
        !navigator.onLine ||
        err instanceof TypeError ||
        errMsg.includes('failed to fetch') ||
        errMsg.includes('network') ||
        errMsg.includes('load failed');
      if (isNetworkErr) {
        enqueueOfflineMessage({
          roomId: activeChat,
          text: msgInput.trim(),
          mediaUrl: msgMediaUrl || undefined,
          mediaType: msgMediaUrl ? msgMediaType : 'text',
          transcript: msgMediaType === 'audio' ? msgTranscript || 'Voice message transcription' : undefined,
        });
        setMsgInput('');
        setMsgMediaUrl('');
        setMsgTranscript('');
        setMsgMediaType('text');
        showNotice('Offline: Message queued locally and will send automatically when connection is restored.');
      } else {
        showNotice(err instanceof Error ? err.message : 'Failed to send message');
      }
    } finally {
      setIsSendingMsg(false);
    }
  };

  const addReactionToMessage = async (msg: Message, emoji: string) => {
    const currentReactions = msg.reactions || [];
    if (currentReactions.length >= 20) return;

    if (msg.isLocalOnly) {
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, reactions: [...currentReactions, emoji] } : m))
      );
      return;
    }

    try {
      await apiFetch(`/api/choy/messages/${encodeURIComponent(msg.id)}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji })
      });
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to add reaction');
    }
  };

  const handleDeleteMessage = async (msg: Message) => {
    if (!currentUser) return;
    if (msg.isLocalOnly) {
      setLocalMessages((prev) => prev.filter((m) => m.id !== msg.id));
      showNotice('Message deleted locally.');
      return;
    }
    try {
      await apiFetch(`/api/choy/messages/${encodeURIComponent(msg.id)}`, {
        method: 'DELETE',
      });
      showNotice('Message deleted successfully.');
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to delete message');
    }
  };

  const openForwardDialog = (msg: Message) => {
    setForwardingMessage(msg);
    setForwardSearch('');
    setForwardingTarget(null);
    setForwardedTargets([]);
  };

  const handleForwardToRoom = async (targetRoom: string) => {
    if (!forwardingMessage || !currentUser || forwardingTarget) return;
    const cleanTarget = targetRoom.trim();
    if (!cleanTarget) return;
    setForwardingTarget(cleanTarget);
    try {
      if (forwardingMessage.isLocalOnly && forwardingMessage.mediaUrl?.startsWith('blob:')) {
        const localCopy: Message = {
          id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          senderId: currentUser.id,
          sender: currentUser.name,
          receiver: cleanTarget,
          text: forwardingMessage.text || '',
          mediaType: forwardingMessage.mediaType || 'text',
          mediaUrl: forwardingMessage.mediaUrl,
          transcript: forwardingMessage.transcript,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAtMs: Date.now(),
          isMe: true,
          reactions: [],
          isLocalOnly: true,
        };
        setLocalMessages((prev) => [...prev, localCopy]);
        setForwardedTargets((prev) => (prev.includes(cleanTarget) ? prev : [...prev, cleanTarget]));
        showNotice(`Forwarded message to ${cleanTarget}!`);
        return;
      }

      await apiFetch('/api/choy/messages', {
        method: 'POST',
        body: JSON.stringify({
          roomId: cleanTarget,
          text: forwardingMessage.text || '',
          mediaUrl: forwardingMessage.mediaUrl || undefined,
          mediaType: forwardingMessage.mediaUrl ? forwardingMessage.mediaType || 'text' : 'text',
          transcript: forwardingMessage.transcript || undefined,
        }),
      });
      setForwardedTargets((prev) => (prev.includes(cleanTarget) ? prev : [...prev, cleanTarget]));
      showNotice(`Forwarded message to ${cleanTarget}!`);
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to forward message');
    } finally {
      setForwardingTarget(null);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setAiChatMessages([]);
      return;
    }
    setAiChatMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          sender: 'ai',
          text: isAdmin
            ? `Kumusta Admin ${currentUser.name}! I am Choy AI (Admin Sync Mode). You can ask me in any language about Milestone records, check all users' messages for any issues, or ask how to use any Choy Chat feature.`
            : `Kumusta! I am Choy AI. Ask me in any language (Bisaya, Tagalog, English, etc.) about how to use Choy Chat and its features! (Note: Private messages, user profile info, and Milestone data are strictly Admin-only.)`,
        },
      ];
    });
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (activeTab === 'choyai') {
      choyAiTabEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    if (isChoyAIPopupOpen) {
      choyAiPopupEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [aiChatMessages, isChoyAIThinking, activeTab, isChoyAIPopupOpen]);

  const sendChoyAIQuestion = async (rawQuestion: string) => {
    const q = rawQuestion.trim();
    if (!q || isChoyAIThinking) return;
    const historySnapshot = aiChatMessages.slice(-6);
    setAiChatMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setAiChatInput('');
    setIsChoyAIThinking(true);
    try {
      const resp = (await apiFetch('/api/choy/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          question: q,
          history: historySnapshot,
        }),
      })) as { answer?: string };
      const reply = (resp?.answer || '').trim();
      setAiChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: reply || 'Choy AI returned an empty response. Please try asking again.',
        },
      ]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unable to reach Choy AI right now.';
      setAiChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Error: ${errMsg}`,
        },
      ]);
    } finally {
      setIsChoyAIThinking(false);
    }
  };

  const calculateRowTotal = (row: LedgerRow) => {
    return (
      row.fiveH * unitPrices.fiveH +
      row.bulig * unitPrices.bulig +
      row.point5 * unitPrices.point5 +
      row.halfSack * unitPrices.halfSack +
      row.oneSack * unitPrices.oneSack +
      row.bal
    );
  };

  const handleAddLedgerRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newLedgerName.trim()) return;
    try {
      await apiFetch('/api/choy/ledger', {
        method: 'POST',
        body: JSON.stringify({ name: newLedgerName.trim() })
      });
      setNewLedgerName('');
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to add row');
    }
  };

  const handleUpdateLedgerField = async (
    row: LedgerRow,
    patch: Partial<Omit<LedgerRow, 'id' | 'name'>>
  ) => {
    if (!isAdmin) return;
    const optimistic = { ...row, ...patch };
    setLedgerRows((prev) => prev.map((r) => (r.id === row.id ? optimistic : r)));
    try {
      await apiFetch(`/api/choy/ledger/${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch)
      });
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to update row');
      await fetchSyncedState();
    }
  };

  const handleDeleteLedgerRow = async (rowId: string) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/choy/ledger/${encodeURIComponent(rowId)}`, { method: 'DELETE' });
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to delete row');
    }
  };

  const handleSaveUnitPrices = async () => {
    if (!isAdmin) return;
    try {
      await apiFetch('/api/choy/settings', {
        method: 'PUT',
        body: JSON.stringify({
          fiveH: unitPrices.fiveH,
          bulig: unitPrices.bulig,
          point5: unitPrices.point5,
          halfSack: unitPrices.halfSack,
          oneSack: unitPrices.oneSack,
          defFiveH: defaultQuantities.fiveH,
          defBulig: defaultQuantities.bulig,
          defPoint5: defaultQuantities.point5,
          defHalfSack: defaultQuantities.halfSack,
          defOneSack: defaultQuantities.oneSack,
          applyQuantitiesToAll: false
        })
      });
      setPricesSavedMsg(true);
      setTimeout(() => setPricesSavedMsg(false), 2500);
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to save unit prices');
    }
  };

  const handleSaveDefaultQuantities = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await apiFetch('/api/choy/settings', {
        method: 'PUT',
        body: JSON.stringify({
          fiveH: unitPrices.fiveH,
          bulig: unitPrices.bulig,
          point5: unitPrices.point5,
          halfSack: unitPrices.halfSack,
          oneSack: unitPrices.oneSack,
          defFiveH: defaultQuantities.fiveH,
          defBulig: defaultQuantities.bulig,
          defPoint5: defaultQuantities.point5,
          defHalfSack: defaultQuantities.halfSack,
          defOneSack: defaultQuantities.oneSack,
          applyQuantitiesToAll: true
        })
      });
      setQtySavedMsg(true);
      setTimeout(() => setQtySavedMsg(false), 2500);
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to apply quantities');
    }
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newQ.trim() || !newA.trim()) return;
    try {
      await apiFetch('/api/choy/knowledge', {
        method: 'POST',
        body: JSON.stringify({ question: newQ.trim(), answer: newA.trim() })
      });
      setNewQ('');
      setNewA('');
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to add Q&A');
    }
  };

  const handleDeleteKnowledge = async (qaId: string) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/choy/knowledge/${encodeURIComponent(qaId)}`, { method: 'DELETE' });
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to delete Q&A');
    }
  };

  const handleAddCloudUser = async (name: string, phone: string, pin?: string) => {
    if (!isAdmin) return;
    try {
      await apiFetch('/api/choy/users', {
        method: 'POST',
        body: JSON.stringify({
          name,
          phone: phone || `member_${Date.now()}`,
          ...(pin && pin.trim().length >= 4 ? { pin: pin.trim() } : {}),
        }),
      });
      showNotice(`Added account for ${name}.`);
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to add user');
    }
  };

  const handleDeleteCloudUser = async (userId: string) => {
    if (!isAdmin) return;
    if (deletingUserIds.includes(userId)) return;
    setDeletingUserIds((prev) => [...prev, userId]);
    syncSeqRef.current += 1;
    try {
      await apiFetch(`/api/choy/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      setUsersList((prev) => prev.filter((item) => item.id !== userId));
      setConfirmDeleteUserId(null);
      showNotice('Account permanently deleted.');
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeletingUserIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleDeleteMyAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isAdmin || deletingMyAccount) return;
    const trimmedPin = deleteAccountPin.trim();
    if (!trimmedPin) {
      setDeleteAccountError('Enter your current PIN to confirm account deletion.');
      return;
    }
    setDeletingMyAccount(true);
    setDeleteAccountError('');
    try {
      await apiFetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ pin: trimmedPin }),
      });
      setDeleteAccountPin('');
      setShowDeleteAccountSetup(false);
      setAuthToken(null);
      setCurrentUser(null);
      setPosts([]);
      setCloudMessages([]);
      setLocalMessages([]);
      setUsersList([]);
      setKnowledgeBase([]);
      setLedgerRows([]);
      setLeaderboard([]);
      setBlockedUsers([]);
      setActiveTab('feed');
      setLoginError('Your account has been permanently deleted.');
      checkAuthStatus();
    } catch (err) {
      setDeleteAccountError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeletingMyAccount(false);
    }
  };

  const pushEditorUndoSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const snap = canvas.toDataURL('image/png');
      setEditorUndoStack((prev) => [...prev.slice(-12), snap]);
    } catch {
      // Ignore snapshot error
    }
  };

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      strokeScale: Math.max(scaleX, scaleY),
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pt = getCanvasPoint(e.clientX, e.clientY);
    if (!ctx || !pt) return;

    pushEditorUndoSnapshot();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if synthetic/unsupported
    }
    isDrawingRef.current = true;
    lastDrawPointRef.current = { x: pt.x, y: pt.y };

    const effectiveWidth = Math.max(2, drawWidth * pt.strokeScale);
    ctx.beginPath();
    ctx.fillStyle = drawColor;
    ctx.arc(pt.x, pt.y, effectiveWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastDrawPointRef.current = null;
    if (e) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    ctx?.beginPath();
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pt = getCanvasPoint(e.clientX, e.clientY);
    if (!ctx || !pt) return;

    const from = lastDrawPointRef.current || { x: pt.x, y: pt.y };
    const effectiveWidth = Math.max(2, drawWidth * pt.strokeScale);
    ctx.lineWidth = effectiveWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = drawColor;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastDrawPointRef.current = { x: pt.x, y: pt.y };
  };

  const handleUndoEditor = () => {
    const canvas = canvasRef.current;
    if (!canvas || editorUndoStack.length === 0) return;
    const lastSnap = editorUndoStack[editorUndoStack.length - 1];
    setEditorUndoStack((prev) => prev.slice(0, -1));
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
    };
    img.src = lastSnap;
  };

  const handleCropSquare = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    pushEditorUndoSnapshot();
    const size = Math.min(canvas.width, canvas.height);
    const imgData = ctx.getImageData((canvas.width - size) / 2, (canvas.height - size) / 2, size, size);
    canvas.width = size;
    canvas.height = size;
    ctx.putImageData(imgData, 0, 0);
  };

  const handleApplyFilterGrayscale = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    pushEditorUndoSnapshot();
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
      d[i] = avg;
      d[i + 1] = avg;
      d[i + 2] = avg;
    }
    ctx.putImageData(imgData, 0, 0);
  };

  const handleSaveEditedPhoto = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setMsgMediaUrl(dataUrl);
    }
    setIsPhotoEditorOpen(false);
  };

  const handleShareApp = async () => {
    const emojiCode = activeEmojiLink?.emojiCode || '🔐🟢💬✨🚀';
    const title = activeEmojiLink?.title || 'Choy Chat Live App';
    const targetUrl = activeEmojiLink?.targetUrl || window.location.href;
    const iconUrl = activeEmojiLink?.iconUrl || DEFAULT_AVATAR;
    const result = await shareEmojiLinkWithAppImage({
      emojiCode,
      title,
      targetUrl,
      iconUrl,
    });
    if (result.method === 'clipboard') {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const handleDownloadLedgerCSV = () => {
    const headers = ['Name', '5H Qty', '5H Type', 'Bulig', 'Point 5', 'Half Sack', 'One Sack', 'Balance', 'Total'];
    const rows = ledgerRows.map((r) => [
      `"${r.name}"`,
      r.fiveH,
      r.fiveHType,
      r.bulig,
      r.point5,
      r.halfSack,
      r.oneSack,
      r.bal,
      calculateRowTotal(r)
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `choychat_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalBlue = ledgerRows
    .filter((r) => r.fiveHType === 'blue')
    .reduce((sum, r) => sum + calculateRowTotal(r), 0);

  const totalRed = ledgerRows
    .filter((r) => r.fiveHType === 'red')
    .reduce((sum, r) => sum + Math.abs(calculateRowTotal(r)), 0);

  const topLeaderboard: LeaderboardItem[] =
    leaderboard.length > 0
      ? leaderboard
      : [...ledgerRows]
          .map((r) => ({ id: r.id, name: r.name, total: calculateRowTotal(r) }))
          .sort((a, b) => b.total - a.total);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredUsers = visibleUsersList.filter((u) => {
    if (!normalizedSearch) return true;
    const handle = `@${u.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
    const roleLabel = u.role === 'admin' ? 'admin' : 'member active';
    const canSearchPhone =
      (isAdmin || u.id === currentUser?.id) &&
      Boolean(u.phone) &&
      u.phone.toLowerCase() !== 'member';
    return (
      u.name.toLowerCase().includes(normalizedSearch) ||
      handle.includes(normalizedSearch) ||
      roleLabel.includes(normalizedSearch) ||
      (canSearchPhone && u.phone.toLowerCase().includes(normalizedSearch))
    );
  });

  const getNewsfeedLabel = (nf?: PostNewsfeed) => {
    if (nf === 'feed_b') return newsfeedConfig.feedBTitle;
    if (nf === 'feed_c') return newsfeedConfig.feedCTitle;
    if (nf === 'feed_bc') return `B & C (${newsfeedConfig.feedBTitle} & ${newsfeedConfig.feedCTitle})`;
    if (nf === 'both') return 'All Channels';
    return newsfeedConfig.feedATitle;
  };

  const getAnnouncementTargetLabel = (target: StudioAnnouncementTarget) => {
    if (target === 'feed_a') return newsfeedConfig.feedATitle;
    if (target === 'feed_b') return newsfeedConfig.feedBTitle;
    if (target === 'feed_c') return newsfeedConfig.feedCTitle;
    if (target === 'feed_bc') return `B & C (${newsfeedConfig.feedBTitle} & ${newsfeedConfig.feedCTitle})`;
    return 'All Newsfeeds';
  };

  const doesChannelMatchTarget = (viewerChannel: SelectableNewsfeed, target: StudioAnnouncementTarget) => {
    if (target === 'all') return true;
    const toSet = (val: string) => {
      if (val === 'feed_b') return ['b'];
      if (val === 'feed_c') return ['c'];
      if (val === 'feed_bc') return ['b', 'c'];
      return ['a'];
    };
    const vSet = toSet(viewerChannel);
    const tSet = toSet(target);
    return vSet.some((c) => tSet.includes(c));
  };

  const visibleAnnouncements = announcements
    .filter((a) => a.active)
    .filter((a) => {
      if (isAdmin) {
        if (adminNewsfeedFilter === 'all') return true;
        return doesChannelMatchTarget(adminNewsfeedFilter, a.target);
      }
      const myNf: SelectableNewsfeed = currentUser?.newsfeed || 'feed_a';
      return doesChannelMatchTarget(myNf, a.target);
    });

  useEffect(() => {
    if (bannerPaused || visibleAnnouncements.length <= 1) return;
    const timer = window.setInterval(() => {
      setBannerSlideIndex((prev) => (prev + 1) % visibleAnnouncements.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [bannerPaused, visibleAnnouncements.length]);

  const filteredPosts = posts
    .filter((p) => !blockedUsers.includes(p.author.name))
    .filter((p) => {
      if (!isAdmin || adminNewsfeedFilter === 'all') return true;
      const postNf = p.newsfeed || 'feed_a';
      if (postNf === 'both') return true;
      if (adminNewsfeedFilter === 'feed_b') return postNf === 'feed_b' || postNf === 'feed_bc';
      if (adminNewsfeedFilter === 'feed_c') return postNf === 'feed_c' || postNf === 'feed_bc';
      return postNf === adminNewsfeedFilter;
    })
    .filter((p) => {
      if (!normalizedSearch) return true;
      return (
        p.content.toLowerCase().includes(normalizedSearch) ||
        p.author.name.toLowerCase().includes(normalizedSearch) ||
        p.author.handle.toLowerCase().includes(normalizedSearch)
      );
    });

  const filteredChatRooms = normalizedSearch
    ? chatRoomsList.filter((room) => room.toLowerCase().includes(normalizedSearch))
    : chatRoomsList;

  // Loading state while checking server status
  if (!authChecked) {
    return (
      <div className="fixed inset-0 bg-emerald-50 dark:bg-emerald-950 text-emerald-950 dark:text-slate-100 flex flex-col items-center justify-center gap-3 p-4">
        <div className="w-16 h-24 rounded-2xl overflow-hidden border border-emerald-400 bg-emerald-50 dark:bg-emerald-950 p-0.5 shadow-lg">
          <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-contain rounded-xl" />
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" /> Connecting to Choy Chat...
        </div>
      </div>
    );
  }

  // Auth Gate: First-Run Admin Setup OR Standard Phone + PIN Login / Register
  if (!authToken || !currentUser) {
    return (
      <div className="fixed inset-0 bg-emerald-50 dark:bg-emerald-950 text-emerald-950 dark:text-slate-100 flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-emerald-50 dark:bg-emerald-950">
          <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-contain opacity-25 dark:opacity-35" />
          <div className="absolute inset-0 bg-emerald-50/75 dark:bg-emerald-950/65"></div>
        </div>

        <div className="relative z-15 w-[95%] max-w-sm max-h-[92vh] overflow-y-auto bg-white/95 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
          <button
            type="button"
            onClick={toggleLightDark}
            aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="absolute top-4 right-4 p-2 rounded-xl bg-emerald-100/90 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-amber-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="text-center space-y-1.5">
            <div className="w-16 h-24 rounded-2xl overflow-hidden border border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-950 p-0.5 mx-auto shadow-md">
              <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-contain rounded-xl" />
            </div>
            <h1 className="text-3xl font-black tracking-[0.22em] uppercase bg-gradient-to-r from-emerald-900 via-emerald-700 to-amber-700 dark:from-amber-200 dark:via-emerald-200 dark:to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(251,191,36,0.25)]">
              CHOY CHAT
            </h1>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5">
              <Cloud className="w-3.5 h-3.5" />
              {storageMode === 'postgres' ? 'PostgreSQL Cloud Sync Ready' : 'Render Live Sync Ready'}
            </p>
          </div>

          {loginError && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-300 dark:border-red-400/40 text-red-800 dark:text-red-200 text-xs text-center">
              {loginError}
            </div>
          )}

          {needsAdminSetup ? (
            <form onSubmit={handleFirstRunAdminSetup} className="space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-emerald-900/70 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-[11px] leading-relaxed">
                <strong className="text-emerald-950 dark:text-white">First-Run Admin Setup:</strong> I-claim imong Admin account gamit imong phone number ug gusto nimong PIN.
              </div>
              <div>
                <label className="block text-emerald-800 dark:text-slate-300 mb-1">Admin Name</label>
                <input
                  type="text"
                  required
                  placeholder="Choy Admin"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 rounded-xl text-emerald-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-emerald-800 dark:text-slate-300 mb-1">Admin Phone Number</label>
                <input
                  type="text"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  placeholder="09361223978"
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 rounded-xl text-emerald-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-emerald-800 dark:text-slate-300 mb-1">Create Admin PIN (min. 4 chars)</label>
                <div className="relative">
                  <input
                    type={showAuthPin ? 'text' : 'password'}
                    required
                    minLength={4}
                    placeholder="Enter your secret PIN..."
                    value={authPin}
                    onChange={(e) => setAuthPin(e.target.value)}
                    className="w-full p-2.5 pr-10 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 rounded-xl text-emerald-950 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPin((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-700/80 dark:text-slate-400 hover:text-emerald-950 dark:hover:text-white p-1"
                    title={showAuthPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showAuthPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold rounded-xl shadow flex items-center justify-center gap-2 transition disabled:opacity-60"
              >
                <ShieldCheck className="w-4 h-4" />
                {authSubmitting ? 'Setting up Admin...' : 'Claim Admin Account'}
              </button>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setLoginError('');
                  }}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                    authMode === 'login' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-emerald-800 dark:text-emerald-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" /> Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setLoginError('');
                  }}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                    authMode === 'register' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-emerald-800 dark:text-emerald-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Sign Up
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-emerald-800 dark:text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Your name..."
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 rounded-xl text-emerald-950 dark:text-white"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-emerald-800 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    placeholder="09..."
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 rounded-xl text-emerald-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-emerald-800 dark:text-slate-300 mb-1">PIN</label>
                  <div className="relative">
                    <input
                      type={showAuthPin ? 'text' : 'password'}
                      required
                      minLength={4}
                      placeholder="Enter PIN..."
                      value={authPin}
                      onChange={(e) => setAuthPin(e.target.value)}
                      className="w-full p-2.5 pr-10 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 rounded-xl text-emerald-950 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthPin((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-700/80 dark:text-slate-400 hover:text-emerald-950 dark:hover:text-white p-1"
                      title={showAuthPin ? 'Hide PIN' : 'Show PIN'}
                    >
                      {showAuthPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl shadow transition disabled:opacity-60"
                >
                  {authSubmitting ? 'Please wait...' : authMode === 'register' ? 'Create Account' : 'Login'}
                </button>
              </form>
            </>
          )}

          <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/80">
            <PWAInstallButton fullWidth />
          </div>
        </div>
        <OfflineIndicator />
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 ${theme.appShellBg} flex flex-col md:flex-row overflow-hidden text-sm transition-colors`}>
      <input
        ref={profileAvatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleProfileAvatarSelect}
        className="hidden"
      />
      {/* INCOMING LIVE VIDEO CALL BANNER (WITH CALLER PROFILE ICON) */}
      {incomingCall && !isInVideoCall && (() => {
        const callerAvatar = getUserAvatar({ id: incomingCall.fromUserId, name: incomingCall.fromUserName });
        return (
        <div
          onClick={() => {
            if (callRingtoneBlocked) {
              void playSingleRingtoneBurst();
            }
          }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[94%] max-w-md bg-emerald-950/95 border-2 border-emerald-400 rounded-2xl p-4 shadow-2xl text-white backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-12 h-14 rounded-xl bg-emerald-900 border-2 border-emerald-400 overflow-hidden shrink-0 shadow-md">
                <img
                  src={callerAvatar}
                  alt={incomingCall.fromUserName}
                  className={`w-full h-full ${isCustomAvatar(callerAvatar) ? 'object-cover' : 'object-contain'}`}
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-emerald-950 animate-ping" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-300 flex items-center gap-1">
                  <Video className="w-3 h-3" /> Incoming Video Call
                </div>
                <div className="text-sm font-black truncate">{incomingCall.fromUserName}</div>
                <div className="text-[10px] text-emerald-200/80 truncate">
                  {callRingtoneBlocked ? 'Tap banner to play ringtone' : 'Tap Accept to join live video'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={declineIncomingCall}
                className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1 shadow"
              >
                <PhoneOff className="w-4 h-4" /> Decline
              </button>
              <button
                type="button"
                onClick={acceptIncomingCall}
                className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black flex items-center gap-1 shadow"
              >
                <PhoneCall className="w-4 h-4" /> Accept
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* LIVE INCOMING MESSAGE POPUP NOTIFICATION (WITH SENDER PROFILE PIC & TUNE) */}
      {liveMsgBanner &&
        !incomingCall &&
        !(activeTab === 'messages' && activeChat.trim().toLowerCase() === liveMsgBanner.room.trim().toLowerCase()) && (() => {
          const senderAvatar = getUserAvatar({ name: liveMsgBanner.sender });
          return (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[55] w-[92%] max-w-md bg-white dark:bg-emerald-950/95 border-2 border-emerald-400 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900 border border-emerald-400/70 overflow-hidden shrink-0 shadow-xs">
                <img
                  src={senderAvatar}
                  alt={liveMsgBanner.sender}
                  className={`w-full h-full ${isCustomAvatar(senderAvatar) ? 'object-cover' : 'object-contain'}`}
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-emerald-950" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 flex items-center gap-1">
                  <Bell className="w-3 h-3" /> New Message
                </div>
                <div className="text-xs font-black text-emerald-950 dark:text-white truncate">
                  {liveMsgBanner.sender}
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-200 truncate">
                  {liveMsgBanner.preview}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveChat(liveMsgBanner.room);
                  setActiveTab('messages');
                  setLiveMsgBanner(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[11px] font-bold"
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => setLiveMsgBanner(null)}
                className="p-1 text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          );
        })()}

      {/* REAL LIVE WEBRTC VIDEO CALL MODAL */}
      {isInVideoCall && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-5">
          <div className="relative w-full max-w-4xl h-[74dvh] bg-slate-900 rounded-3xl overflow-hidden border border-emerald-500/40 flex items-center justify-center shadow-2xl">
            {/* Remote Peer Live Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${hasRemoteStream ? 'block' : 'hidden'}`}
            />

            {/* Waiting / Calling / Error Overlay when remote video isn't connected yet */}
            {!hasRemoteStream && (
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/90 via-slate-950/95 to-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shadow-lg">
                  {callStatus === 'error' ? (
                    <VideoOff className="w-8 h-8 text-red-400" />
                  ) : (
                    <Video className="w-8 h-8 animate-pulse" />
                  )}
                </div>
                <div className="text-lg font-black text-white">{callPartnerName || activeChat}</div>
                {callStatus === 'error' ? (
                  <div className="space-y-3 max-w-sm">
                    <p className="text-xs text-red-300 font-medium">{callError}</p>
                    <button
                      type="button"
                      onClick={() => startVideoCall(callPartnerName || activeChat)}
                      className="px-4 py-2 rounded-xl bg-emerald-400 text-slate-950 text-xs font-black hover:bg-emerald-300 transition"
                    >
                      Retry Camera & Call
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 max-w-sm">
                    <div className="text-xs font-bold text-emerald-300">
                      {callStatus === 'connected'
                        ? 'Connected (Audio Live)'
                        : callStatus === 'ringing'
                        ? `Connecting video & audio with ${callPartnerName || activeChat}...`
                        : callPeerOfflineHint
                        ? `Camera live — waiting for ${callPartnerName || activeChat} to open Choy Chat...`
                        : `Calling ${callPartnerName || activeChat}...`}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Your live camera & microphone are active. When {callPartnerName || activeChat} accepts on their device, their video appears here.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Top Call Status Pill */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="px-3 py-1.5 rounded-xl bg-slate-950/75 border border-emerald-500/40 backdrop-blur text-white text-xs font-bold flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    callStatus === 'connected'
                      ? 'bg-emerald-400'
                      : callStatus === 'error'
                      ? 'bg-red-500'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <span className="truncate max-w-[160px] sm:max-w-[260px]">{callPartnerName || activeChat}</span>
                {callStatus === 'connected' && (
                  <span className="font-mono text-emerald-300">{formatRecordingTime(callElapsedSec)}</span>
                )}
              </div>
            </div>

            {/* Local Self Camera Live Preview (PiP) */}
            <div className="absolute bottom-4 right-4 w-28 h-40 sm:w-40 sm:h-28 bg-slate-950 rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-xl flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''} ${
                  isVideoMuted ? 'hidden' : 'block'
                }`}
              />
              {isVideoMuted && (
                <div className="flex flex-col items-center gap-1 text-[10px] text-slate-300 p-2 text-center">
                  <VideoOff className="w-5 h-5 text-red-400" />
                  <span>Camera Off</span>
                </div>
              )}
              <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-slate-950/75 text-[9px] font-bold text-emerald-200">
                You
              </span>
            </div>
          </div>

          {/* Live Call Controls */}
          <div className="flex items-center gap-3 sm:gap-4 mt-5">
            <button
              type="button"
              onClick={toggleCallAudio}
              className={`p-3.5 sm:p-4 rounded-full transition shadow-lg ${
                isAudioMuted ? 'bg-red-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
              title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={toggleCallVideo}
              className={`p-3.5 sm:p-4 rounded-full transition shadow-lg ${
                isVideoMuted ? 'bg-red-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
              title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={flipCallCamera}
              className="p-3.5 sm:p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition shadow-lg"
              title="Switch Front / Back Camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => endVideoCall(true)}
              className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg transition"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* PHOTO EDITOR MODAL */}
      {isPhotoEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-4">
          <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-500/50 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-emerald-200 dark:border-emerald-800 pb-3">
              <h3 className="text-sm font-bold text-emerald-950 dark:text-white uppercase flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> Photo Editor (Draw & Crop)
              </h3>
              <button type="button" onClick={() => setIsPhotoEditorOpen(false)} className="text-emerald-700/80 dark:text-slate-400 hover:text-emerald-950 dark:hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex items-center justify-center bg-white dark:bg-slate-900 p-2 rounded-2xl border border-emerald-200 dark:border-emerald-800 overflow-hidden">
              <canvas
                ref={canvasRef}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                onPointerLeave={stopDrawing}
                className="block max-w-full max-h-[48vh] w-auto h-auto rounded touch-none select-none cursor-crosshair"
              />
            </div>

            {/* Brush Color & Thickness Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mr-1">Pen:</span>
                {['#10b981', '#ef4444', '#facc15', '#38bdf8', '#ffffff', '#0f172a'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDrawColor(c)}
                    aria-label={`Select color ${c}`}
                    className={`w-6 h-6 rounded-full border-2 transition ${
                      drawColor === c ? 'border-emerald-400 scale-110 shadow' : 'border-slate-300 dark:border-slate-700'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {[3, 6, 11].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setDrawWidth(w)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                      drawWidth === w
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-emerald-100/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                    }`}
                  >
                    {w === 3 ? 'Thin' : w === 6 ? 'Med' : 'Bold'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUndoEditor}
                  disabled={editorUndoStack.length === 0}
                  className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-600/50 rounded-xl text-amber-900 dark:text-amber-200 hover:bg-amber-200 font-semibold disabled:opacity-40"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={handleCropSquare}
                  className="px-3 py-1.5 bg-emerald-100/80 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800 font-semibold"
                >
                  Square Crop
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilterGrayscale}
                  className="px-3 py-1.5 bg-emerald-100/80 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800 font-semibold"
                >
                  Grayscale
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPhotoEditorOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedPhoto}
                  className="px-4 py-1.5 bg-emerald-400 text-slate-950 font-bold rounded-xl shadow"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHARED MEDIA GALLERY MODAL */}
      {isMediaGalleryOpen &&
        (() => {
          const scopedMedia = messages.filter(
            (m) =>
              Boolean(m.mediaUrl) &&
              !blockedUsers.includes(m.sender) &&
              (galleryScope === 'all' || messageBelongsToRoom(m, activeChat, currentUser?.name || ''))
          );
          const counts = {
            all: scopedMedia.length,
            image: scopedMedia.filter((m) => m.mediaType === 'image').length,
            video: scopedMedia.filter((m) => m.mediaType === 'video').length,
            audio: scopedMedia.filter((m) => m.mediaType === 'audio').length
          };
          const filteredGallery =
            galleryFilter === 'all' ? scopedMedia : scopedMedia.filter((m) => m.mediaType === galleryFilter);
          return (
            <div className="fixed inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-4">
              <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-500/50 rounded-3xl p-5 max-w-2xl w-full space-y-4 shadow-2xl max-h-[88vh] flex flex-col">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-emerald-200 dark:border-emerald-800 pb-3 shrink-0">
                  <h3 className="text-sm font-bold text-emerald-950 dark:text-white uppercase flex items-center gap-2">
                    {galleryFilter === 'video' ? (
                      <Video className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    )}
                    {galleryFilter === 'video' ? 'Shared Videos' : 'Media Gallery'} (
                    {galleryScope === 'all' ? 'All Chats' : activeChat})
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg bg-white dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setGalleryScope('chat')}
                        className={`px-2 py-1 rounded-md font-bold transition ${
                          galleryScope === 'chat' ? 'bg-emerald-400 text-slate-950' : 'text-emerald-200'
                        }`}
                      >
                        {activeChat}
                      </button>
                      <button
                        type="button"
                        onClick={() => setGalleryScope('all')}
                        className={`px-2 py-1 rounded-md font-bold transition ${
                          galleryScope === 'all' ? 'bg-emerald-400 text-slate-950' : 'text-emerald-200'
                        }`}
                      >
                        All Chats
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGalleryVideo(null);
                        setIsMediaGalleryOpen(false);
                      }}
                      className="text-emerald-800 dark:text-slate-300 hover:text-emerald-950 dark:hover:text-white px-2 py-1 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Switchable Gallery Tabs */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  {(['all', 'video', 'image', 'audio'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setGalleryFilter(tab);
                        setSelectedGalleryVideo(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition flex items-center gap-1.5 ${
                        galleryFilter === tab
                          ? 'bg-emerald-400 text-slate-950 shadow'
                          : 'bg-emerald-900/70 text-emerald-200 border border-emerald-700 hover:bg-emerald-800'
                      }`}
                    >
                      {tab === 'video' && <Video className="w-3.5 h-3.5" />}
                      <span>{tab === 'all' ? `All (${counts.all})` : `${tab}s (${counts[tab]})`}</span>
                    </button>
                  ))}
                </div>

                {/* Expanded Video Player with Sound Enabled */}
                {selectedGalleryVideo && selectedGalleryVideo.mediaUrl && (
                  <div className="p-3 rounded-2xl bg-white dark:bg-emerald-900/70 border border-emerald-500/50 space-y-2 shrink-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-950 dark:text-white truncate">
                        Playing Video from {selectedGalleryVideo.sender} ({selectedGalleryVideo.receiver})
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedGalleryVideo(null)}
                        className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white text-[11px] font-bold"
                      >
                        Close Player
                      </button>
                    </div>
                    <ChatVideoPlayer
                      src={selectedGalleryVideo.mediaUrl}
                      title={selectedGalleryVideo.text || 'Shared Chat Video'}
                      subtitle={`${selectedGalleryVideo.sender} • ${selectedGalleryVideo.time}`}
                      autoPlayWithSound
                    />
                  </div>
                )}

                <div
                  className={`flex-1 overflow-y-auto grid gap-3 p-1 ${
                    galleryFilter === 'video' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
                  }`}
                >
                  {filteredGallery.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-emerald-700 dark:text-emerald-400 text-xs">
                      No shared {galleryFilter === 'all' ? 'media' : galleryFilter} files in{' '}
                      {galleryScope === 'all' ? 'any chat' : activeChat} yet.
                    </div>
                  ) : (
                    filteredGallery.map((m) => (
                      <div
                        key={m.id}
                        className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-2.5 space-y-2 flex flex-col justify-between"
                      >
                        {m.mediaType === 'image' && (
                          <img src={m.mediaUrl} alt="" className="w-full h-28 object-cover rounded-xl" />
                        )}
                        {m.mediaType === 'video' && m.mediaUrl && (
                          <div className="space-y-1.5">
                            <ChatVideoPlayer
                              src={m.mediaUrl}
                              title={m.text || 'Shared Video'}
                              subtitle={`${m.receiver} • ${m.time}`}
                              compact
                            />
                            <button
                              type="button"
                              onClick={() => setSelectedGalleryVideo(m)}
                              className="w-full py-1.5 rounded-lg bg-emerald-400/20 border border-emerald-400/50 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-400 hover:text-slate-950 font-bold text-[11px] transition"
                            >
                              Expand Video with Sound
                            </button>
                          </div>
                        )}
                        {m.mediaType === 'audio' && <audio src={m.mediaUrl} controls className="w-full h-8 my-auto" />}
                        {m.mediaType === 'file' && (
                          <div className="text-amber-700 dark:text-amber-300 text-xs py-8 text-center">📎 Shared File</div>
                        )}
                        {m.mediaType !== 'video' && (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-300 truncate w-full text-center">
                            {m.sender} • {m.time}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-emerald-200 dark:border-emerald-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGalleryVideo(null);
                      setIsMediaGalleryOpen(false);
                    }}
                    className="px-4 py-2 bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow"
                  >
                    Close Gallery
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* SIDEBAR / MOBILE SWIPEABLE NAV BAR */}
      <aside className={`w-full md:w-60 ${theme.sidebarBg} border-b md:border-b-0 md:border-r p-2.5 md:p-3 flex flex-row md:flex-col justify-between shrink-0 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto touch-pan-x md:touch-pan-y overscroll-x-contain [-webkit-overflow-scrolling:touch] transition-colors`}>
        <div className="flex md:flex-col items-center md:items-stretch gap-1.5 w-max md:w-full">
          <div className="hidden md:flex items-center gap-2.5 px-2 py-2 mb-2">
            <button
              type="button"
              onClick={() => setIsAppIconShareModalOpen(true)}
              className={`relative w-10 h-13 rounded-lg border-2 ${theme.sidebarBrandBorder} p-0.5 shrink-0 hover:scale-105 transition shadow cursor-pointer group`}
              title={`Open App Icon Emoji Link (${activeEmojiLink?.emojiCode || '🔐🟢💬✨🚀'})`}
            >
              <img
                src={activeEmojiLink?.iconUrl || DEFAULT_AVATAR}
                alt="Choy Chat App Icon"
                className="w-full h-full object-contain rounded"
              />
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-slate-950 border border-amber-400 text-[9px] leading-none whitespace-nowrap shadow">
                {activeEmojiLink?.emojiCode || '🔐🟢💬'}
              </span>
            </button>
            <div className="min-w-0">
              <div className={`text-sm font-bold truncate ${theme.sidebarTitleText}`}>Choy Chat</div>
              <div className={`text-[10px] flex items-center gap-1 ${theme.sidebarSubText}`}>
                <Cloud className="w-3 h-3" /> {storageMode === 'postgres' ? 'Postgres Synced' : 'Live Synced'}
              </div>
            </div>
          </div>

          <nav className="flex md:flex-col gap-1.5 md:gap-1 w-max md:w-full text-xs font-medium pr-3 md:pr-0">
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
                activeTab === 'feed' ? theme.navActive : theme.navInactive
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Newsfeed</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('people')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
                activeTab === 'people' ? theme.navActive : theme.navInactive
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>People</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('videos')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
                activeTab === 'videos' ? theme.navActive : theme.navInactive
              }`}
            >
              <Video className="w-4 h-4 shrink-0" />
              <span>Videos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
                activeTab === 'messages' ? theme.navActive : theme.navInactive
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Messages</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
                  activeTab === 'ledger' ? theme.navActive : theme.navInactive
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Milestone</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
                activeTab === 'analytics' ? theme.navActive : theme.navInactive
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('choyai')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
                activeTab === 'choyai' ? 'bg-cyan-400 text-slate-950 font-bold' : theme.navInactive
              }`}
            >
              <img
                src={DEFAULT_AVATAR}
                alt=""
                className="w-4 h-5 rounded bg-emerald-50 dark:bg-emerald-950 object-contain shrink-0 border border-cyan-300"
              />
              <span>Choy AI</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('github')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
                activeTab === 'github' ? theme.navActive : theme.navInactive
              }`}
            >
              <GitBranch className="w-4 h-4 shrink-0" />
              <span>GitHub Intelligence</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`md:hidden px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
                activeTab === 'profile' ? theme.navActive : theme.navInactive
              }`}
            >
              <img
                src={getUserAvatar(currentUser)}
                alt=""
                className={`w-4 h-5 rounded bg-white dark:bg-slate-900 shrink-0 border border-emerald-400 ${
                  isCustomAvatar(getUserAvatar(currentUser)) ? 'object-cover' : 'object-contain'
                }`}
              />
              <span>Account</span>
            </button>

            {isAdmin && (
              <>
                <div className="pt-2 pb-1 text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300 hidden md:block px-2">
                  Admin Panel
                </div>


                <button
                  type="button"
                  onClick={() => setActiveTab('admin_knowledge')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
                    activeTab === 'admin_knowledge'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-indigo-700 hover:bg-indigo-100 dark:text-indigo-200 dark:hover:bg-indigo-900/60'
                  }`}
                >
                  <Database className="w-4 h-4 shrink-0" />
                  <span>AI Brain</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admin_prices')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
                    activeTab === 'admin_prices'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-indigo-700 hover:bg-indigo-100 dark:text-indigo-200 dark:hover:bg-indigo-900/60'
                  }`}
                >
                  <Sliders className="w-4 h-4 shrink-0" />
                  <span>Unit Prices</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admin_newsfeeds')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition ${
                    activeTab === 'admin_newsfeeds'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-indigo-700 hover:bg-indigo-100 dark:text-indigo-200 dark:hover:bg-indigo-900/60'
                  }`}
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>Newsfeed Setup</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admin_security')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition ${
                    activeTab === 'admin_security'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-indigo-700 hover:bg-indigo-100 dark:text-indigo-200 dark:hover:bg-indigo-900/60'
                  }`}
                >
                  <Key className="w-4 h-4 shrink-0" />
                  <span>Security Studio</span>
                </button>
              </>
            )}
          </nav>
        </div>

        <div className={`hidden md:block pt-3 border-t ${theme.sidebarFooterBorder} space-y-2`}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`w-full p-2 rounded-xl border ${theme.sidebarCard} flex items-center gap-2 text-left transition`}
          >
            <img
              src={getUserAvatar(currentUser)}
              alt=""
              className={`w-8 h-11 rounded-lg bg-white dark:bg-slate-900 shrink-0 border border-current/25 ${
                isCustomAvatar(getUserAvatar(currentUser)) ? 'object-cover' : 'object-contain'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className={`text-[11px] font-bold truncate ${theme.sidebarTitleText}`}>{currentUser.name}</div>
              <div className={`text-[9px] truncate ${theme.sidebarMutedText}`}>{isAdmin ? 'Admin • Synced' : 'Member • Synced'}</div>
            </div>
          </button>
          <div className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl border ${theme.sidebarCard} text-xs`}>
            <span className={`font-bold flex items-center gap-1.5 truncate ${theme.sidebarTitleText}`}>
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${theme.sidebarMutedText}`} /> Headbubble
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {isDocPipSupported && (
                <button
                  type="button"
                  onClick={() => openFloatingHeadBubbleWindow()}
                  title="Pop out floating window outside browser"
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    isHeadBubblePipOpen
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : theme.chatSecondaryBtn + ' border'
                  }`}
                >
                  {isHeadBubblePipOpen ? 'Popped' : 'Pop Out'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const next = !chatHeadBubbleEnabled;
                  setChatHeadBubbleEnabled(next);
                  localStorage.setItem('choychat_chat_head_bubble_v1', String(next));
                  if (!next) {
                    setActiveChatHeadMessage(null);
                  } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                    void subscribeToBackgroundPush(false);
                  }
                  showNotice(next ? 'Chat Head Bubbles Enabled' : 'Chat Head Bubbles Disabled');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                  chatHeadBubbleEnabled
                    ? theme.navActive
                    : theme.drawerSegmentedInactive
                }`}
              >
                {chatHeadBubbleEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMenuDrawerOpen(true)}
            className={`w-full px-3 py-2 rounded-xl border ${theme.sidebarCard} ${theme.sidebarTitleText} text-xs font-semibold flex items-center justify-center gap-2 transition`}
          >
            <MoreVertical className="w-3.5 h-3.5" /> Menu &amp; Settings
          </button>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP BAR — FULL-WIDTH DESIGNED CHOY CHAT BANNER */}
        <header className={`relative z-30 flex flex-col px-3 sm:px-5 pt-3 pb-3 border-b ${theme.topHeaderBg} shrink-0 gap-2.5 transition-colors`}>
          {/* Full-width edge-to-edge CHOY CHAT Hero Banner */}
          <div className={`relative w-full overflow-hidden rounded-2xl border ${theme.heroCard} px-3 sm:px-6 py-2.5 sm:py-3.5 transition-colors`}>
            {/* Soft ambient glow */}
            <div className={`pointer-events-none absolute -top-10 left-1/4 w-48 h-24 rounded-full ${theme.heroGlowA} blur-2xl`}></div>
            <div className={`pointer-events-none absolute -bottom-10 right-1/4 w-48 h-24 rounded-full ${theme.heroGlowB} blur-2xl`}></div>

            {/* Ornamental Corner Accents */}
            <span className={`pointer-events-none absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 ${theme.heroCorner} rounded-tl-md`}></span>
            <span className={`pointer-events-none absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 ${theme.heroCorner} rounded-tr-md`}></span>
            <span className={`pointer-events-none absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 ${theme.heroCorner} rounded-bl-md`}></span>
            <span className={`pointer-events-none absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 ${theme.heroCorner} rounded-br-md`}></span>

            <div className="relative z-10 w-full flex items-center justify-between gap-2 sm:gap-4">
              {/* Left ornamental wing */}
              <div className="hidden xs:flex sm:flex items-center gap-1.5 flex-1 min-w-[20px]">
                <span className={`h-[2px] flex-1 bg-gradient-to-r ${theme.heroWingLeft}`}></span>
                <span className={`w-2 h-2 rotate-45 ${theme.heroGem} shrink-0`}></span>
              </div>

              {/* Stretched Full-Width CHOY CHAT Wordmark */}
              <h1 className={`flex-1 sm:flex-none text-center font-black uppercase leading-none select-none text-[clamp(1.65rem,7.2vw,3.4rem)] tracking-[0.18em] sm:tracking-[0.28em] md:tracking-[0.34em] bg-gradient-to-r ${theme.heroWordmark} bg-clip-text text-transparent whitespace-nowrap pl-[0.18em] sm:pl-[0.28em] md:pl-[0.34em]`}>
                CHOY CHAT
              </h1>

              {/* Right ornamental wing */}
              <div className="hidden xs:flex sm:flex items-center gap-1.5 flex-1 min-w-[20px]">
                <span className={`w-2 h-2 rotate-45 ${theme.heroGem} shrink-0`}></span>
                <span className={`h-[2px] flex-1 bg-gradient-to-l ${theme.heroWingRight}`}></span>
              </div>
            </div>

            {/* Subtle bottom shimmer line */}
            <div className={`relative z-10 mt-1.5 flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.25em] ${theme.heroSubtitleRow}`}>
              <span className={`h-px w-8 sm:w-16 bg-gradient-to-r from-transparent ${theme.heroSubtitleLineLeft}`}></span>
              <span className="truncate">VIP Social • Live Cloud Sync</span>
              <span className={`h-px w-8 sm:w-16 bg-gradient-to-l from-transparent ${theme.heroSubtitleLineRight}`}></span>
            </div>
          </div>

          {/* Action & Search Row */}
          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsAppIconShareModalOpen(true)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border transition shrink-0 shadow-xs ${theme.searchButton}`}
              title="Share Emoji Link with App Icon Image"
            >
              <img
                src={activeEmojiLink?.iconUrl || DEFAULT_AVATAR}
                alt="App Icon"
                className="w-6 h-7 rounded-md object-contain bg-slate-950 border border-white/30 shrink-0"
              />
              <span className="text-xs leading-none tracking-tight">
                {activeEmojiLink?.emojiCode || '🔐🟢💬✨🚀'}
              </span>
            </button>
            <div ref={searchContainerRef} className="relative flex-1 min-w-0 z-30">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${theme.searchIcon}`} />
              <input
                type="text"
                placeholder="Search users, posts, chats..."
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                className={`w-full pl-9 pr-8 py-2 border rounded-xl text-xs focus:outline-none shadow-inner ${theme.searchInput}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Live Global User Search Dropdown */}
              {isSearchOpen && normalizedSearch.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl bg-white dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 shadow-2xl overflow-hidden z-50">
                  <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/80 border-b border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    <span>People ({filteredUsers.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('people');
                        setIsSearchOpen(false);
                      }}
                      className="text-emerald-800 dark:text-emerald-200 hover:underline normal-case font-semibold"
                    >
                      Open People Tab →
                    </button>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <div className="p-3.5 text-center text-xs text-emerald-700 dark:text-emerald-300">
                      No user found matching <span className="font-bold">"{searchQuery.trim()}"</span>.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto divide-y divide-emerald-100 dark:divide-emerald-800/80">
                      {filteredUsers.slice(0, 8).map((u) => {
                        const isMe = u.id === currentUser.id;
                        return (
                          <div
                            key={u.id}
                            className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/70 transition"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setIsSearchOpen(false);
                                openUserProfile(u);
                              }}
                              className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                            >
                              <img
                                src={getUserAvatar(u)}
                                alt=""
                                className={`w-7 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900 border border-emerald-500/50 shrink-0 ${
                                  isCustomAvatar(getUserAvatar(u)) ? 'object-cover' : 'object-contain'
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-emerald-950 dark:text-white truncate">
                                  {u.name} {isMe ? '(You)' : ''}
                                </div>
                                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 truncate">
                                  {u.role === 'admin' ? 'Admin' : 'Active Member'}
                                  {(isAdmin || isMe) && u.phone && u.phone.toLowerCase() !== 'member'
                                    ? ` · ${u.phone}`
                                    : ''}
                                </div>
                              </div>
                            </button>
                            {!isMe && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSearchOpen(false);
                                  handleMessageUser(u.name);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[11px] font-bold shrink-0 transition"
                              >
                                Message
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsMenuDrawerOpen(true)}
              className={`p-2.5 border rounded-xl transition shrink-0 shadow-xs ${theme.searchButton}`}
              title="Open Menu & Settings"
              aria-label="Open Menu and Settings"
              aria-expanded={isMenuDrawerOpen}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </header>

        {syncNotice && (
          <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-100 text-xs flex items-center justify-between shrink-0">
            <span>{syncNotice}</span>
            <button type="button" onClick={() => setSyncNotice('')} className="font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] p-4 pb-28 md:p-6 md:pb-6 min-w-0">
          {/* FEED */}
          {activeTab === 'feed' && (
            <div className="max-w-2xl mx-auto space-y-4">
              {/* MOVING ANNOUNCEMENT & REMINDER SLIDE BANNER */}
              {visibleAnnouncements.length > 0 ? (() => {
                const safeIdx = bannerSlideIndex % visibleAnnouncements.length;
                const activeSlide = visibleAnnouncements[safeIdx];
                const toneClasses =
                  activeSlide.tone === 'rose'
                    ? 'border-rose-300 dark:border-rose-500/50 bg-gradient-to-br from-rose-50 via-white to-amber-50/70 dark:from-rose-950/70 dark:via-emerald-950/90 dark:to-slate-950'
                    : activeSlide.tone === 'sky'
                    ? 'border-sky-300 dark:border-sky-500/50 bg-gradient-to-br from-sky-50 via-white to-emerald-50/70 dark:from-sky-950/70 dark:via-emerald-950/90 dark:to-slate-950'
                    : activeSlide.tone === 'amber'
                    ? 'border-amber-300 dark:border-amber-500/50 bg-gradient-to-br from-amber-50 via-white to-emerald-50/70 dark:from-amber-950/60 dark:via-emerald-950/90 dark:to-slate-950'
                    : 'border-emerald-300 dark:border-emerald-500/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 dark:from-emerald-900/70 dark:via-emerald-950/95 dark:to-slate-950';

                return (
                  <div className={`rounded-2xl border shadow-sm overflow-hidden transition-colors ${toneClasses}`}>
                    {/* Header controls */}
                    <div className="px-3.5 py-2 border-b border-emerald-200/70 dark:border-emerald-800/70 flex flex-wrap items-center justify-between gap-2 bg-white/60 dark:bg-slate-950/40">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Megaphone className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300 shrink-0" />
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                            activeSlide.badge === 'urgent'
                              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200'
                              : activeSlide.badge === 'reminder'
                              ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-200'
                              : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200'
                          }`}
                        >
                          {activeSlide.badge}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          {getAnnouncementTargetLabel(activeSlide.target)}
                        </span>
                        {visibleAnnouncements.length > 1 && (
                          <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                            {safeIdx + 1}/{visibleAnnouncements.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {visibleAnnouncements.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setBannerSlideIndex(
                                  (prev) => (prev - 1 + visibleAnnouncements.length) % visibleAnnouncements.length
                                )
                              }
                              className="p-1 rounded-lg bg-white/90 dark:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100"
                              title="Previous slide"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setBannerSlideIndex((prev) => (prev + 1) % visibleAnnouncements.length)
                              }
                              className="p-1 rounded-lg bg-white/90 dark:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100"
                              title="Next slide"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setBannerPaused((p) => !p)}
                          className="px-2 py-1 rounded-lg bg-white/90 dark:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-bold text-[10px] inline-flex items-center gap-1 hover:bg-emerald-100"
                          title={bannerPaused ? 'Play moving slide banner' : 'Pause moving slide banner'}
                        >
                          {bannerPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                          <span>{bannerPaused ? 'Play' : 'Pause'}</span>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setSecurityInitialModule('announcements');
                              setActiveTab('admin_security');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[10px] inline-flex items-center gap-1 shadow-sm"
                          >
                            Setup Banner
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sliding Carousel Viewport */}
                    <div
                      className="overflow-hidden"
                      onMouseEnter={() => setBannerPaused(true)}
                      onMouseLeave={() => setBannerPaused(false)}
                    >
                      <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{ transform: `translateX(-${safeIdx * 100}%)` }}
                      >
                        {visibleAnnouncements.map((slide) => (
                          <div key={slide.id} className="w-full shrink-0 px-4 py-3 space-y-1">
                            <h3 className="text-sm font-extrabold text-emerald-950 dark:text-white leading-tight">
                              {slide.title}
                            </h3>
                            <p className="text-xs text-emerald-800 dark:text-emerald-100 leading-relaxed whitespace-pre-wrap">
                              {slide.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Slide Dots */}
                    {visibleAnnouncements.length > 1 && (
                      <div className="flex items-center justify-center gap-1.5 pb-2">
                        {visibleAnnouncements.map((s, idx) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setBannerSlideIndex(idx)}
                            aria-label={`Show slide ${idx + 1}`}
                            className={`h-1.5 rounded-full transition-all ${
                              idx === safeIdx
                                ? 'w-5 bg-amber-500 dark:bg-amber-400'
                                : 'w-1.5 bg-emerald-300 dark:bg-emerald-700 hover:bg-emerald-400'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Continuous Moving Marquee Ticker Strip */}
                    <div className="choy-ticker-wrapper overflow-hidden border-t border-emerald-200/80 dark:border-emerald-800/80 bg-amber-50/90 dark:bg-slate-950/60 py-1.5">
                      <div
                        className="choy-ticker-track text-[11px] font-bold text-amber-950 dark:text-amber-200 whitespace-nowrap"
                        style={{ animationPlayState: bannerPaused ? 'paused' : 'running' }}
                      >
                        {[...visibleAnnouncements, ...visibleAnnouncements].map((s, idx) => (
                          <span key={`${s.id}_tick_${idx}`} className="inline-flex items-center gap-2 px-4">
                            <Megaphone className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200">
                              {s.badge}
                            </span>
                            <span>{s.title} —</span>
                            <span className="font-normal opacity-95">{s.message}</span>
                            <span className="opacity-40">•</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })() : isAdmin ? (
                <div className="bg-white dark:bg-emerald-900/50 border border-dashed border-amber-300 dark:border-amber-500/50 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-100">
                    <Megaphone className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-semibold">
                      Walay active Moving Announcement / Reminder Slide Banner karon.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSecurityInitialModule('announcements');
                      setActiveTab('admin_security');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px] shadow-sm"
                  >
                    Setup Announcement Banner
                  </button>
                </div>
              ) : null}

              <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-3 shadow space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 dark:border-emerald-800 pb-2 text-xs font-bold">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNewPostCategory('feed')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                        newPostCategory === 'feed'
                          ? theme.feedTabActive
                          : 'text-emerald-800 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/80 hover:bg-emerald-200/80 dark:hover:bg-emerald-800'
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" /> Post Feed
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPostCategory('myday')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                        newPostCategory === 'myday'
                          ? theme.feedTabActive
                          : 'text-emerald-800 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/80 hover:bg-emerald-200/80 dark:hover:bg-emerald-800'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Story (My Day)
                    </button>
                  </div>

                  {isAdmin && (
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-200">
                      <span className="whitespace-nowrap">Target Newsfeed:</span>
                      <select
                        value={newPostNewsfeed}
                        onChange={(e) => setNewPostNewsfeed(e.target.value as SelectableNewsfeed)}
                        className="px-2 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-white text-[11px] font-bold"
                      >
                        <option value="feed_a">{newsfeedConfig.feedATitle}</option>
                        <option value="feed_b">{newsfeedConfig.feedBTitle}</option>
                        <option value="feed_c">{newsfeedConfig.feedCTitle}</option>
                        <option value="feed_bc">B &amp; C ({newsfeedConfig.feedBTitle} &amp; {newsfeedConfig.feedCTitle})</option>
                      </select>
                    </label>
                  )}
                </div>

                <form onSubmit={handleCreatePost}>
                  <input
                    type="file"
                    ref={postFileInputRef}
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handlePostFileSelect}
                  />
                  <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl overflow-hidden focus-within:border-emerald-500 dark:focus-within:border-emerald-400 transition">
                    <textarea
                      rows={2}
                      placeholder="Share an update across all devices..."
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                      className="w-full px-3 pt-2.5 pb-1.5 bg-transparent text-xs text-emerald-950 dark:text-white placeholder-emerald-700/60 dark:placeholder-emerald-300/60 focus:outline-none resize-none"
                    ></textarea>

                    {newPostMedia && (
                      <div className="relative mx-2.5 mb-2 rounded-lg overflow-hidden bg-white dark:bg-slate-950/60 border border-emerald-300 dark:border-emerald-700 p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setNewPostMedia('');
                            setNewPostMediaName('');
                            setNewPostType('text');
                          }}
                          className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-lg bg-white/95 dark:bg-slate-950/85 border border-red-400/60 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:text-white text-[11px] font-bold shadow-sm"
                          title="Remove attachment"
                        >
                          ✕
                        </button>
                        {newPostType === 'image' ? (
                          <img
                            src={newPostMedia}
                            alt="Selected attachment"
                            className="max-h-48 w-full object-contain rounded-lg"
                          />
                        ) : (
                          <video
                            src={newPostMedia}
                            controls
                            playsInline
                            className="max-h-48 w-full rounded-lg bg-white dark:bg-slate-950"
                          />
                        )}
                        {newPostMediaName && (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-1 truncate px-1">{newPostMediaName}</div>
                        )}
                      </div>
                    )}

                    <div className="px-2.5 py-1.5 border-t border-emerald-200/80 dark:border-emerald-800/80 bg-white/40 dark:bg-emerald-900/30 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={isProcessingPostMedia}
                        onClick={() => postFileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-white/90 dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800 font-bold text-[11px] inline-flex items-center gap-1.5 transition disabled:opacity-60"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        <Plus className="w-3 h-3 text-emerald-700 dark:text-emerald-400 -ml-1" />
                        <span>{isProcessingPostMedia ? 'Loading...' : 'Image / Video'}</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isProcessingPostMedia || (!newPostText.trim() && !newPostMedia.trim())}
                        className="px-3.5 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg shadow disabled:opacity-50 transition"
                      >
                        Publish
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Public Newsfeed Posts */}
              <div className="space-y-3">
                {filteredPosts.length === 0 ? (
                  <div className="bg-emerald-50/80 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 text-center text-xs text-emerald-700 dark:text-emerald-300">
                    No posts yet. Publish your first update above to sync across all devices!
                  </div>
                ) : (
                  filteredPosts.map((p) => (
                    <div key={p.id} className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openUserProfile({
                              id: p.authorId,
                              name: p.author.name,
                              avatar: p.author.avatar
                            })
                          }
                          className="group flex items-center gap-2.5 text-left rounded-xl p-1 -m-1 hover:bg-emerald-50 dark:hover:bg-emerald-800/60 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                          title={`View ${p.author.name}'s profile`}
                        >
                          <div className="relative shrink-0">
                            {(() => {
                              const postAvatar = getUserAvatar({
                                id: p.authorId,
                                name: p.author.name,
                                avatar: p.author.avatar
                              });
                              return (
                                <img
                                  src={postAvatar}
                                  alt=""
                                  className={`w-9 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-500/50 group-hover:border-emerald-400 transition ${
                                    isCustomAvatar(postAvatar) ? 'object-cover' : 'object-contain'
                                  }`}
                                />
                              );
                            })()}
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-emerald-950 rounded-full"
                              title="Online"
                            ></span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-emerald-950 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 group-hover:underline">
                              {p.author.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                              <span>{p.timestamp}</span>
                              {isAdmin && (
                                <>
                                  <span>·</span>
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 border border-emerald-300/70 dark:border-emerald-700 font-bold text-emerald-800 dark:text-emerald-200">
                                    {getNewsfeedLabel(p.newsfeed)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                        {(p.authorId === currentUser.id || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(p.id)}
                            className="text-red-700 dark:text-red-300 hover:text-red-100"
                            title="Delete Post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {p.content && <p className="text-xs text-emerald-950 dark:text-slate-100 break-words">{p.content}</p>}
                      {p.mediaUrl && p.mediaType === 'image' && (
                        <button
                          type="button"
                          onClick={() =>
                            setZoomedImage({
                              src: p.mediaUrl!,
                              caption: p.content || `${p.author.name} • ${p.timestamp}`
                            })
                          }
                          className="group relative block w-full rounded-xl overflow-hidden bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-700/50 hover:border-emerald-400/80 transition cursor-zoom-in text-left"
                          title="Tap to zoom in / zoom out"
                        >
                          <img
                            src={p.mediaUrl}
                            alt={p.content || 'Post image'}
                            className="max-h-96 w-full object-contain group-hover:scale-[1.01] transition duration-200"
                          />
                          <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-white/95 dark:bg-slate-950/85 border border-emerald-500/50 dark:border-emerald-400/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold flex items-center gap-1 shadow">
                            <ZoomIn className="w-3 h-3" /> Tap to Zoom
                          </span>
                        </button>
                      )}
                      {p.mediaUrl && p.mediaType === 'video' && (
                        <ChatVideoPlayer src={p.mediaUrl} title={p.author.name} subtitle={p.timestamp} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PEOPLE TAB */}
          {activeTab === 'people' && (
            <div className="max-w-xl mx-auto space-y-3">
              {/* Dedicated People Search Bar */}
              <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700 dark:text-emerald-300 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={isAdmin ? 'Search user by name or phone...' : 'Search user by name...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white placeholder-emerald-600/60 dark:placeholder-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/70 dark:hover:bg-emerald-800 transition"
                      aria-label="Clear user search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-300 px-0.5">
                  <span>
                    Showing <span className="font-bold">{filteredUsers.length}</span> of{' '}
                    <span className="font-bold">{visibleUsersList.length}</span> user{visibleUsersList.length === 1 ? '' : 's'}
                  </span>
                  {normalizedSearch && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="font-bold text-emerald-800 dark:text-emerald-200 hover:underline"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-6 text-center space-y-2">
                  <div className="text-xs font-bold text-emerald-950 dark:text-white">
                    No user found for "{searchQuery.trim()}"
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Try another spelling or clear the search box to see all members.
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold transition"
                    >
                      Show All Users
                    </button>
                  )}
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isMe = u.id === currentUser.id;
                  const isBlocked = blockedUsers.includes(u.name);
                  return (
                    <div
                      key={u.id}
                      className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-4 flex items-center justify-between gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => openUserProfile(u)}
                        className="group flex items-center gap-3 min-w-0 flex-1 text-left rounded-xl p-1 -m-1 hover:bg-emerald-50 dark:hover:bg-emerald-800/50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                        title={`View ${u.name}'s profile`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={getUserAvatar(u)}
                            alt=""
                            className={`w-9 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-500/50 group-hover:border-emerald-400 transition ${
                              isCustomAvatar(getUserAvatar(u)) ? 'object-cover' : 'object-contain'
                            }`}
                          />
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-emerald-950 rounded-full"
                            title="Online"
                          ></span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-emerald-950 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 group-hover:underline">
                            {u.name} {isMe ? '(You)' : ''}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                            <span className="truncate">{u.role === 'admin' ? 'Admin' : 'Active'} · Tap to view profile</span>
                            {isAdmin && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 border border-emerald-300/70 dark:border-emerald-700 font-bold text-emerald-800 dark:text-emerald-200">
                                {getNewsfeedLabel(u.newsfeed)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                      {!isMe ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMessageUser(u.name)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 transition"
                          >
                            Message
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleBlockUser(u.name)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                              isBlocked
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900'
                            }`}
                          >
                            {isBlocked ? 'Blocked' : 'Block'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveTab('profile')}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition shrink-0"
                        >
                          My Profile
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIDEOS TAB */}
          {activeTab === 'videos' &&
            (() => {
              const sharedChatVideos = messages.filter(
                (m) => m.mediaType === 'video' && Boolean(m.mediaUrl) && !blockedUsers.includes(m.sender)
              );
              return (
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-emerald-950 dark:text-white flex items-center gap-2">
                        <Video className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> Shared Chat Videos ({sharedChatVideos.length})
                      </div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300">Sound Enabled • Cloud Synced</span>
                    </div>
                    {sharedChatVideos.length === 0 ? (
                      <div className="py-6 text-center text-xs text-emerald-700 dark:text-emerald-300">
                        No shared videos from chats yet. Share a video link in Messages to sync it across all devices.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sharedChatVideos.map((vid) => (
                          <div key={vid.id} className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 space-y-2">
                            <button
                              type="button"
                              onClick={() => openUserProfile({ id: vid.senderId, name: vid.sender })}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 dark:text-emerald-200 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline transition"
                              title={`View ${vid.sender}'s profile`}
                            >
                              <img
                                src={getUserAvatar({ id: vid.senderId, name: vid.sender })}
                                alt=""
                                className={`w-5 h-6 rounded bg-white dark:bg-emerald-900 border border-emerald-500/50 shrink-0 ${
                                  isCustomAvatar(getUserAvatar({ id: vid.senderId, name: vid.sender }))
                                    ? 'object-cover'
                                    : 'object-contain'
                                }`}
                              />
                              <span className="truncate">{vid.sender}</span>
                            </button>
                            <ChatVideoPlayer
                              src={vid.mediaUrl!}
                              title={vid.text || `Video from ${vid.sender}`}
                              subtitle={`${vid.receiver} • ${vid.time}`}
                              compact
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-4 space-y-2">
                    <div className="text-xs font-bold text-emerald-950 dark:text-white">Video Streams & Entertainment</div>
                    <ChatVideoPlayer
                      src="https://www.w3schools.com/html/mov_bbb.mp4"
                      title="Featured Stream"
                      subtitle="HD Audio"
                    />
                  </div>
                </div>
              );
            })()}

          {/* CLEAN PROFILE DASHBOARD (ALL CONTROLS MOVED TO 3-DOTS MENU DRAWER) */}
          {activeTab === 'profile' &&
            (() => {
              const myLower = currentUser.name.trim().toLowerCase();
              const myPosts = posts.filter(
                (p) => p.authorId === currentUser.id || p.author.name.trim().toLowerCase() === myLower
              );
              const myMessages = messages.filter(
                (m) => m.senderId === currentUser.id || m.sender.trim().toLowerCase() === myLower
              );
              const myMediaCount =
                myPosts.filter((p) => Boolean(p.mediaUrl)).length +
                myMessages.filter((m) => Boolean(m.mediaUrl)).length;
              const myHandle = `@${currentUser.name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'member'}`;
              const myAvatar = getUserAvatar(currentUser);
              const hasCustomPhoto = isCustomAvatar(myAvatar);

              return (
                <div className="max-w-2xl mx-auto space-y-5">
                  {/* Clean Account Identity Card */}
                  <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                      <div className="relative w-full max-w-[220px] shrink-0">
                        <div
                          onClick={() =>
                            setZoomedImage({
                              src: myAvatar,
                              caption: `${currentUser.name} (${isAdmin ? 'Admin' : 'Active Member'})`
                            })
                          }
                          className={`relative w-full ${
                            hasCustomPhoto ? 'aspect-square max-h-[240px]' : 'aspect-[9/16] max-h-[340px]'
                          } rounded-2xl bg-emerald-50 dark:bg-emerald-950 border-2 border-emerald-500/80 dark:border-emerald-400/80 p-1.5 overflow-hidden shadow-lg cursor-zoom-in`}
                          title="Tap to zoom"
                        >
                          <img
                            src={myAvatar}
                            alt="Account portrait"
                            className={`w-full h-full rounded-xl ${
                              hasCustomPhoto ? 'object-cover' : 'object-contain'
                            }`}
                          />
                        </div>
                        <button
                          type="button"
                          disabled={isUpdatingAvatar}
                          onClick={() => profileAvatarInputRef.current?.click()}
                          className="absolute bottom-2.5 right-2.5 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-400 dark:hover:bg-emerald-300 text-white dark:text-slate-950 border-2 border-white dark:border-emerald-950 shadow-lg transition disabled:opacity-60"
                          title={hasCustomPhoto ? 'Change profile picture' : 'Add profile picture'}
                          aria-label={hasCustomPhoto ? 'Change profile picture' : 'Add profile picture'}
                        >
                          {isUpdatingAvatar ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Camera className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <div className="min-w-0 flex-1 text-center sm:text-left space-y-2.5 pt-1">
                        <div>
                          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">My Account</div>
                          <h2 className="text-xl font-black text-emerald-950 dark:text-white truncate">{currentUser.name}</h2>
                          <div className="text-xs text-emerald-700 dark:text-emerald-300 font-mono truncate">{myHandle}</div>
                          <div className="text-xs text-emerald-800 dark:text-emerald-200 font-mono tabular-nums truncate mt-0.5">
                            {currentUser.phone}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs text-emerald-800 dark:text-emerald-200">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            {storageMode === 'postgres' ? 'PostgreSQL Cloud Sync' : 'Live Server Sync'}
                          </span>
                          <span aria-hidden="true" className="text-emerald-400 dark:text-emerald-600">·</span>
                          <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                            {isAdmin ? 'Admin' : 'Active Member'}
                          </span>
                          {isAdmin && (
                            <>
                              <span aria-hidden="true" className="text-emerald-400 dark:text-emerald-600">·</span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 border border-emerald-300/70 dark:border-emerald-700 text-[11px] font-bold text-emerald-800 dark:text-emerald-200">
                                <Globe className="w-3 h-3" />
                                {getNewsfeedLabel(currentUser.newsfeed)}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Add / Change Profile Picture & Name Actions */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1.5">
                          <button
                            type="button"
                            disabled={isUpdatingAvatar}
                            onClick={() => profileAvatarInputRef.current?.click()}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-400 dark:hover:bg-emerald-300 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition disabled:opacity-60"
                          >
                            {isUpdatingAvatar ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Camera className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {isUpdatingAvatar
                                ? 'Saving Photo...'
                                : hasCustomPhoto
                                ? 'Change Profile Pic'
                                : 'Add Profile Pic'}
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingName}
                            onClick={() => (isEditingName ? cancelNameEditor() : openNameEditor())}
                            className="px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 transition disabled:opacity-60"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isEditingName ? 'Cancel' : 'Change Name'}</span>
                          </button>
                          {hasCustomPhoto && (
                            <button
                              type="button"
                              disabled={isUpdatingAvatar}
                              onClick={handleRemoveProfileAvatar}
                              className="px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-xs font-semibold transition disabled:opacity-60"
                            >
                              Reset Photo
                            </button>
                          )}
                        </div>

                        {isEditingName && (
                          <form
                            onSubmit={handleSaveProfileName}
                            className="mt-3 p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/80 space-y-2 text-left"
                          >
                            <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-200">
                              New Display Name
                            </label>
                            {nameEditError && (
                              <div
                                role="alert"
                                className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-[11px] text-rose-700 dark:text-rose-200"
                              >
                                {nameEditError}
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="text"
                                required
                                minLength={2}
                                maxLength={60}
                                value={nameDraft}
                                onChange={(e) => setNameDraft(e.target.value)}
                                placeholder="Enter new name..."
                                className="flex-1 min-h-[38px] px-3 py-2 rounded-xl bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-xs text-emerald-950 dark:text-white placeholder-emerald-500/70 focus:outline-none focus:border-emerald-500"
                              />
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="submit"
                                  disabled={isUpdatingName || nameDraft.trim().length < 2}
                                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-400 dark:hover:bg-emerald-300 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition disabled:opacity-50"
                                >
                                  {isUpdatingName && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                  <span>{isUpdatingName ? 'Saving...' : 'Save Name'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isUpdatingName}
                                  onClick={cancelNameEditor}
                                  className="px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-800 transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>

                    {/* Profile Activity Stats */}
                    <div className="grid grid-cols-3 divide-x divide-emerald-200 dark:divide-emerald-800 border-t border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/50">
                      <div className="py-3 px-2 text-center">
                        <div className="text-base font-black text-emerald-950 dark:text-white font-mono">{myPosts.length}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Posts</div>
                      </div>
                      <div className="py-3 px-2 text-center">
                        <div className="text-base font-black text-emerald-950 dark:text-white font-mono">{myMediaCount}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Media</div>
                      </div>
                      <div className="py-3 px-2 text-center">
                        <div className="text-base font-black text-emerald-950 dark:text-white font-mono">{myMessages.length}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Messages</div>
                      </div>
                    </div>
                  </div>

                  {/* My Recent Posts */}
                  <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      My Posts ({myPosts.length})
                    </div>
                    {myPosts.length === 0 ? (
                      <div className="p-5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center text-xs text-emerald-700 dark:text-emerald-300">
                        You haven&apos;t published any posts yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myPosts.map((post) => (
                          <div
                            key={post.id}
                            className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 space-y-2"
                          >
                            <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-300">
                              <span className="font-bold text-emerald-950 dark:text-white">{post.author.name}</span>
                              <span>{post.timestamp}</span>
                            </div>
                            {post.content && (
                              <p className="text-xs text-emerald-950 dark:text-slate-100 break-words">{post.content}</p>
                            )}
                            {post.mediaUrl && post.mediaType === 'image' && (
                              <div
                                onClick={() =>
                                  setZoomedImage({
                                    src: post.mediaUrl!,
                                    caption: post.content || `${post.author.name} • ${post.timestamp}`
                                  })
                                }
                                className="rounded-lg overflow-hidden bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 cursor-zoom-in"
                              >
                                <img
                                  src={post.mediaUrl}
                                  alt={post.content || 'Post image'}
                                  className="max-h-72 w-full object-contain"
                                />
                              </div>
                            )}
                            {post.mediaUrl && post.mediaType === 'video' && (
                              <ChatVideoPlayer src={post.mediaUrl} title={post.author.name} subtitle={post.timestamp} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          {/* MESSAGES WITH REAL-TIME SYNC & REACTIONS */}
          {activeTab === 'messages' && (
            <div className="max-w-4xl mx-auto space-y-3">
              {!pushBannerDismissed &&
                pushPermission !== 'unsupported' &&
                pushPermission !== 'denied' &&
                !isPushSubscribed && (
                  <div className="bg-emerald-900/90 dark:bg-emerald-900/80 border border-emerald-400/60 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-white shadow">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-emerald-400/20 border border-emerald-400 flex items-center justify-center shrink-0 text-emerald-300">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white">
                          Enable Home-Screen Notifications
                        </div>
                        <div className="text-[10px] text-emerald-200">
                          Receive messages &amp; incoming video call profile alerts even when Choy Chat is closed (data on).
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isSubscribingPush}
                        onClick={() => subscribeToBackgroundPush(false)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-[11px] transition disabled:opacity-60"
                      >
                        {isSubscribingPush ? 'Enabling...' : 'Enable Alerts'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPushBannerDismissed(true)}
                        className="p-1.5 text-emerald-200 hover:text-white"
                        aria-label="Dismiss notification prompt"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

            <div className={`flex flex-col md:grid md:grid-cols-3 gap-3 md:gap-4 md:h-[580px]`}>
              <div className={`${theme.messagesPanelCard} border rounded-2xl p-3 flex flex-col space-y-2 shrink-0 transition-colors ${
                activeChatMobileView ? 'hidden md:flex' : 'flex'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className={`text-xs font-bold uppercase ${theme.sidebarMutedText}`}>Chats</div>
                  {msgSearchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => setMsgSearchQuery('')}
                      className="md:hidden text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
                <div className="relative md:hidden">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search all chat history..."
                    value={msgSearchQuery}
                    onChange={(e) => {
                      setMsgSearchQuery(e.target.value);
                      setMsgSearchScope('all');
                    }}
                    className="w-full pl-8 pr-7 py-1.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-[11px] text-emerald-950 dark:text-white placeholder-emerald-600/60 dark:placeholder-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  {msgSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMsgSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/70 dark:hover:bg-emerald-800"
                      aria-label="Clear chat history search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {msgSearchQuery.trim() ? (
                  <div className="md:hidden flex flex-col gap-2 overflow-y-auto max-h-[520px] touch-pan-y pr-1">
                    {(() => {
                      const q = msgSearchQuery.trim();
                      const hits = messages
                        .filter((m) => !blockedUsers.includes(m.sender))
                        .filter((m) => messageMatchesFullText(m, q, currentUser?.name || ''))
                        .slice()
                        .sort((a, b) => b.createdAtMs - a.createdAtMs);
                      if (hits.length === 0) {
                        return (
                          <div className="px-3 py-4 text-center text-[11px] text-emerald-700 dark:text-emerald-300">
                            No messages matched "{q}" across your chat history.
                          </div>
                        );
                      }
                      return (
                        <>
                          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 px-1">
                            {hits.length} match{hits.length === 1 ? '' : 'es'} across all chats
                          </div>
                          {hits.map((m) => {
                            const roomLabel = getMessageRoomLabel(m, currentUser?.name || '');
                            const bodyText = m.text || m.transcript || (m.mediaType !== 'text' ? `[${m.mediaType}]` : '');
                            return (
                              <button
                                key={`sidebar-hit-${m.id}`}
                                type="button"
                                onClick={() => jumpToSearchResultMessage(m)}
                                className="p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-amber-400 text-left space-y-1 transition w-full"
                              >
                                <div className="flex items-center justify-between gap-1.5 text-[10px]">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-200/80 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100 font-bold truncate">
                                    {highlightSearchMatches(roomLabel, q)}
                                  </span>
                                  <span className="text-emerald-600 dark:text-emerald-400 shrink-0">{m.time}</span>
                                </div>
                                <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                                  {highlightSearchMatches(m.sender, q)}
                                </div>
                                {bodyText && (
                                  <div className="text-[11px] text-emerald-950 dark:text-slate-100 line-clamp-2 break-words">
                                    {highlightSearchMatches(bodyText, q)}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[520px] touch-pan-y pr-1">
                  {filteredChatRooms.length === 0 ? (
                    <div className="px-3 py-2 space-y-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                      <div>No chats match "{searchQuery.trim()}"</div>
                      {searchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            setMsgSearchQuery(searchQuery.trim());
                            setMsgSearchScope('all');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-white font-bold text-[10px] hover:bg-emerald-300 dark:hover:bg-emerald-700 transition"
                        >
                          Search message history for "{searchQuery.trim()}"
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredChatRooms.map((room) => {
                      const isActive = activeChat === room;
                      const isVipGroup = room.trim().toLowerCase() === 'vip group';
                      const isRoomOnline =
                        isVipGroup ||
                        onlineUsers.includes(room.trim().toLowerCase());
                      const roomAvatar = isVipGroup ? '' : getUserAvatar({ name: room });
                      const latestMsg = getLatestMessageForRoom(room);
                      const snippet = latestMsg
                        ? (latestMsg.text || (latestMsg.mediaUrl ? `[Media]` : ''))
                        : 'No messages yet';
                      const shortSnippet = snippet.length > 15 ? snippet.slice(0, 15) + '...' : snippet;
                      const isUnread = latestMsg ? seenRoomMap[room] !== latestMsg.id : false;

                      return (
                        <button
                          key={room}
                          type="button"
                          onClick={() => {
                            setActiveChat(room);
                            setActiveChatMobileView(true);
                            markRoomSeen(room);
                          }}
                          className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition w-full text-left ${
                            isActive ? theme.chatRoomActive : theme.chatRoomInactive
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {!isVipGroup && (
                              <div className="relative shrink-0">
                                <img
                                  src={roomAvatar}
                                  alt=""
                                  className="w-9 h-9 rounded-lg bg-white/90 dark:bg-emerald-900 border border-emerald-500/40 object-cover"
                                />
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-emerald-950 ${
                                    isRoomOnline ? 'bg-emerald-400' : 'bg-slate-400'
                                  }`}
                                />
                              </div>
                            )}
                            {isVipGroup && (
                              <div className="w-9 h-9 rounded-lg bg-emerald-200 dark:bg-emerald-800 border border-emerald-400/50 flex items-center justify-center shrink-0 text-emerald-800 dark:text-emerald-200 font-bold">
                                👥
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`truncate ${
                                    isActive
                                      ? 'font-black text-emerald-950 dark:text-white'
                                      : isUnread
                                      ? 'font-black text-amber-600 dark:text-amber-400'
                                      : 'font-bold text-emerald-950 dark:text-white'
                                  }`}
                                >
                                  {room}
                                </span>
                                {isUnread && !isActive && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-ping"></span>
                                )}
                              </div>
                              <div
                                className={`text-[10px] truncate ${
                                  isActive
                                    ? 'font-semibold text-emerald-900 dark:text-emerald-100'
                                    : isUnread
                                    ? 'font-bold text-emerald-950 dark:text-white'
                                    : 'text-emerald-700 dark:text-emerald-300'
                                }`}
                              >
                                {shortSnippet}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
                )}
              </div>

              <div
                className={`md:col-span-2 rounded-2xl flex flex-col min-h-[430px] md:min-h-0 md:h-full overflow-hidden border transition-colors ${
                  msgBgMode === 'black'
                    ? 'bg-black border-neutral-800 text-white'
                    : msgBgMode === 'white'
                    ? 'bg-white border-slate-300 text-black'
                    : theme.messagesPanelCard
                } ${activeChatMobileView ? 'flex' : 'hidden md:flex'}`}
              >
                {/* Responsive Swipeable Chat Header */}
                <div
                  className={`p-3 border-b space-y-2 text-xs font-bold shrink-0 transition-colors ${
                    msgBgMode === 'black'
                      ? 'border-neutral-800 bg-neutral-950 text-white'
                      : msgBgMode === 'white'
                      ? 'border-slate-200 bg-white text-black'
                      : theme.chatHeaderDefault
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => setActiveChatMobileView(false)}
                        className={`md:hidden p-1.5 rounded-lg border transition shrink-0 ${theme.chatHeaderBackBtn}`}
                        title="Back to chats list"
                        aria-label="Back to chats list"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      {activeChat === 'VIP Group' ? (
                        <span
                          className={`text-sm font-black truncate ${
                            msgBgMode === 'black'
                              ? 'text-white'
                              : msgBgMode === 'white'
                              ? 'text-black'
                              : theme.sidebarTitleText
                          }`}
                        >
                          {activeChat}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openUserProfile({ name: activeChat })}
                          className={`group flex items-center gap-2 min-w-0 text-left rounded-lg px-1.5 py-1 -ml-1 transition ${
                            msgBgMode === 'black'
                              ? 'hover:bg-neutral-800'
                              : msgBgMode === 'white'
                              ? 'hover:bg-slate-100'
                              : theme.chatHeaderSubtleHover
                          }`}
                          title={`View ${activeChat}'s profile`}
                        >
                          <img
                            src={getUserAvatar({ name: activeChat })}
                            alt=""
                            className={`w-6 h-7 rounded-md bg-white dark:bg-slate-900 border border-current/25 shrink-0 ${
                              isCustomAvatar(getUserAvatar({ name: activeChat })) ? 'object-cover' : 'object-contain'
                            }`}
                          />
                          <span
                            className={`text-sm font-black truncate group-hover:underline ${
                              msgBgMode === 'black'
                                ? 'text-white'
                                : msgBgMode === 'white'
                                ? 'text-black'
                                : theme.sidebarTitleText
                            }`}
                          >
                            {activeChat}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch] max-w-[68%] sm:max-w-none pb-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const targetUser = activeChat === 'VIP Group' ? 'Choy Admin' : activeChat;
                          handleToggleBlockUser(targetUser);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 whitespace-nowrap ${
                          blockedUsers.includes(activeChat === 'VIP Group' ? 'Choy Admin' : activeChat)
                            ? 'bg-red-600 text-white'
                            : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                        }`}
                        title="Block / Unblock User"
                      >
                        {blockedUsers.includes(activeChat === 'VIP Group' ? 'Choy Admin' : activeChat)
                          ? 'Unblock'
                          : 'Block'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGalleryScope('chat');
                          setGalleryFilter('video');
                          setSelectedGalleryVideo(null);
                          setIsMediaGalleryOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-cyan-500/20 border border-cyan-400/50 text-cyan-800 dark:text-cyan-200 rounded-lg flex items-center gap-1 shadow shrink-0 whitespace-nowrap hover:bg-cyan-400 hover:text-slate-950 text-[11px] transition"
                        title="Shared Chat Videos (with Sound)"
                      >
                        <Video className="w-3.5 h-3.5" /> Videos
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGalleryScope('chat');
                          setGalleryFilter('all');
                          setSelectedGalleryVideo(null);
                          setIsMediaGalleryOpen(true);
                        }}
                        className={`px-2.5 py-1.5 border rounded-lg flex items-center gap-1 shadow shrink-0 whitespace-nowrap text-[11px] transition ${theme.chatSecondaryBtn}`}
                        title="Shared Media Gallery"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Gallery
                      </button>
                      <div className="relative group/backup shrink-0">
                        <button
                          type="button"
                          className={`px-2.5 py-1.5 border rounded-lg flex items-center gap-1 shadow whitespace-nowrap text-[11px] transition ${theme.chatSecondaryBtn}`}
                          title="Download Chat Backup"
                        >
                          <Download className="w-3.5 h-3.5" /> Backup
                        </button>
                        <div className={`absolute right-0 top-full mt-1 hidden group-hover/backup:flex flex-col ${theme.drawerAside} border rounded-xl shadow-xl z-30 p-1 min-w-[120px] space-y-1`}>
                          <button
                            type="button"
                            onClick={() => handleDownloadChatBackup('json')}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold ${theme.drawerSegmentedInactive}`}
                          >
                            JSON File
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadChatBackup('txt')}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold ${theme.drawerSegmentedInactive}`}
                          >
                            Text File (.txt)
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => startVideoCall(activeChat)}
                        className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow shrink-0 whitespace-nowrap text-[11px] transition ${theme.chatAccentBtn}`}
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Call
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 w-full">
                    <div className="flex flex-wrap items-center gap-1.5 w-full">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${theme.searchIcon}`} />
                        <input
                          type="text"
                          placeholder={
                            msgSearchScope === 'all'
                              ? 'Search all chat history (messages, transcripts, senders)...'
                              : `Search messages in ${activeChat}...`
                          }
                          value={msgSearchQuery}
                          onChange={(e) => setMsgSearchQuery(e.target.value)}
                          className={`w-full pl-8 pr-7 py-1.5 border rounded-lg text-[11px] font-normal focus:outline-none ${theme.chatSearchInputDefault}`}
                        />
                        {msgSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setMsgSearchQuery('')}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded transition ${theme.drawerSegmentedInactive}`}
                            aria-label="Clear message search"
                            title="Clear search"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className={`inline-flex rounded-lg border p-0.5 shrink-0 ${theme.drawerSectionCard}`}>
                        <button
                          type="button"
                          onClick={() => setMsgSearchScope('all')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                            msgSearchScope === 'all'
                              ? theme.chatActivePill
                              : theme.drawerSegmentedInactive
                          }`}
                        >
                          All Chats
                        </button>
                        <button
                          type="button"
                          onClick={() => setMsgSearchScope('room')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                            msgSearchScope === 'room'
                              ? theme.chatActivePill
                              : theme.drawerSegmentedInactive
                          }`}
                        >
                          This Chat
                        </button>
                      </div>
                      <div
                        className={`inline-flex items-center gap-1 rounded-lg border p-0.5 shrink-0 ${
                          msgBgMode === 'black'
                            ? 'bg-neutral-900 border-neutral-700'
                            : msgBgMode === 'white'
                            ? 'bg-slate-100 border-slate-300'
                            : theme.drawerSectionCard
                        }`}
                        title="Message Background Color"
                      >
                        <button
                          type="button"
                          onClick={() => selectMsgBgMode('default')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1 transition ${
                            msgBgMode === 'default'
                              ? theme.chatActivePill
                              : msgBgMode === 'black'
                              ? 'text-neutral-300 hover:text-white'
                              : 'text-slate-700 hover:text-black'
                          }`}
                          title="Use Active Theme Chat Surface"
                        >
                          <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${theme.swatchGradient} border border-white/60 shrink-0`} />
                          <span>Theme</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => selectMsgBgMode('black')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1 transition ${
                            msgBgMode === 'black'
                              ? 'bg-black text-white border border-white/60 shadow-2xs'
                              : msgBgMode === 'white'
                              ? 'text-slate-800 hover:bg-slate-200'
                              : theme.drawerSegmentedInactive
                          }`}
                          title="Black Background / White Font"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-black border border-neutral-400 shrink-0" />
                          <span>Black</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => selectMsgBgMode('white')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1 transition ${
                            msgBgMode === 'white'
                              ? 'bg-white text-black border border-slate-400 shadow-2xs'
                              : msgBgMode === 'black'
                              ? 'text-neutral-200 hover:bg-neutral-800'
                              : theme.drawerSegmentedInactive
                          }`}
                          title="White Background / Black Font"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-500 shrink-0" />
                          <span>White</span>
                        </button>
                      </div>
                    </div>
                    {msgSearchQuery.trim() && (() => {
                      const q = msgSearchQuery.trim();
                      const matchCount = messages
                        .filter((m) => !blockedUsers.includes(m.sender))
                        .filter((m) =>
                          msgSearchScope === 'all' ? true : messageBelongsToRoom(m, activeChat, currentUser?.name || '')
                        )
                        .filter((m) => messageMatchesFullText(m, q, currentUser?.name || '')).length;
                      return (
                        <div className={`flex items-center justify-between gap-2 px-1 text-[10px] font-normal ${theme.sidebarMutedText}`}>
                          <span>
                            Found <span className={`font-bold ${theme.sidebarTitleText}`}>{matchCount}</span> match
                            {matchCount === 1 ? '' : 'es'}{' '}
                            {msgSearchScope === 'all' ? 'across all chat history (newest first)' : `in ${activeChat}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setMsgSearchQuery('')}
                            className={`font-bold hover:underline shrink-0 ${theme.sidebarTitleText}`}
                          >
                            Clear
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div
                  className={`flex-1 overflow-y-auto overscroll-y-auto touch-pan-y [-webkit-overflow-scrolling:touch] p-3 space-y-3 min-h-[240px] max-h-[55dvh] md:max-h-none transition-colors ${
                    msgBgMode === 'black'
                      ? 'bg-black text-white'
                      : msgBgMode === 'white'
                      ? 'bg-white text-black'
                      : theme.chatBodyDefaultBg
                  }`}
                >
                  {(() => {
                    const trimmedMsgQuery = msgSearchQuery.trim();
                    const isCrossRoomSearch = Boolean(trimmedMsgQuery) && msgSearchScope === 'all';
                    const filteredMsgs = messages
                      .filter((m) => !blockedUsers.includes(m.sender))
                      .filter((m) =>
                        isCrossRoomSearch ? true : messageBelongsToRoom(m, activeChat, currentUser?.name || '')
                      )
                      .filter((m) =>
                        !trimmedMsgQuery || messageMatchesFullText(m, trimmedMsgQuery, currentUser?.name || '')
                      );
                    const displayedMsgs = isCrossRoomSearch
                      ? [...filteredMsgs].sort((a, b) => b.createdAtMs - a.createdAtMs)
                      : filteredMsgs;

                    if (displayedMsgs.length === 0 && trimmedMsgQuery) {
                      return (
                        <div className="py-10 px-4 text-center space-y-2.5">
                          <div className="text-xs font-bold text-emerald-950 dark:text-white">
                            No messages matched "{trimmedMsgQuery}"
                            {msgSearchScope === 'room' ? ` in ${activeChat}` : ' across all chat history'}
                          </div>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                            Full-text search checks message text, voice transcripts, sender names, and chat rooms.
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-1">
                            {msgSearchScope === 'room' && (
                              <button
                                type="button"
                                onClick={() => setMsgSearchScope('all')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[11px] font-bold transition"
                              >
                                Search All Chats
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setMsgSearchQuery('')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-800 text-emerald-950 dark:text-white text-[11px] font-bold border border-emerald-300 dark:border-emerald-700 transition"
                            >
                              Clear Search
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return displayedMsgs.map((m) => {
                      const roomLabel = getMessageRoomLabel(m, currentUser?.name || '');
                      const isJumpHighlighted = highlightedMsgId === m.id;
                      return (
                      <div
                        key={m.id}
                        id={`chat-msg-${m.id}`}
                        className={`flex flex-col ${isCrossRoomSearch ? 'items-start' : m.isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`text-[10px] px-1 mb-0.5 flex flex-wrap items-center gap-1.5 ${
                            msgBgMode === 'black'
                              ? 'text-neutral-300'
                              : msgBgMode === 'white'
                              ? 'text-slate-700'
                              : m.isMe
                              ? theme.chatBubbleMeMeta
                              : theme.chatBubbleOtherMeta
                          }`}
                        >
                          {isCrossRoomSearch && (
                            <button
                              type="button"
                              onClick={() => jumpToSearchResultMessage(m)}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold transition ${theme.chatSecondaryBtn}`}
                              title={`Open ${roomLabel} chat at this message`}
                            >
                              <span>{highlightSearchMatches(roomLabel, trimmedMsgQuery)}</span>
                              <span className="text-[9px] opacity-80">→ View</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openUserProfile({ id: m.senderId, name: m.sender })}
                            className={`font-bold hover:underline transition ${
                              msgBgMode === 'black'
                                ? 'hover:text-white'
                                : msgBgMode === 'white'
                                ? 'hover:text-black'
                                : 'hover:opacity-80'
                            }`}
                            title={`View ${m.sender}'s profile`}
                          >
                            {trimmedMsgQuery ? highlightSearchMatches(m.sender, trimmedMsgQuery) : m.sender}
                          </button>
                          <span>• {m.time}</span>
                          {m.isQueuedOffline && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[9px] border border-amber-300/70 dark:border-amber-500/40">
                              <Clock className="w-2.5 h-2.5" /> Queued (Offline)
                            </span>
                          )}
                        </div>
                        <div
                          className={`p-3 rounded-2xl text-xs space-y-2 max-w-[85%] transition-all ${
                            msgBgMode === 'black'
                              ? m.isMe
                                ? 'bg-neutral-800 border border-neutral-700 text-white'
                                : 'bg-neutral-900 border border-neutral-800 text-white'
                              : msgBgMode === 'white'
                              ? m.isMe
                                ? 'bg-slate-200/80 border border-slate-300 text-black'
                                : 'bg-slate-50 border border-slate-300 text-black shadow-2xs'
                              : m.isMe
                              ? theme.chatBubbleMeDefault
                              : theme.chatBubbleOtherDefault
                          } ${
                            m.isQueuedOffline ? 'border border-amber-400/80 opacity-90' : ''
                          } ${
                            isJumpHighlighted ? 'ring-2 ring-amber-400 dark:ring-amber-300 shadow-lg' : ''
                          }`}
                        >
                          {m.mediaType === 'image' && m.mediaUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setZoomedImage({
                                  src: m.mediaUrl!,
                                  caption: m.text || `${m.sender} • ${m.time}`
                                })
                              }
                              className="block rounded overflow-hidden cursor-zoom-in"
                              title="Tap to zoom"
                            >
                              <img src={m.mediaUrl} alt="" className="max-h-40 rounded object-contain" />
                            </button>
                          )}
                          {m.mediaType === 'video' && m.mediaUrl && <ChatVideoPlayer src={m.mediaUrl} compact />}
                          {m.mediaType === 'audio' && m.mediaUrl && (
                            <div className="space-y-1.5 w-full">
                              <audio src={m.mediaUrl} controls className="w-full h-8" />
                              <div
                                className={`text-[11px] p-2.5 rounded-xl border flex flex-col gap-1 shadow-xs ${
                                  msgBgMode === 'black'
                                    ? 'bg-neutral-950 border-neutral-700 text-white'
                                    : msgBgMode === 'white'
                                    ? 'bg-white border-slate-300 text-black'
                                    : m.isMe
                                    ? theme.chatBubbleMeAudioBox
                                    : theme.chatBubbleOtherAudioBox
                                }`}
                              >
                                <div
                                  className={`flex items-center gap-1.5 font-bold ${
                                    msgBgMode === 'black'
                                      ? 'text-neutral-300'
                                      : msgBgMode === 'white'
                                      ? 'text-slate-800'
                                      : m.isMe
                                      ? theme.chatBubbleMeAudioLabel
                                      : theme.chatBubbleOtherAudioLabel
                                  }`}
                                >
                                  <Mic className="w-3.5 h-3.5 shrink-0" />
                                  <span>Voice Transcription:</span>
                                </div>
                                <p
                                  translate="no"
                                  className={`notranslate italic break-words leading-relaxed ${
                                    msgBgMode === 'black'
                                      ? 'text-white'
                                      : msgBgMode === 'white'
                                      ? 'text-black'
                                      : m.isMe
                                      ? theme.chatBubbleMeAudioText
                                      : theme.chatBubbleOtherAudioText
                                  }`}
                                >
                                  {trimmedMsgQuery
                                    ? highlightSearchMatches(
                                        m.transcript || m.text || 'Voice message transcription',
                                        trimmedMsgQuery
                                      )
                                    : m.transcript || m.text || 'Voice message transcription'}
                                </p>
                              </div>
                            </div>
                          )}
                          {m.mediaType === 'file' && (
                            <div
                              className={`text-[10px] font-semibold ${
                                msgBgMode === 'default'
                                  ? m.isMe
                                    ? theme.chatBubbleMeFileText
                                    : theme.chatBubbleOtherFileText
                                  : 'text-amber-500'
                              }`}
                            >
                              📎 File Attachment
                            </div>
                          )}
                          {m.text && (
                            <div translate="no" className="notranslate break-words">
                              {trimmedMsgQuery ? highlightSearchMatches(m.text, trimmedMsgQuery) : m.text}
                            </div>
                          )}

                          {m.reactions && m.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {m.reactions.map((emoji, rIdx) => (
                                <span
                                  key={rIdx}
                                  className={`px-1.5 py-0.5 rounded-full text-[10px] border ${
                                    msgBgMode === 'default'
                                      ? m.isMe
                                        ? theme.chatBubbleMeReactionChip
                                        : theme.chatBubbleOtherReactionChip
                                      : 'bg-white/90 text-slate-900 border-slate-300'
                                  }`}
                                >
                                  {emoji}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {!m.isQueuedOffline && (
                          <div className="relative flex flex-wrap items-center gap-1 mt-1 px-1" data-emoji-reaction-menu="true">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenReactionPickerMsgId((prev) => (prev === m.id ? null : m.id))
                              }
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition ${
                                openReactionPickerMsgId === m.id
                                  ? theme.chatActivePill + ' border-transparent'
                                  : msgBgMode === 'black'
                                  ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700'
                                  : msgBgMode === 'white'
                                  ? 'bg-slate-100 hover:bg-slate-200 text-black border-slate-300'
                                  : theme.chatSecondaryBtn
                              }`}
                              title="React with emoji"
                              aria-label="React with emoji"
                              aria-expanded={openReactionPickerMsgId === m.id}
                            >
                              <Smile className="w-3 h-3" />
                            </button>

                            {openReactionPickerMsgId === m.id && (
                              <div
                                className={`absolute bottom-full mb-1.5 z-20 flex items-center gap-0.5 p-1 rounded-2xl ${theme.drawerAside} border shadow-lg ${
                                  m.isMe ? 'right-0' : 'left-0'
                                }`}
                              >
                                {(['❤️', '👍', '🔥', '😄', '😂', '😮', '😢', '🙏'] as const).map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      setOpenReactionPickerMsgId(null);
                                      void addReactionToMessage(m, emoji);
                                    }}
                                    className={`text-sm w-7 h-7 flex items-center justify-center rounded-xl hover:scale-110 transition ${theme.drawerSegmentedInactive}`}
                                    title={`React ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => openForwardDialog(m)}
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition ${
                                msgBgMode === 'black'
                                  ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700'
                                  : msgBgMode === 'white'
                                  ? 'bg-slate-100 hover:bg-slate-200 text-black border-slate-300'
                                  : theme.chatSecondaryBtn
                              }`}
                              title="Forward message to another user or room"
                            >
                              <Forward className="w-3 h-3" />
                              <span>Forward</span>
                            </button>

                            {(currentUser && (m.senderId === currentUser.id || currentUser.role === 'admin' || currentUser.phone === '09361223978' || currentUser.phone === 'choycounterflow@gmail.com')) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(m)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition"
                                title="Delete message"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    });
                  })()}
                  <div ref={messagesEndRef} />
                </div>

                <div
                  className={`p-3 border-t space-y-2 transition-colors ${
                    msgBgMode === 'black'
                      ? 'border-neutral-800 bg-neutral-950 text-white'
                      : msgBgMode === 'white'
                      ? 'border-slate-200 bg-slate-50 text-black'
                      : theme.chatComposerBarDefault
                  }`}
                >
                  {(() => {
                    const myQueuedCount = currentUser
                      ? offlineQueue.filter((q) => q.userId === currentUser.id).length
                      : 0;
                    if (isOnline && myQueuedCount === 0) return null;
                    return (
                      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/60 text-[11px] text-amber-950 dark:text-amber-200">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Clock className="w-3.5 h-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                          <span className="truncate font-semibold">
                            {!isOnline
                              ? myQueuedCount > 0
                                ? `Offline Mode · ${myQueuedCount} message${myQueuedCount > 1 ? 's' : ''} queued for auto-sync`
                                : 'Offline Mode · Messages sent now will be queued and synced when back online'
                              : isSyncingOfflineQueue
                              ? `Syncing ${myQueuedCount} queued message${myQueuedCount > 1 ? 's' : ''}...`
                              : `${myQueuedCount} queued message${myQueuedCount > 1 ? 's' : ''} ready to sync`}
                          </span>
                        </div>
                        {isOnline && myQueuedCount > 0 && (
                          <button
                            type="button"
                            disabled={isSyncingOfflineQueue}
                            onClick={() => void flushOfflineQueue()}
                            className="px-2 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] shrink-0 flex items-center gap-1 disabled:opacity-60"
                          >
                            <RefreshCw className={`w-3 h-3 ${isSyncingOfflineQueue ? 'animate-spin' : ''}`} />
                            <span>Sync</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  <input
                    type="file"
                    ref={msgImageInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleMsgFileSelect}
                  />
                  <input
                    type="file"
                    ref={msgFileInputRef}
                    className="hidden"
                    accept="image/*,video/*,audio/*"
                    onChange={handleMsgFileSelect}
                  />

                  {showMsgLinkInput && (
                    <div className="flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-emerald-900/80 rounded-xl border border-emerald-300 dark:border-emerald-700 text-xs">
                      <select
                        value={msgLinkType}
                        onChange={(e) => setMsgLinkType(e.target.value as 'video' | 'image' | 'audio')}
                        className="p-1.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-800 dark:text-emerald-200 text-[11px]"
                      >
                        <option value="video">Video URL</option>
                        <option value="image">Image URL</option>
                        <option value="audio">Audio URL</option>
                      </select>
                      <input
                        type="url"
                        placeholder="https://... (syncs to all devices)"
                        value={msgLinkDraft}
                        onChange={(e) => setMsgLinkDraft(e.target.value)}
                        className="flex-1 min-w-[140px] p-1.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-950 dark:text-white text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!msgLinkDraft.trim()) return;
                          setMsgMediaType(msgLinkType);
                          setMsgMediaUrl(msgLinkDraft.trim());
                          setMsgLinkDraft('');
                          setShowMsgLinkInput(false);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-400 text-slate-950 font-bold rounded-lg text-[11px]"
                      >
                        Attach
                      </button>
                    </div>
                  )}

                  {msgMediaUrl && msgMediaType === 'image' && (
                    <div className="flex items-center justify-between p-2 bg-white dark:bg-emerald-900/80 rounded-xl text-xs border border-emerald-300 dark:border-emerald-700">
                      <div className="flex items-center gap-2">
                        <img src={msgMediaUrl} alt="" className="w-8 h-8 rounded object-cover" />
                        <span className="text-emerald-800 dark:text-emerald-200">Attached Image</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPhotoEditorOpen(true)}
                          className="px-2.5 py-1 bg-emerald-400 text-slate-950 font-bold rounded-lg text-[10px]"
                        >
                          Edit Photo (Draw & Crop)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMsgMediaUrl('');
                            setMsgMediaType('text');
                          }}
                          className="text-red-700 dark:text-red-300 hover:text-red-100 font-bold px-1.5"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {msgMediaUrl && msgMediaType === 'audio' && (
                    <div className="flex items-center gap-2 p-2 bg-white dark:bg-emerald-900/80 rounded-xl text-xs border border-emerald-300 dark:border-emerald-700">
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold text-[11px] shrink-0 flex items-center gap-1">
                        <Mic className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> Voice
                      </span>
                      <audio src={msgMediaUrl} controls className="h-8 flex-1 min-w-0" />
                      <button
                        type="button"
                        onClick={() => {
                          setMsgMediaUrl('');
                          setMsgMediaType('text');
                        }}
                        className="text-red-700 dark:text-red-300 hover:text-red-100 font-bold px-1.5 shrink-0"
                        title="Discard voice snippet"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {msgMediaUrl && msgMediaType !== 'image' && msgMediaType !== 'audio' && (
                    <div className="flex items-center justify-between p-2 bg-white dark:bg-emerald-900/80 rounded-xl text-xs border border-emerald-300 dark:border-emerald-700">
                      <span className="text-emerald-800 dark:text-emerald-200 truncate">📎 Attached {msgMediaType.toUpperCase()}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMsgMediaUrl('');
                          setMsgMediaType('text');
                        }}
                        className="text-red-700 dark:text-red-300 hover:text-red-100 font-bold px-1.5"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {isRecordingAudio ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-red-950/70 border border-red-500/60 rounded-xl text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                        <span className="font-bold text-red-800 dark:text-red-100 whitespace-nowrap">Recording Voice</span>
                        <span className="font-mono text-red-700 dark:text-red-200 bg-red-900/80 px-2 py-0.5 rounded-md">
                          {formatRecordingTime(recordingSeconds)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => stopAudioRecording('cancel')}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 text-emerald-800 dark:text-slate-300 hover:text-emerald-950 dark:hover:text-white font-semibold flex items-center gap-1"
                          title="Cancel recording"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => stopAudioRecording('attach')}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 flex items-center gap-1"
                          title="Stop and preview before sending"
                        >
                          <Square className="w-3 h-3 fill-current" /> Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => stopAudioRecording('send')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-400 text-slate-950 font-bold hover:bg-emerald-300 flex items-center gap-1 shadow"
                          title="Stop and send voice snippet now"
                        >
                          <Send className="w-3.5 h-3.5" /> Send
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {showMsgEmojiPicker && (
                        <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 rounded-xl bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 shadow-sm">
                          <div className="flex flex-wrap items-center gap-1">
                            {(
                              [
                                '😀', '😄', '😂', '🥰', '😍', '😎', '😉', '😊',
                                '😭', '😮', '🤔', '😅', '❤️', '🔥', '👍', '👏',
                                '🙏', '🎉', '✨', '👌', '💯', '🤝', '🚀', '💬'
                              ] as const
                            ).map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => setMsgInput((prev) => `${prev}${emoji}`)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-emerald-100 dark:hover:bg-emerald-800 transition"
                                title={`Insert ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowMsgEmojiPicker(false)}
                            className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition shrink-0"
                            title="Hide emojis"
                            aria-label="Hide emojis"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <form onSubmit={handleSendMessage}>
                        <div
                          className={`border rounded-2xl overflow-hidden transition ${
                            msgBgMode === 'black'
                              ? 'bg-neutral-900 border-neutral-700 focus-within:border-amber-400'
                              : msgBgMode === 'white'
                              ? 'bg-white border-slate-300 focus-within:border-emerald-600'
                              : theme.chatComposerBoxDefault
                          }`}
                        >
                          <input
                            type="text"
                            translate="no"
                            placeholder={
                              isUploadingMsgMedia
                                ? 'Preparing photo/media...'
                                : isSendingMsg
                                ? 'Sending...'
                                : isProcessingAudio
                                ? 'Uploading voice clip...'
                                : `Message ${activeChat}...`
                            }
                            value={msgInput}
                            onChange={(e) => setMsgInput(e.target.value)}
                            className={`notranslate w-full px-3 pt-2.5 pb-1.5 bg-transparent text-sm sm:text-xs focus:outline-none ${
                              msgBgMode === 'black'
                                ? 'text-white placeholder-neutral-400'
                                : msgBgMode === 'white'
                                ? 'text-black placeholder-slate-500'
                                : `${theme.sidebarTitleText} placeholder-current/45`
                            }`}
                          />
                          <div
                            className={`px-2 py-1.5 flex items-center justify-between gap-2 border-t ${
                              msgBgMode === 'black'
                                ? 'border-neutral-800 bg-neutral-950/60'
                                : msgBgMode === 'white'
                                ? 'border-slate-200 bg-slate-50/80'
                                : theme.chatComposerDividerDefault
                            }`}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <button
                                type="button"
                                disabled={isUploadingMsgMedia || isSendingMsg}
                                onClick={() => msgImageInputRef.current?.click()}
                                className={`p-1.5 rounded-lg transition shrink-0 disabled:opacity-50 ${
                                  msgBgMode === 'black'
                                    ? 'text-neutral-200 hover:bg-neutral-800'
                                    : msgBgMode === 'white'
                                    ? 'text-slate-700 hover:bg-slate-200'
                                    : theme.chatComposerIconDefault
                                }`}
                                title="Send Photo / Image"
                              >
                                {isUploadingMsgMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                disabled={isUploadingMsgMedia || isSendingMsg}
                                onClick={() => msgFileInputRef.current?.click()}
                                className={`p-1.5 rounded-lg transition shrink-0 disabled:opacity-50 ${
                                  msgBgMode === 'black'
                                    ? 'text-neutral-200 hover:bg-neutral-800'
                                    : msgBgMode === 'white'
                                    ? 'text-slate-700 hover:bg-slate-200'
                                    : theme.chatComposerIconDefault
                                }`}
                                title="Attach Video, Audio, or File"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={isProcessingAudio || isUploadingMsgMedia || isSendingMsg}
                                onClick={startAudioRecording}
                                className={`p-1.5 rounded-lg transition shrink-0 disabled:opacity-50 ${
                                  msgBgMode === 'black'
                                    ? 'text-neutral-200 hover:bg-neutral-800'
                                    : msgBgMode === 'white'
                                    ? 'text-slate-700 hover:bg-slate-200'
                                    : theme.chatComposerIconDefault
                                }`}
                                title="Record voice message"
                              >
                                <Mic className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowMsgLinkInput(!showMsgLinkInput)}
                                className={`p-1.5 rounded-lg transition shrink-0 ${
                                  showMsgLinkInput
                                    ? 'bg-cyan-400 text-slate-950'
                                    : msgBgMode === 'black'
                                    ? 'text-cyan-300 hover:bg-neutral-800'
                                    : msgBgMode === 'white'
                                    ? 'text-cyan-700 hover:bg-slate-200'
                                    : theme.chatComposerIconDefault
                                }`}
                                title="Attach synced Video/Image URL"
                              >
                                <Link2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowMsgEmojiPicker((prev) => !prev)}
                                className={`p-1.5 rounded-lg transition shrink-0 ${
                                  showMsgEmojiPicker
                                    ? theme.chatActivePill
                                    : msgBgMode === 'black'
                                    ? 'text-neutral-200 hover:bg-neutral-800'
                                    : msgBgMode === 'white'
                                    ? 'text-slate-700 hover:bg-slate-200'
                                    : theme.chatComposerIconDefault
                                }`}
                                title={showMsgEmojiPicker ? 'Hide emojis' : 'Open emojis'}
                                aria-label={showMsgEmojiPicker ? 'Hide emojis' : 'Open emojis'}
                                aria-expanded={showMsgEmojiPicker}
                              >
                                <Smile className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              type="submit"
                              disabled={isProcessingAudio || isUploadingMsgMedia || isSendingMsg || (!msgInput.trim() && !msgMediaUrl)}
                              className={`px-3.5 py-1.5 text-xs rounded-xl shadow transition shrink-0 disabled:opacity-50 ${theme.chatAccentBtn}`}
                            >
                              {isSendingMsg ? 'Sending...' : 'Send'}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          )}

          {/* MILESTONE SPREADSHEET LEDGER (ADMIN ONLY) */}
          {activeTab === 'ledger' && isAdmin && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2 bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-4 shadow">
                <div>
                  <h3 className="text-sm font-bold text-emerald-950 dark:text-white uppercase">Milestone Spreadsheet Ledger</h3>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                    Live quantities, automatic calculations & real-time cloud sync
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadLedgerCSV}
                  className="px-4 py-2 bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow hover:bg-emerald-300"
                >
                  <Download className="w-4 h-4" /> Download CSV
                </button>
              </div>

              <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-4 shadow space-y-3">
                <h3 className="text-xs font-bold text-emerald-950 dark:text-white uppercase">Add Quantity Record</h3>
                <form onSubmit={handleAddLedgerRow} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Name..."
                    value={newLedgerName}
                    onChange={(e) => setNewLedgerName(e.target.value)}
                    className="p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white flex-1"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
                  >
                    Add Name Row
                  </button>
                </form>
              </div>

              <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl overflow-hidden shadow">
                <div className="max-h-[60vh] overflow-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 sticky top-0 z-10 text-[10px] uppercase">
                      <tr>
                        <th className="p-3 sticky left-0 bg-emerald-50 dark:bg-emerald-950 z-20">Name</th>
                        <th className="p-3">5H</th>
                        <th className="p-3">Bulig</th>
                        <th className="p-3">Point 5</th>
                        <th className="p-3">Half Sack</th>
                        <th className="p-3">One Sack</th>
                        <th className="p-3">Bal.</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-800 font-mono">
                      {ledgerRows.map((row) => {
                        const total = calculateRowTotal(row);
                        return (
                          <tr key={row.id} className="hover:bg-emerald-50 dark:hover:bg-emerald-800/40">
                            <td className="p-3 sticky left-0 bg-emerald-100/90 dark:bg-emerald-900 font-bold text-emerald-950 dark:text-white font-sans max-w-[120px] truncate">
                              {row.name}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={row.fiveH}
                                  onChange={(e) => handleUpdateLedgerField(row, { fiveH: Number(e.target.value) })}
                                  className={`w-12 p-1 bg-white dark:bg-emerald-950 border-2 rounded text-center text-emerald-950 dark:text-white font-bold ${
                                    row.fiveHType === 'blue' ? 'border-blue-500' : 'border-red-500'
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateLedgerField(row, {
                                      fiveHType: row.fiveHType === 'blue' ? 'red' : 'blue'
                                    })
                                  }
                                  aria-label="Toggle color"
                                  className={`w-6 h-6 rounded-lg border-2 shadow-md transition-transform active:scale-95 ${
                                    row.fiveHType === 'blue'
                                      ? 'bg-blue-500 border-blue-200 shadow-blue-500/40'
                                      : 'bg-red-500 border-red-200 shadow-red-500/40'
                                  }`}
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.bulig}
                                onChange={(e) => handleUpdateLedgerField(row, { bulig: Number(e.target.value) })}
                                className="w-12 p-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded text-center text-emerald-950 dark:text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.point5}
                                onChange={(e) => handleUpdateLedgerField(row, { point5: Number(e.target.value) })}
                                className="w-12 p-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded text-center text-emerald-950 dark:text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.halfSack}
                                onChange={(e) => handleUpdateLedgerField(row, { halfSack: Number(e.target.value) })}
                                className="w-12 p-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded text-center text-emerald-950 dark:text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.oneSack}
                                onChange={(e) => handleUpdateLedgerField(row, { oneSack: Number(e.target.value) })}
                                className="w-12 p-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded text-center text-emerald-950 dark:text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.bal}
                                onChange={(e) => handleUpdateLedgerField(row, { bal: Number(e.target.value) })}
                                className="w-16 p-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded text-center text-emerald-950 dark:text-white"
                              />
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-700 dark:text-emerald-300">₱{total}</td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteLedgerRow(row.id)}
                                className="text-red-700 dark:text-red-300 hover:text-red-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-600/25 border-2 border-blue-500 shadow-lg shadow-blue-900/10 dark:shadow-blue-950/50 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-md bg-blue-500 border border-blue-200 inline-block shadow"></span>
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-200 uppercase">Total</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-950 dark:text-white font-mono">₱{totalBlue.toLocaleString()}</div>
                  </div>
                  <div className="w-2.5 h-12 rounded-full bg-blue-500"></div>
                </div>
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-600/25 border-2 border-red-500 shadow-lg shadow-red-900/10 dark:shadow-red-950/50 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-md bg-red-500 border border-red-200 inline-block shadow"></span>
                      <span className="text-[10px] font-bold text-red-700 dark:text-red-200 uppercase">Total</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-950 dark:text-white font-mono">₱{totalRed.toLocaleString()}</div>
                  </div>
                  <div className="w-2.5 h-12 rounded-full bg-red-500"></div>
                </div>
              </div>
            </div>
          )}

          {/* CHOY AI */}
          {activeTab === 'choyai' && (
            <div className="max-w-2xl mx-auto bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-4 sm:p-5 flex flex-col h-[540px] shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 text-xs font-black text-cyan-800 dark:text-cyan-300">
                  <Bot className="w-4 h-4 shrink-0" />
                  <span>Choy AI</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                    isAdmin
                      ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
                      : 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-300 dark:border-cyan-500/40'
                  }`}
                >
                  {isAdmin
                    ? 'Admin Sync · Milestone + All Messages Check · Any Language'
                    : 'App Guide Only · Any Language · Private Info Protected'}
                </span>
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-2.5 pb-1">
                {(isAdmin
                  ? [
                      'Check all users messages if anything is not going good',
                      'Summarize Milestone totals & balances',
                      'Unsaon pag-gamit ang Video Call ug Forward?',
                    ]
                  : [
                      'Unsaon pag-gamit ang Choy Chat?',
                      'How to change my profile pic & name?',
                      'Unsaon pag-video call ug forward message?',
                    ]
                ).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isChoyAIThinking}
                    onClick={() => sendChoyAIQuestion(prompt)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-800 border border-emerald-200 dark:border-emerald-700 text-[11px] text-emerald-800 dark:text-emerald-200 transition disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto py-3 px-1 space-y-3 text-xs">
                {aiChatMessages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`p-3 rounded-2xl max-w-[85%] whitespace-pre-wrap break-words leading-relaxed shadow-xs ${
                        m.sender === 'user'
                          ? 'bg-emerald-500 dark:bg-emerald-400 text-white dark:text-slate-950 font-semibold'
                          : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-950 dark:text-cyan-100 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {isChoyAIThinking && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-cyan-200 inline-flex items-center gap-2 text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Choy AI is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={choyAiTabEndRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendChoyAIQuestion(aiChatInput);
                }}
                className="pt-2.5 border-t border-emerald-200 dark:border-emerald-800 flex gap-2"
              >
                <input
                  type="text"
                  disabled={isChoyAIThinking}
                  placeholder={
                    isAdmin
                      ? 'Ask in any language (Milestone, check user messages, app help)...'
                      : 'Ask in any language how to use Choy Chat...'
                  }
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  className="flex-1 p-2.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white placeholder-emerald-600/60 dark:placeholder-emerald-400 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={isChoyAIThinking || !aiChatInput.trim()}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-slate-950 font-bold text-xs rounded-xl transition disabled:opacity-50"
                >
                  {isChoyAIThinking ? '...' : 'Ask'}
                </button>
              </form>
            </div>
          )}

          {/* ADMIN TABS */}
          {activeTab === 'admin_approvals' && isAdmin && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950 dark:text-white">
                      User Accounts Management
                    </h3>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {usersList.length} active account{usersList.length === 1 ? '' : 's'} · Auto-active on sign in (no approval needed) ·{' '}
                      {storageMode === 'postgres' ? 'Saved to Cloud Postgres' : 'Preview Memory Mode'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-center text-xs text-emerald-700 dark:text-emerald-300">
                      No account found matching "{searchQuery.trim()}".
                    </div>
                  ) : (
                  filteredUsers.map((u) => {
                    const isDeleting = deletingUserIds.includes(u.id);
                    const isConfirming = confirmDeleteUserId === u.id;
                    const isAccountAdmin = u.role === 'admin' || u.id === currentUser.id;
                    return (
                      <div
                        key={u.id}
                        className="p-3 rounded-xl flex flex-wrap items-center justify-between text-xs gap-2 border bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800"
                      >
                        <button
                          type="button"
                          onClick={() => openUserProfile(u)}
                          className="group flex items-center gap-2.5 min-w-0 text-left rounded-lg p-1 -m-1 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/70 transition"
                          title={`View ${u.name}'s profile`}
                        >
                          <img
                            src={getUserAvatar(u)}
                            alt=""
                            className={`w-8 h-10 rounded-lg bg-white dark:bg-emerald-900 border border-emerald-500/50 shrink-0 ${
                              isCustomAvatar(getUserAvatar(u)) ? 'object-cover' : 'object-contain'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-emerald-950 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 group-hover:underline">
                              {u.name} ({u.phone})
                            </div>
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                              Last Active: {u.loginDate} · Tap to view profile
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isAccountAdmin
                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {isAccountAdmin ? 'Admin' : 'Active'}
                          </span>

                          {!isAccountAdmin && (
                            isConfirming ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => handleDeleteCloudUser(u.id)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition disabled:opacity-50"
                                >
                                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => setConfirmDeleteUserId(null)}
                                  className="px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-semibold transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteUserId(u.id)}
                                className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700/80 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white font-bold inline-flex items-center gap-1.5 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Account</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin_knowledge' && isAdmin && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-emerald-950 dark:text-white">Choy AI Brain Knowledge Box (Synced Q & A)</h3>
                <form onSubmit={handleAddKnowledge} className="space-y-2 text-xs">
                  <input
                    type="text"
                    placeholder="Question..."
                    value={newQ}
                    onChange={(e) => setNewQ(e.target.value)}
                    className="w-full p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Answer..."
                    value={newA}
                    onChange={(e) => setNewA(e.target.value)}
                    className="w-full p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
                  />
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl">
                    Add Knowledge
                  </button>
                </form>

                <div className="space-y-2 pt-2">
                  {knowledgeBase.map((k) => (
                    <div
                      key={k.id}
                      className="p-2.5 bg-emerald-50 dark:bg-emerald-950 rounded-xl text-xs flex items-start justify-between gap-2"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-cyan-700 dark:text-cyan-300">Q: {k.question}</div>
                        <div className="text-emerald-900 dark:text-slate-200">A: {k.answer}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteKnowledge(k.id)}
                        className="text-red-700 dark:text-red-300 hover:text-red-100 p-1 shrink-0"
                        title="Delete Q&A"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin_prices' && isAdmin && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 text-xs">
                <h3 className="text-sm font-bold text-emerald-950 dark:text-white">Set Unit Prices (Synced)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-emerald-700 dark:text-emerald-300 mb-1">5H Unit Price</label>
                    <input
                      type="number"
                      value={unitPrices.fiveH}
                      onChange={(e) => setUnitPrices({ ...unitPrices, fiveH: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-700 dark:text-emerald-300 mb-1">Bulig Unit Price</label>
                    <input
                      type="number"
                      value={unitPrices.bulig}
                      onChange={(e) => setUnitPrices({ ...unitPrices, bulig: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-700 dark:text-emerald-300 mb-1">Point 5 Unit Price</label>
                    <input
                      type="number"
                      value={unitPrices.point5}
                      onChange={(e) => setUnitPrices({ ...unitPrices, point5: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-700 dark:text-emerald-300 mb-1">Half Sack Unit Price</label>
                    <input
                      type="number"
                      value={unitPrices.halfSack}
                      onChange={(e) => setUnitPrices({ ...unitPrices, halfSack: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-700 dark:text-emerald-300 mb-1">One Sack Unit Price</label>
                    <input
                      type="number"
                      value={unitPrices.oneSack}
                      onChange={(e) => setUnitPrices({ ...unitPrices, oneSack: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveUnitPrices}
                    className="w-full py-2.5 bg-emerald-400 text-slate-950 font-bold rounded-xl shadow mt-2"
                  >
                    {pricesSavedMsg ? 'Unit Prices Synced!' : 'Save Unit Prices'}
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 text-xs">
                <h3 className="text-sm font-bold text-emerald-950 dark:text-white">
                  Add Quantity / Default Quantities (Apply & Sync to All Milestones)
                </h3>
                <form onSubmit={handleSaveDefaultQuantities} className="space-y-3">
                  <div>
                    <label className="block text-emerald-700 dark:text-emerald-300 mb-1">5H Default Quantity</label>
                    <input
                      type="number"
                      value={defaultQuantities.fiveH}
                      onChange={(e) => setDefaultQuantities({ ...defaultQuantities, fiveH: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-700 dark:text-emerald-300 mb-1">Bulig Default Quantity</label>
                    <input
                      type="number"
                      value={defaultQuantities.bulig}
                      onChange={(e) => setDefaultQuantities({ ...defaultQuantities, bulig: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-700 dark:text-emerald-300 mb-1">Point 5 Default Quantity</label>
                    <input
                      type="number"
                      value={defaultQuantities.point5}
                      onChange={(e) => setDefaultQuantities({ ...defaultQuantities, point5: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-700 dark:text-emerald-300 mb-1">Half Sack Default Quantity</label>
                    <input
                      type="number"
                      value={defaultQuantities.halfSack}
                      onChange={(e) =>
                        setDefaultQuantities({ ...defaultQuantities, halfSack: Number(e.target.value) })
                      }
                      className="w-full p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-700 dark:text-emerald-300 mb-1">One Sack Default Quantity</label>
                    <input
                      type="number"
                      value={defaultQuantities.oneSack}
                      onChange={(e) =>
                        setDefaultQuantities({ ...defaultQuantities, oneSack: Number(e.target.value) })
                      }
                      className="w-full p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-cyan-400 text-slate-950 font-bold rounded-xl shadow mt-2"
                  >
                    {qtySavedMsg
                      ? 'Quantities Synced to All Milestones!'
                      : 'Save & Apply Quantities to All Milestones'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* NEWSFEED SETUP (ADMIN ONLY SIDEBAR VIEW) */}
          {activeTab === 'admin_newsfeeds' && isAdmin && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4 shadow">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-emerald-950 dark:text-white">
                      Newsfeed Setup &amp; User Assignment (Admin Only)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('feed')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold transition"
                  >
                    Open Newsfeed
                  </button>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-200">
                  Only the Admin sees and controls Newsfeed setup. Assign each user to one of 4 choices: <span className="font-bold">{newsfeedConfig.feedATitle}</span>, <span className="font-bold">{newsfeedConfig.feedBTitle}</span>, <span className="font-bold">{newsfeedConfig.feedCTitle}</span>, or <span className="font-bold">B &amp; C</span>. Users in Newsfeed A cannot see or search Newsfeed B/C users.
                </p>

                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-950 dark:text-white flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Admin Newsfeed View Filter
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      Filter kung unsa ang makita sa imong Newsfeed tab
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'All Channels' },
                        { id: 'feed_a', label: newsfeedConfig.feedATitle },
                        { id: 'feed_b', label: newsfeedConfig.feedBTitle },
                        { id: 'feed_c', label: newsfeedConfig.feedCTitle },
                        { id: 'feed_bc', label: 'B & C' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAdminNewsfeedFilter(opt.id)}
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

                <form
                  onSubmit={handleSaveAdminNewsfeedTitles}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800"
                >
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                      Newsfeed A Name
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={adminNfTitleA}
                      onChange={(e) => setAdminNfTitleA(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                      Newsfeed B Name
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={adminNfTitleB}
                      onChange={(e) => setAdminNfTitleB(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                      Newsfeed C Name
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={adminNfTitleC}
                      onChange={(e) => setAdminNfTitleC(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={savingAdminNfTitles}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs disabled:opacity-50"
                    >
                      {savingAdminNfTitles ? 'Saving...' : 'Save Newsfeed Titles'}
                    </button>
                    {adminNfSaved && (
                      <span className="text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                        Newsfeed Titles Saved &amp; Synced!
                      </span>
                    )}
                  </div>
                </form>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter users by name or phone..."
                    value={adminNfUserSearch}
                    onChange={(e) => setAdminNfUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="overflow-x-auto rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] uppercase">
                      <tr>
                        <th className="p-3">User Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Assigned Newsfeed (4 Choices)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-200 dark:divide-emerald-800 bg-white dark:bg-emerald-950/50">
                      {usersList
                        .filter((u) => {
                          const q = adminNfUserSearch.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            u.name.toLowerCase().includes(q) ||
                            (u.phone || '').toLowerCase().includes(q)
                          );
                        })
                        .map((u) => (
                          <tr key={u.id} className="hover:bg-emerald-50 dark:hover:bg-emerald-900/40">
                            <td className="p-3 font-bold text-emerald-950 dark:text-white">{u.name}</td>
                            <td className="p-3 font-mono text-emerald-700 dark:text-emerald-300">{u.phone}</td>
                            <td className="p-3 text-emerald-700 dark:text-emerald-300 uppercase text-[10px] font-bold">
                              {u.role || 'member'}
                            </td>
                            <td className="p-3">
                              <select
                                value={u.newsfeed || 'feed_a'}
                                onChange={(e) =>
                                  handleUpdateUserNewsfeed(
                                    u.id,
                                    e.target.value as SelectableNewsfeed
                                  )
                                }
                                className="p-1.5 rounded-lg bg-white dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-white font-bold text-xs"
                              >
                                <option value="feed_a">{newsfeedConfig.feedATitle}</option>
                                <option value="feed_b">{newsfeedConfig.feedBTitle}</option>
                                <option value="feed_c">{newsfeedConfig.feedCTitle}</option>
                                <option value="feed_bc">B &amp; C ({newsfeedConfig.feedBTitle} &amp; {newsfeedConfig.feedCTitle})</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY STUDIO (ADMIN ONLY) */}
          {activeTab === 'admin_security' && isAdmin && (
            <SecurityStudio
              usersList={usersList}
              setUsersList={setUsersList}
              onAddUser={(name, phone, pin) => handleAddCloudUser(name, phone, pin)}
              onDeleteUser={handleDeleteCloudUser}
              onUpdateUserNewsfeed={handleUpdateUserNewsfeed}
              deletingUserIds={deletingUserIds}
              isCloudSynced
              storageMode={storageMode}
              authToken={authToken}
              blockedUsers={blockedUsers}
              postsCount={posts.length}
              mediaPostsCount={posts.filter((p) => Boolean(p.mediaUrl)).length}
              messagesCount={messages.length}
              mediaMessagesCount={messages.filter((m) => Boolean(m.mediaUrl)).length}
              ledgerCount={ledgerRows.length}
              ledgerTotalValue={ledgerRows.reduce((sum, r) => sum + calculateRowTotal(r), 0)}
              knowledgeCount={knowledgeBase.length}
              emojiLinks={emojiLinks}
              onEmojiLinksChanged={(links) => {
                setEmojiLinks(links);
                setActiveEmojiLink(links.find((l) => l.pinnedToAppIcon) || links[0] || null);
              }}
              defaultAppIcon={DEFAULT_AVATAR}
              syncTick={securitySyncTick}
              newsfeedConfig={newsfeedConfig}
              onNewsfeedConfigChanged={(cfg) => {
                setNewsfeedConfig(cfg);
                localStorage.setItem('choychat_nf_a_title', cfg.feedATitle);
                localStorage.setItem('choychat_nf_b_title', cfg.feedBTitle);
                localStorage.setItem('choychat_nf_c_title', cfg.feedCTitle);
              }}
              announcements={announcements}
              onAnnouncementsChanged={setAnnouncements}
              initialModule={securityInitialModule}
              onConsumeInitialModule={() => setSecurityInitialModule('home')}
              adminNewsfeedFilter={adminNewsfeedFilter}
              onAdminNewsfeedFilterChange={setAdminNewsfeedFilter}
              firebaseConnectedEmail={firebaseUser?.email || null}
              firebaseIsAdminVerified={isVerifiedAdminFirebaseUser(firebaseUser)}
              firebaseSyncState={firebaseSyncState}
              firebaseLastSyncedAt={firebaseLastSyncedAt}
              firebaseSyncError={firebaseSyncError}
              onConnectFirebase={handleConnectFirebaseAdmin}
              onDisconnectFirebase={handleDisconnectFirebaseAdmin}
              onBackupToFirebase={() => pushBackupToFirebase(false)}
              onRestoreFromFirebase={() => restoreBackupFromFirebase(false)}
              onCloudStateRestored={() => fetchSyncedState(true)}
            />
          )}

          {/* ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="bg-white dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-emerald-950 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="w-3 h-3 rounded bg-blue-500 border border-blue-200 inline-block"></span>
                  Top 3 Earners
                </h3>
                {topLeaderboard.length === 0 ? (
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 text-center py-6">
                    No leaderboard records synced yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {topLeaderboard.slice(0, 3).map((u, i) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => openUserProfile({ name: u.name })}
                        className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 hover:border-amber-400/80 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/80 text-center space-y-1 text-xs transition cursor-pointer"
                        title={`View ${u.name}'s profile`}
                      >
                        <div className="text-amber-500 dark:text-amber-400 font-bold">#{i + 1}</div>
                        <div className="font-bold text-emerald-950 dark:text-white hover:underline">{u.name}</div>
                        <div className="font-mono text-emerald-700 dark:text-emerald-300">₱{u.total.toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GITHUB INTELLIGENCE */}
          {activeTab === 'github' && <GitHubIntelligence authToken={authToken} />}
        </div>

        <footer className="border-t border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 py-3 px-4 text-center text-[10px] text-emerald-700 dark:text-emerald-300 shrink-0">
          CHOYCHAT 2026: All Rights Reserved
        </footer>
      </div>

      {/* FLOATING CHOY AI POPUP WIDGET */}
      <div className="fixed bottom-16 right-3 md:bottom-6 md:right-6 z-40">
        {!isChoyAIPopupOpen && (
          <button
            type="button"
            onClick={() => setIsChoyAIPopupOpen(true)}
            className="w-12 h-14 md:w-14 md:h-16 bg-emerald-50 dark:bg-emerald-950 border-2 border-cyan-400 rounded-2xl shadow-2xl flex items-center justify-center font-bold hover:scale-105 overflow-hidden p-0.5 transition"
            title="Ask Choy AI"
          >
            <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-contain rounded-xl" />
          </button>
        )}

        {isChoyAIPopupOpen && (
          <div className="w-80 sm:w-96 h-[420px] bg-white dark:bg-emerald-950 border border-cyan-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 bg-emerald-100/80 dark:bg-emerald-900 border-b border-cyan-500/40 text-cyan-900 dark:text-cyan-200 font-bold text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={DEFAULT_AVATAR}
                  alt=""
                  className="w-5 h-6 rounded bg-emerald-50 dark:bg-emerald-950 object-contain border border-cyan-400 shrink-0"
                />
                <div className="min-w-0">
                  <div className="truncate">Choy AI Assistant</div>
                  <div className="text-[9px] font-semibold text-emerald-700 dark:text-cyan-300/80 truncate">
                    {isAdmin ? 'Admin Sync · Milestone & Messages' : 'App Guide · Any Language'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChoyAIPopupOpen(false)}
                className="text-emerald-800 dark:text-slate-300 hover:text-emerald-950 dark:hover:text-white font-bold px-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
              {aiChatMessages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`p-2.5 rounded-xl max-w-[85%] whitespace-pre-wrap break-words leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-cyan-500 dark:bg-cyan-400 text-white dark:text-slate-950 font-semibold'
                        : 'bg-emerald-50 dark:bg-emerald-900 text-emerald-950 dark:text-cyan-100 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {isChoyAIThinking && (
                <div className="flex justify-start">
                  <div className="px-2.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-cyan-200 inline-flex items-center gap-1.5 text-[11px]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={choyAiPopupEndRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendChoyAIQuestion(aiChatInput);
              }}
              className="p-2 border-t border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 flex gap-2"
            >
              <input
                type="text"
                disabled={isChoyAIThinking}
                placeholder={isAdmin ? 'Ask Admin AI (any language)...' : 'Ask how to use app (any language)...'}
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                className="flex-1 p-2 bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-white placeholder-emerald-600/60 dark:placeholder-emerald-300/70 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isChoyAIThinking || !aiChatInput.trim()}
                className="px-3 py-2 bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow transition disabled:opacity-50"
              >
                {isChoyAIThinking ? '...' : 'Send'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* CLICKABLE USER PROFILE MODAL */}
      {selectedProfileUser &&
        (() => {
          const viewed = selectedProfileUser;
          const viewedLower = viewed.name.trim().toLowerCase();
          const userPosts = posts.filter(
            (p) =>
              (viewed.id && p.authorId === viewed.id) ||
              p.author.name.trim().toLowerCase() === viewedLower
          );
          const userMessages = messages.filter(
            (m) =>
              (viewed.id && m.senderId === viewed.id) ||
              m.sender.trim().toLowerCase() === viewedLower
          );
          const mediaCount =
            userPosts.filter((p) => Boolean(p.mediaUrl)).length +
            userMessages.filter((m) => Boolean(m.mediaUrl)).length;
          const isViewedBlocked = blockedUsers.includes(viewed.name);
          const handleSlug = `@${viewed.name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'member'}`;

          return (
            <div
              className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
              onClick={() => setSelectedProfileUser(null)}
              role="dialog"
              aria-modal="true"
              aria-label={`${viewed.name} Profile`}
            >
              <div
                className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700/80 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Top Header Banner */}
                <div className="relative px-5 pt-5 pb-4 border-b border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 via-white to-amber-50/70 dark:from-emerald-900/90 dark:via-emerald-950 dark:to-emerald-900/70">
                  <button
                    type="button"
                    onClick={() => setSelectedProfileUser(null)}
                    className="absolute top-3.5 right-3.5 p-1.5 rounded-xl bg-white/90 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition"
                    aria-label="Close profile"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-start gap-4 pr-8">
                    {(() => {
                      const modalAvatar = getUserAvatar(viewed);
                      const modalCustom = isCustomAvatar(modalAvatar);
                      return (
                        <button
                          type="button"
                          onClick={() =>
                            setZoomedImage({
                              src: modalAvatar,
                              caption: `${viewed.name} (${viewed.role === 'admin' ? 'Admin' : 'Active Member'})`
                            })
                          }
                          className={`relative ${
                            modalCustom ? 'w-24 h-24' : 'w-20 h-28'
                          } rounded-2xl bg-emerald-50 dark:bg-emerald-900 border-2 border-emerald-500/80 dark:border-emerald-400/80 p-1 overflow-hidden shadow-md shrink-0 cursor-zoom-in group`}
                          title="Tap to zoom avatar"
                        >
                          <img
                            src={modalAvatar}
                            alt={viewed.name}
                            className={`w-full h-full rounded-xl group-hover:scale-105 transition ${
                              modalCustom ? 'object-cover' : 'object-contain'
                            }`}
                          />
                          <span
                            className="absolute bottom-1.5 right-1.5 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-emerald-950 rounded-full"
                            title="Online"
                          ></span>
                        </button>
                      );
                    })()}

                    <div className="min-w-0 flex-1 space-y-1.5 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black text-emerald-950 dark:text-white truncate">
                          {viewed.name}
                        </h3>
                        {viewed.isSelf && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200">
                            You
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 truncate">
                        {handleSlug}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            viewed.role === 'admin'
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300/70 dark:border-amber-500/40'
                              : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-500/40'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {viewed.role === 'admin' ? 'Admin' : 'Active Member'}
                        </span>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300/70 dark:border-emerald-700">
                            <Globe className="w-3 h-3" />
                            {getNewsfeedLabel(viewed.newsfeed)}
                          </span>
                        )}
                        {isViewedBlocked && !viewed.isSelf && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-600/50">
                            Blocked
                          </span>
                        )}
                      </div>

                      {isAdmin && viewed.id && (
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                            Assign Newsfeed (Admin):
                          </span>
                          <select
                            value={viewed.newsfeed || 'feed_a'}
                            onChange={(e) => {
                              const nextNf = e.target.value as SelectableNewsfeed;
                              handleUpdateUserNewsfeed(viewed.id!, nextNf);
                            }}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold text-emerald-950 dark:text-white"
                          >
                            <option value="feed_a">{newsfeedConfig.feedATitle}</option>
                            <option value="feed_b">{newsfeedConfig.feedBTitle}</option>
                            <option value="feed_c">{newsfeedConfig.feedCTitle}</option>
                            <option value="feed_bc">B &amp; C ({newsfeedConfig.feedBTitle} &amp; {newsfeedConfig.feedCTitle})</option>
                          </select>
                        </div>
                      )}

                      <div className="pt-1 space-y-1 text-[11px] text-emerald-800 dark:text-emerald-200">
                        {viewed.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="font-mono">{viewed.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Last Active: {viewed.loginDate || 'Active recently'}</span>
                        </div>
                        {viewed.isSelf && (
                          <div className="pt-1.5 space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isUpdatingAvatar}
                                onClick={() => profileAvatarInputRef.current?.click()}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-400 dark:hover:bg-emerald-300 text-white dark:text-slate-950 text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm transition disabled:opacity-60"
                              >
                                {isUpdatingAvatar ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Camera className="w-3 h-3" />
                                )}
                                <span>
                                  {isUpdatingAvatar
                                    ? 'Saving...'
                                    : isCustomAvatar(getUserAvatar(viewed))
                                    ? 'Change Profile Pic'
                                    : 'Add Profile Pic'}
                                </span>
                              </button>
                              <button
                                type="button"
                                disabled={isUpdatingName}
                                onClick={() => (isEditingName ? cancelNameEditor() : openNameEditor())}
                                className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-[11px] font-bold inline-flex items-center gap-1.5 transition disabled:opacity-60"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>{isEditingName ? 'Cancel' : 'Change Name'}</span>
                              </button>
                            </div>

                            {isEditingName && (
                              <form
                                onSubmit={handleSaveProfileName}
                                className="p-2.5 rounded-xl bg-white/95 dark:bg-emerald-900/90 border border-emerald-300 dark:border-emerald-700 space-y-2"
                              >
                                {nameEditError && (
                                  <div
                                    role="alert"
                                    className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 text-[10px] text-rose-700 dark:text-rose-200"
                                  >
                                    {nameEditError}
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    required
                                    minLength={2}
                                    maxLength={60}
                                    value={nameDraft}
                                    onChange={(e) => setNameDraft(e.target.value)}
                                    placeholder="New display name..."
                                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-xs text-emerald-950 dark:text-white focus:outline-none focus:border-emerald-500"
                                  />
                                  <button
                                    type="submit"
                                    disabled={isUpdatingName || nameDraft.trim().length < 2}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-400 dark:hover:bg-emerald-300 text-white dark:text-slate-950 text-[11px] font-bold shrink-0 disabled:opacity-50"
                                  >
                                    {isUpdatingName ? 'Saving...' : 'Save'}
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Stats Strip */}
                <div className="grid grid-cols-3 divide-x divide-emerald-200 dark:divide-emerald-800 border-b border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/40">
                  <div className="py-3 px-2 text-center">
                    <div className="text-base font-black text-emerald-950 dark:text-white font-mono">
                      {userPosts.length}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Posts
                    </div>
                  </div>
                  <div className="py-3 px-2 text-center">
                    <div className="text-base font-black text-emerald-950 dark:text-white font-mono">
                      {mediaCount}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Media
                    </div>
                  </div>
                  <div className="py-3 px-2 text-center">
                    <div className="text-base font-black text-emerald-950 dark:text-white font-mono">
                      {userMessages.length}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Messages
                    </div>
                  </div>
                </div>

                {/* Direct Actions */}
                <div className="p-4 border-b border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center gap-2">
                  {viewed.isSelf ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProfileUser(null);
                        setActiveTab('profile');
                      }}
                      className="flex-1 min-h-[38px] px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <User className="w-4 h-4" /> Open Full Profile & Settings
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMessageUser(viewed.name)}
                        className="flex-1 min-h-[38px] px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <MessageSquare className="w-4 h-4" /> Message
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProfileUser(null);
                          setActiveChat(viewed.name);
                          setActiveTab('messages');
                          void startVideoCall(viewed.name);
                        }}
                        className="min-h-[38px] px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Video Call
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBlockUser(viewed.name)}
                        className={`min-h-[38px] px-3.5 py-2 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-1.5 transition ${
                          isViewedBlocked
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        {isViewedBlocked ? 'Unblock' : 'Block'}
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProfileUser(null);
                            setActiveTab('admin_approvals');
                          }}
                          className="min-h-[38px] px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Accounts
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Recent Posts by This User */}
                <div className="p-4 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Recent Posts ({userPosts.length})
                  </div>
                  {userPosts.length === 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-900/40 border border-emerald-200/80 dark:border-emerald-800 text-center text-xs text-emerald-700 dark:text-emerald-300">
                      No posts shared by {viewed.name} yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {userPosts.slice(0, 4).map((post) => (
                        <div
                          key={post.id}
                          className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 space-y-2"
                        >
                          <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-300">
                            <span className="font-bold">{post.author.name}</span>
                            <span>{post.timestamp}</span>
                          </div>
                          {post.content && (
                            <p className="text-xs text-emerald-950 dark:text-slate-100 break-words">
                              {post.content}
                            </p>
                          )}
                          {post.mediaUrl && post.mediaType === 'image' && (
                            <button
                              type="button"
                              onClick={() =>
                                setZoomedImage({
                                  src: post.mediaUrl!,
                                  caption: post.content || `${post.author.name} • ${post.timestamp}`
                                })
                              }
                              className="block w-full rounded-lg overflow-hidden bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 cursor-zoom-in"
                              title="Tap to zoom"
                            >
                              <img
                                src={post.mediaUrl}
                                alt={post.content || 'Post image'}
                                className="max-h-44 w-full object-contain"
                              />
                            </button>
                          )}
                          {post.mediaUrl && post.mediaType === 'video' && (
                            <ChatVideoPlayer src={post.mediaUrl} title={post.author.name} subtitle={post.timestamp} compact />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* APP ICON EMOJI LINK & SHARE MODAL */}
      {isAppIconShareModalOpen && (() => {
        const currentCode = activeEmojiLink?.emojiCode || '🔐🟢💬✨🚀';
        const currentTitle = activeEmojiLink?.title || 'Choy Chat Live App';
        const currentTarget = activeEmojiLink?.targetUrl || window.location.origin;
        const currentIcon = activeEmojiLink?.iconUrl || DEFAULT_AVATAR;
        const shareUrl = buildEmojiShareUrl(currentCode);

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsAppIconShareModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="App Icon Emoji Link Share"
          >
            <div
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-emerald-950 border-2 border-amber-400/70 p-5 shadow-2xl space-y-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-300" />
                  <span>App Icon Emoji Link</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAppIconShareModalOpen(false)}
                  className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-white hover:bg-emerald-200 dark:hover:bg-emerald-800"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative inline-block mx-auto">
                <div className="w-28 h-36 rounded-2xl overflow-hidden border-2 border-emerald-400 bg-emerald-900 p-1 shadow-xl mx-auto">
                  <img src={currentIcon} alt="App Icon" className="w-full h-full object-contain rounded-xl" />
                </div>
                <div className="-mt-4 relative z-10 inline-flex items-center justify-center px-3.5 py-1 rounded-full bg-emerald-950 border-2 border-amber-400 text-base tracking-widest shadow-lg">
                  {currentCode}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-black text-emerald-950 dark:text-white">{currentTitle}</div>
                <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 truncate">{currentTarget}</div>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/70 border border-emerald-200 dark:border-emerald-700 text-[10px] font-mono text-emerald-900 dark:text-cyan-300 break-all">
                  {shareUrl}
                </div>
              </div>

              {appIconShareNotice && (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                  {appIconShareNotice}
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={async () => {
                    const result = await shareEmojiLinkWithAppImage({
                      emojiCode: currentCode,
                      title: currentTitle,
                      targetUrl: currentTarget,
                      iconUrl: currentIcon,
                    });
                    setAppIconShareNotice(
                      result.method === 'clipboard'
                        ? 'Emoji link & preview URL copied!'
                        : 'Shared App Icon Image & Emoji Link!'
                    );
                    setTimeout(() => setAppIconShareNotice(''), 3500);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs inline-flex items-center justify-center gap-2 shadow transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Link with App Image</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(`${currentCode} ${shareUrl}`).catch(() => {});
                      setAppIconShareNotice('Copied Emoji Link!');
                      setTimeout(() => setAppIconShareNotice(''), 2500);
                    }}
                    className="py-2 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-white font-bold text-[11px] inline-flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const file = await renderAppIconWithEmojiFile(currentIcon, currentCode, currentTitle);
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = file.name;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="py-2 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-white font-bold text-[11px] inline-flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Save Icon
                  </button>
                </div>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Live Website
                </a>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAppIconShareModalOpen(false);
                      setActiveTab('admin_security');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white font-bold text-[11px] inline-flex items-center justify-center gap-1.5 transition"
                  >
                    <Key className="w-3.5 h-3.5" /> Edit / Save in Security Studio
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3-DOTS / SIDEBAR MENU & SETTINGS DRAWER */}
      {isMenuDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex justify-end"
          onClick={() => setIsMenuDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Menu and Settings"
        >
          <aside
            className={`w-full max-w-sm h-full ${theme.drawerAside} border-l shadow-2xl flex flex-col overflow-hidden transition-colors`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className={`px-4 py-3.5 border-b ${theme.drawerHeader} flex items-center justify-between gap-2 shrink-0`}>
              <div className="flex items-center gap-2 min-w-0">
                <MoreVertical className={`w-4 h-4 shrink-0 ${theme.drawerHeaderIcon}`} />
                <span className={`text-sm font-black truncate ${theme.drawerHeaderTitle}`}>
                  Menu &amp; Settings
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuDrawerOpen(false)}
                className={`p-1.5 rounded-xl border transition ${theme.drawerCloseBtn}`}
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto overscroll-y-contain p-4 space-y-5">
              {/* Account Summary & Quick Actions */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('profile');
                    setIsMenuDrawerOpen(false);
                  }}
                  className={`w-full p-3 rounded-2xl border flex items-center gap-3 text-left transition ${
                    activeTab === 'profile'
                      ? 'bg-emerald-100 dark:bg-emerald-900 border-emerald-400 dark:border-emerald-500'
                      : 'bg-emerald-50/70 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/70'
                  }`}
                >
                  <img
                    src={getUserAvatar(currentUser)}
                    alt=""
                    className={`w-10 h-13 rounded-xl bg-white dark:bg-emerald-950 border border-emerald-500/60 shrink-0 ${
                      isCustomAvatar(getUserAvatar(currentUser)) ? 'object-cover' : 'object-contain'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-emerald-950 dark:text-white truncate">{currentUser.name}</div>
                    <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 truncate">{currentUser.phone}</div>
                    <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {isAdmin ? 'Admin' : 'Active Member'} · Tap to view Profile
                    </div>
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('profile');
                      setIsMenuDrawerOpen(false);
                    }}
                    className="px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition"
                  >
                    <User className="w-3.5 h-3.5" /> My Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleShareApp}
                    className="px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition"
                  >
                    <Share2 className="w-3.5 h-3.5" /> {shareCopied ? 'Copied!' : 'Share App'}
                  </button>
                </div>

                <div>
                  <PWAInstallButton fullWidth />
                </div>

                {/* Background Home-Screen Notifications (Messages & Video Calls) */}
                <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isPushSubscribed ? (
                        <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <BellOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-emerald-950 dark:text-white truncate">
                          Background Notifications
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                          {pushPermission === 'unsupported'
                            ? 'Install PWA on Home Screen to enable'
                            : pushPermission === 'denied'
                            ? 'Blocked in browser site settings'
                            : isPushSubscribed
                            ? 'Active — Home-screen messages & calls ON'
                            : 'Receive alerts even when app is closed'}
                        </div>
                      </div>
                    </div>
                  </div>
                  {pushPermission !== 'unsupported' && (
                    <button
                      type="button"
                      disabled={isSubscribingPush || pushPermission === 'denied'}
                      onClick={() =>
                        isPushSubscribed
                          ? unsubscribeFromBackgroundPush()
                          : subscribeToBackgroundPush(false)
                      }
                      className={`w-full py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 ${
                        isPushSubscribed
                          ? 'bg-white dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xs'
                      }`}
                    >
                      {isSubscribingPush
                        ? 'Updating...'
                        : isPushSubscribed
                        ? 'Turn Off Background Alerts'
                        : 'Enable Home-Screen Alerts'}
                    </button>
                  )}
                </div>

                {/* Chat Headbubble Popup Toggle (Accessible on Mobile & Desktop) */}
                <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-emerald-950 dark:text-white truncate">
                          Headbubble Popup
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                          In-app bubble + OS heads-up popup when minimized
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !chatHeadBubbleEnabled;
                        setChatHeadBubbleEnabled(next);
                        localStorage.setItem('choychat_chat_head_bubble_v1', String(next));
                        if (!next) {
                          setActiveChatHeadMessage(null);
                        } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                          void subscribeToBackgroundPush(false);
                        }
                        showNotice(next ? 'Chat Head Bubbles Enabled' : 'Chat Head Bubbles Disabled');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
                        chatHeadBubbleEnabled
                          ? 'bg-emerald-400 text-slate-950 shadow-xs'
                          : 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                      }`}
                    >
                      {chatHeadBubbleEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {isDocPipSupported && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuDrawerOpen(false);
                        void openFloatingHeadBubbleWindow();
                      }}
                      className="w-full py-2 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition shadow-xs"
                    >
                      {isHeadBubblePipOpen ? 'Focus Floating Mini-Window' : 'Pop Out Floating Mini-Window (Outside Browser)'}
                    </button>
                  )}
                </div>

                {/* Test Video Call Ringtone */}
                <button
                  type="button"
                  onClick={() => {
                    void playSingleRingtoneBurst().then((ok) => {
                      showNotice(ok ? 'Playing video call ringtone!' : 'Tap again or check device volume.');
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-200/80 dark:hover:bg-emerald-800 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" /> Test Video Call Ringtone
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('admin_approvals');
                      setIsMenuDrawerOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Users className="w-4 h-4" /> User Accounts Management
                  </button>
                )}
              </div>

              {/* Themes & Appearance Controls */}
              <section className={`p-4 rounded-2xl border ${theme.drawerSectionCard} space-y-4`}>
                <div className={`flex items-center justify-between gap-2 pb-2.5 border-b ${theme.drawerSectionBorder}`}>
                  <div>
                    <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${theme.sidebarTitleText}`}>
                      <Palette className={`w-3.5 h-3.5 shrink-0 ${theme.drawerHeaderIcon}`} />
                      <span>Themes &amp; Appearance</span>
                    </h3>
                    <p className={`text-[11px] mt-0.5 ${theme.sidebarMutedText}`}>
                      Theme: <span className="font-bold">{theme.name}</span> · {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetAppearance}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition ${theme.drawerCloseBtn}`}
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>

                {/* Predefined Color Scheme Themes Picker */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-bold ${theme.sidebarTitleText}`}>Themes</span>
                    <span className={`text-[10px] ${theme.sidebarMutedText}`}>Updates headers &amp; chat bubbles</span>
                  </div>
                  <div
                    role="radiogroup"
                    aria-label="Predefined color themes"
                    className="grid grid-cols-2 gap-2"
                  >
                    {COLOR_THEME_LIST.map((preset) => {
                      const isSelected = colorTheme === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => {
                            setColorTheme(preset.id);
                            showNotice(`${preset.name} theme applied`);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-2 ${
                            isSelected
                              ? `${theme.drawerAside} ring-2 ring-amber-400 border-amber-400 shadow-sm`
                              : `${theme.drawerAside} opacity-90 hover:opacity-100`
                          }`}
                        >
                          {/* Mini UI Header + Bubble Preview */}
                          <div className="w-full rounded-lg border border-black/10 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-slate-900/70 p-1.5 space-y-1">
                            <div className={`h-2 w-full rounded-full bg-gradient-to-r ${preset.previewHeaderBar}`} />
                            <div className="flex flex-col gap-1 pt-0.5">
                              <div className={`h-2 w-9 rounded-full self-start ${preset.previewBubbleOther}`} />
                              <div className={`h-2 w-11 rounded-full self-end ${preset.previewBubbleMe}`} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="min-w-0">
                              <div className={`text-xs font-extrabold truncate flex items-center gap-1.5 ${theme.sidebarTitleText}`}>
                                <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${preset.swatchGradient} shrink-0`} />
                                <span>{preset.name}</span>
                              </div>
                              <div className={`text-[10px] truncate ${theme.sidebarMutedText}`}>
                                {preset.subtitle}
                              </div>
                            </div>
                            {isSelected && (
                              <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 ${theme.chatActivePill}`}>
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Brightness Mode Selector */}
                <div className={`space-y-2 pt-2 border-t ${theme.drawerSectionBorder}`}>
                  <div className={`text-[11px] font-bold ${theme.sidebarTitleText}`}>Brightness Mode</div>
                  <div
                    role="radiogroup"
                    aria-label="Brightness mode"
                    className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${theme.drawerAside}`}
                  >
                    {(
                      [
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Monitor },
                      ] as const
                    ).map((opt) => {
                      const Icon = opt.icon;
                      const isActive = themeMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => setThemeMode(opt.id)}
                          className={`min-h-[42px] px-2 py-2 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition ${
                            isActive ? theme.drawerSegmentedActive : theme.drawerSegmentedInactive
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message Background Color Selector */}
                <div className={`space-y-2 pt-2 border-t ${theme.drawerSectionBorder}`}>
                  <div className={`text-[11px] font-bold ${theme.sidebarTitleText}`}>Message Background Color</div>
                  <div
                    role="radiogroup"
                    aria-label="Message background color"
                    className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${theme.drawerAside}`}
                  >
                    {(
                      [
                        { id: 'default', label: 'Themed', swatch: `bg-gradient-to-br ${theme.swatchGradient} border-white/60` },
                        { id: 'black', label: 'Black / White', swatch: 'bg-black border-neutral-400' },
                        { id: 'white', label: 'White / Black', swatch: 'bg-white border-slate-500' },
                      ] as const
                    ).map((opt) => {
                      const isActive = msgBgMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => selectMsgBgMode(opt.id)}
                          className={`min-h-[40px] px-2 py-2 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-semibold transition ${
                            isActive ? theme.drawerSegmentedActive : theme.drawerSegmentedInactive
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full border shrink-0 ${opt.swatch}`} />
                          <span className="truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Dark Mode Switch */}
                <div className={`flex items-center justify-between gap-3 pt-2 border-t ${theme.drawerSectionBorder}`}>
                  <div className="min-w-0">
                    <div className={`text-xs font-semibold ${theme.sidebarTitleText}`}>Dark Mode Switch</div>
                    <div className={`text-[10px] ${theme.sidebarMutedText}`}>Quick daylight / night toggle</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={resolvedTheme === 'dark'}
                    aria-label="Toggle dark mode"
                    onClick={toggleLightDark}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
                      resolvedTheme === 'dark' ? theme.drawerSwitchTrackOn : theme.drawerSwitchTrackOff
                    }`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-900 shadow transition-transform ${
                        resolvedTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    >
                      {resolvedTheme === 'dark' ? (
                        <Moon className="w-3 h-3" />
                      ) : (
                        <Sun className="w-3 h-3 text-amber-600" />
                      )}
                    </span>
                  </button>
                </div>

                {/* Reading Text Size */}
                <div className={`space-y-2 pt-2 border-t ${theme.drawerSectionBorder}`}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-bold inline-flex items-center gap-1.5 ${theme.sidebarTitleText}`}>
                      <Type className={`w-3.5 h-3.5 ${theme.sidebarMutedText}`} /> Reading Text Size
                    </span>
                    <span className={`font-mono capitalize ${theme.sidebarMutedText}`}>{fontScale}</span>
                  </div>
                  <div className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${theme.drawerAside}`}>
                    {(
                      [
                        { id: 'compact', label: 'Compact' },
                        { id: 'standard', label: 'Standard' },
                        { id: 'large', label: 'Large' },
                      ] as const
                    ).map((opt) => {
                      const active = fontScale === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFontScale(opt.id)}
                          className={`min-h-[36px] px-2 py-1.5 rounded-lg text-xs font-semibold transition ${
                            active ? theme.drawerSegmentedActive : theme.drawerSegmentedInactive
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reduce Motion */}
                <div className={`flex items-center justify-between gap-3 pt-2 border-t ${theme.drawerSectionBorder}`}>
                  <div className="min-w-0">
                    <div className={`text-xs font-semibold ${theme.sidebarTitleText}`}>Reduce Motion</div>
                    <div className={`text-[10px] ${theme.sidebarMutedText}`}>Minimize animations &amp; transitions</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reducedMotion}
                    aria-label="Toggle reduced motion"
                    onClick={() => setReducedMotion(!reducedMotion)}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
                      reducedMotion ? theme.drawerSwitchTrackOn : theme.drawerSwitchTrackOff
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        reducedMotion ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </section>

              {/* Account Setup & Delete Account */}
              <section className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/35 border border-rose-200 dark:border-rose-800/70 space-y-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" /> Account Setup &amp; Delete
                  </h3>
                  <p className="text-[11px] text-rose-700/90 dark:text-rose-200/80 mt-1 leading-relaxed">
                    {isAdmin
                      ? 'Open Accounts to review or permanently remove member accounts.'
                      : 'Permanently delete your Choy Chat account and sign out of this device.'}
                  </p>
                </div>

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('admin_approvals');
                      setIsMenuDrawerOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Manage / Delete Accounts
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteAccountSetup((v) => !v);
                        setDeleteAccountError('');
                        setDeleteAccountPin('');
                        setDeleteAccountConfirmed(false);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-rose-950/70 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/70 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{showDeleteAccountSetup ? 'Cancel Delete Setup' : 'Set Up Delete Account'}</span>
                    </button>

                    {showDeleteAccountSetup && (
                      <form onSubmit={handleDeleteMyAccount} className="space-y-3 pt-1">
                        <div className="p-3 rounded-xl bg-rose-100/70 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700/80 space-y-2">
                          <p className="text-xs font-bold text-rose-900 dark:text-rose-100 flex items-center gap-1.5">
                            <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                            Are you sure you want to permanently delete your account?
                          </p>
                          <p className="text-[11px] text-rose-800/90 dark:text-rose-200/90 leading-relaxed">
                            This action is permanent and cannot be undone. All your posts, messages, and profile data will be removed.
                          </p>
                          <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={deleteAccountConfirmed}
                              onChange={(e) => setDeleteAccountConfirmed(e.target.checked)}
                              className="mt-0.5 w-4 h-4 rounded border-rose-400 text-rose-600 focus:ring-rose-500 accent-rose-600 shrink-0"
                            />
                            <span className="text-[11px] font-semibold text-rose-950 dark:text-rose-100 leading-tight">
                              I understand that deleting my account is permanent and irreversible.
                            </span>
                          </label>
                        </div>

                        <p className="text-[11px] text-rose-800 dark:text-rose-200 leading-relaxed">
                          Enter your current PIN to confirm deletion:
                        </p>
                        {deleteAccountError && (
                          <div
                            role="alert"
                            className="p-2 rounded-lg bg-white dark:bg-rose-950 border border-rose-300 dark:border-rose-700 text-[11px] text-rose-700 dark:text-rose-200"
                          >
                            {deleteAccountError}
                          </div>
                        )}
                        <input
                          type="password"
                          required
                          minLength={4}
                          value={deleteAccountPin}
                          onChange={(e) => setDeleteAccountPin(e.target.value)}
                          placeholder="Enter your account PIN..."
                          className="w-full min-h-[38px] px-3 py-2 rounded-xl bg-white dark:bg-emerald-950 border border-rose-300 dark:border-rose-700 text-xs text-emerald-950 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        />
                        <button
                          type="submit"
                          disabled={deletingMyAccount || !deleteAccountPin.trim() || !deleteAccountConfirmed}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50 shadow"
                        >
                          {deletingMyAccount ? 'Deleting...' : 'Confirm Delete Account'}
                        </button>
                      </form>
                    )}
                  </>
                )}
              </section>
            </div>

            {/* Sticky Drawer Footer: Logout */}
            <div className="p-4 border-t border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/50 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsMenuDrawerOpen(false);
                  handleLogout();
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-red-50 dark:bg-emerald-950 border border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60 text-xs font-bold inline-flex items-center justify-center gap-2 transition"
              >
                <LogOut className="w-4 h-4" /> Logout Account
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* FORWARD MESSAGE DIALOG */}
      {forwardingMessage && (() => {
        const q = forwardSearch.trim().toLowerCase();
        const forwardTargets = chatRoomsList.filter((room) =>
          q ? room.toLowerCase().includes(q) : true
        );
        return (
          <div
            className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
            onClick={() => setForwardingMessage(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Forward Message"
          >
            <div
              className="w-full max-w-md max-h-[86dvh] flex flex-col rounded-2xl bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700/80 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3.5 border-b border-emerald-200 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-900/70 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Forward className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                  <h3 className="text-sm font-black text-emerald-950 dark:text-white truncate">
                    Forward Message
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setForwardingMessage(null)}
                  className="p-1.5 rounded-xl bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition"
                  aria-label="Close forward dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message Preview */}
              <div className="px-4 pt-3 pb-2 shrink-0">
                <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Message from {forwardingMessage.sender}
                  </div>
                  {forwardingMessage.mediaType === 'image' && forwardingMessage.mediaUrl && (
                    <img
                      src={forwardingMessage.mediaUrl}
                      alt="Forward preview"
                      className="max-h-24 rounded-lg object-contain border border-emerald-200 dark:border-emerald-700"
                    />
                  )}
                  {forwardingMessage.mediaType === 'video' && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                      <Video className="w-3.5 h-3.5" /> Video Attachment
                    </div>
                  )}
                  {forwardingMessage.mediaType === 'audio' && (
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-200">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Mic className="w-3.5 h-3.5" /> Voice Message
                      </span>
                      {forwardingMessage.transcript && (
                        <p className="text-[11px] italic text-emerald-700 dark:text-emerald-300 line-clamp-2 mt-0.5">
                          &ldquo;{forwardingMessage.transcript}&rdquo;
                        </p>
                      )}
                    </div>
                  )}
                  {forwardingMessage.mediaType === 'file' && (
                    <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      📎 File Attachment
                    </div>
                  )}
                  {forwardingMessage.text && (
                    <p className="text-xs text-emerald-950 dark:text-slate-100 line-clamp-3 break-words">
                      {forwardingMessage.text}
                    </p>
                  )}
                </div>
              </div>

              {/* Recipient Search */}
              <div className="px-4 pb-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 pointer-events-none" />
                  <input
                    type="text"
                    value={forwardSearch}
                    onChange={(e) => setForwardSearch(e.target.value)}
                    placeholder="Search user or room..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/70 border border-emerald-300 dark:border-emerald-700 text-xs text-emerald-950 dark:text-white placeholder-emerald-600/60 dark:placeholder-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Select User / Room List */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
                {forwardTargets.length === 0 ? (
                  <div className="py-6 text-center text-xs text-emerald-700 dark:text-emerald-300">
                    No user or room found matching &ldquo;{forwardSearch.trim()}&rdquo;.
                  </div>
                ) : (
                  forwardTargets.map((room) => {
                    const isVip = room.trim().toLowerCase() === 'vip group';
                    const targetAvatar = isVip ? '' : getUserAvatar({ name: room });
                    const isSent = forwardedTargets.includes(room);
                    const isSendingThis = forwardingTarget === room;
                    const isRoomOnline =
                      isVip || onlineUsers.includes(room.trim().toLowerCase());
                    return (
                      <div
                        key={room}
                        className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isVip ? (
                            <div className="w-8 h-8 rounded-lg bg-emerald-200 dark:bg-emerald-800 border border-emerald-400/50 flex items-center justify-center shrink-0 text-emerald-800 dark:text-emerald-200">
                              <Users className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="relative shrink-0">
                              <img
                                src={targetAvatar}
                                alt=""
                                className={`w-8 h-8 rounded-lg bg-white dark:bg-emerald-950 border border-emerald-500/50 ${
                                  isCustomAvatar(targetAvatar) ? 'object-cover' : 'object-contain'
                                }`}
                              />
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-emerald-950 ${
                                  isRoomOnline ? 'bg-emerald-400' : 'bg-slate-400'
                                }`}
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-emerald-950 dark:text-white truncate">
                              {room}
                            </div>
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                              {isVip ? 'Group Chat Room' : isRoomOnline ? 'Online' : 'Direct Message'}
                            </div>
                          </div>
                        </div>

                        {isSent ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveChat(room);
                              setActiveTab('messages');
                              setForwardingMessage(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold inline-flex items-center gap-1 shrink-0 hover:bg-emerald-200 dark:hover:bg-emerald-700 transition"
                          >
                            <Check className="w-3.5 h-3.5" /> Sent · Open
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={Boolean(forwardingTarget)}
                            onClick={() => handleForwardToRoom(room)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-400 dark:hover:bg-emerald-300 text-white dark:text-slate-950 text-[11px] font-bold inline-flex items-center gap-1 shrink-0 transition disabled:opacity-50"
                          >
                            {isSendingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>{isSendingThis ? 'Sending...' : 'Send'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {zoomedImage && (
        <ImageZoomModal
          src={zoomedImage.src}
          caption={zoomedImage.caption}
          onClose={() => setZoomedImage(null)}
        />
      )}

      {/* FLOATING CHAT HEAD BUBBLE POPUP (DRAGGABLE) */}
      {chatHeadBubbleEnabled && activeChatHeadMessage && (
        <div
          ref={chatHeadRef}
          style={
            chatHeadPos
              ? { left: `${chatHeadPos.x}px`, top: `${chatHeadPos.y}px`, touchAction: 'none' }
              : { touchAction: 'none' }
          }
          className={`fixed z-50 select-none ${
            chatHeadPos ? '' : 'bottom-20 right-5'
          } ${isDraggingChatHead ? 'scale-105 cursor-grabbing' : 'animate-bounce transition-transform duration-200'}`}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            const rect = e.currentTarget.getBoundingClientRect();
            chatHeadDragRef.current = {
              active: true,
              pointerId: e.pointerId,
              startX: e.clientX,
              startY: e.clientY,
              originLeft: rect.left,
              originTop: rect.top,
              moved: false,
            };
            chatHeadJustDraggedRef.current = false;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // ignore pointer capture fallback
            }
          }}
          onPointerMove={(e) => {
            const drag = chatHeadDragRef.current;
            if (!drag.active || drag.pointerId !== e.pointerId) return;
            const dx = e.clientX - drag.startX;
            const dy = e.clientY - drag.startY;
            if (!drag.moved && Math.hypot(dx, dy) > 5) {
              drag.moved = true;
              setIsDraggingChatHead(true);
            }
            if (!drag.moved) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const maxX = Math.max(8, window.innerWidth - rect.width - 8);
            const maxY = Math.max(8, window.innerHeight - rect.height - 8);
            const nextX = Math.max(8, Math.min(maxX, drag.originLeft + dx));
            const nextY = Math.max(8, Math.min(maxY, drag.originTop + dy));
            setChatHeadPos({ x: nextX, y: nextY });
          }}
          onPointerUp={(e) => {
            const drag = chatHeadDragRef.current;
            if (!drag.active || drag.pointerId !== e.pointerId) return;
            drag.active = false;
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                // ignore
              }
            }
            if (drag.moved) {
              chatHeadJustDraggedRef.current = true;
              setIsDraggingChatHead(false);
              setChatHeadPos((latest) => {
                if (latest) {
                  try {
                    localStorage.setItem('choychat_chat_head_pos_v1', JSON.stringify(latest));
                  } catch {
                    // ignore storage quota errors
                  }
                }
                return latest;
              });
            }
          }}
          onPointerCancel={(e) => {
            if (chatHeadDragRef.current.pointerId === e.pointerId) {
              chatHeadDragRef.current.active = false;
              setIsDraggingChatHead(false);
            }
          }}
        >
          <div
            className={`flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white shadow-2xl border-2 border-amber-400 max-w-xs group ${
              isDraggingChatHead ? 'cursor-grabbing ring-4 ring-amber-400/30' : 'cursor-grab hover:scale-105'
            }`}
            title="Drag anywhere to move · Tap to open chat"
            onClick={() => {
              if (chatHeadJustDraggedRef.current) {
                chatHeadJustDraggedRef.current = false;
                return;
              }
              const room =
                activeChatHeadMessage.receiver.trim().toLowerCase() === 'vip group'
                  ? 'VIP Group'
                  : activeChatHeadMessage.sender === currentUser.name
                  ? activeChatHeadMessage.receiver
                  : activeChatHeadMessage.sender;
              setActiveChat(room);
              setActiveTab('messages');
              setActiveChatHeadMessage(null);
            }}
          >
            <div className="relative shrink-0">
              <img
                src={getUserAvatar({ name: activeChatHeadMessage.sender })}
                alt=""
                draggable={false}
                className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow pointer-events-none"
              />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-emerald-950 animate-ping"></span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-amber-300 truncate">{activeChatHeadMessage.sender}</div>
              <div className="text-[11px] text-white truncate">{activeChatHeadMessage.text || 'Sent an attachment'}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isDocPipSupported && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void openFloatingHeadBubbleWindow(activeChatHeadMessage);
                  }}
                  className="px-2 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-bold shrink-0"
                  title="Pop out outside app"
                >
                  Pop Out
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveChatHeadMessage(null);
                }}
                className="p-1 rounded-full bg-white/20 hover:bg-white/40 text-white shrink-0 text-xs font-bold"
                title="Close bubble"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONE-TIME DASHBOARD APP PERMISSION MODAL (AFTER LOGIN) */}
      {currentUser && showDashboardPermissionModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="choy-perm-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 shadow-2xl overflow-hidden">
            <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-300 shrink-0" />
                <div>
                  <h3 id="choy-perm-modal-title" className="text-sm font-extrabold leading-tight">
                    App Permissions Required to Continue
                  </h3>
                  <p className="text-[11px] text-emerald-100">
                    One-time setup · {currentUser.name}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase shrink-0">
                Required
              </span>
            </div>

            <div className="p-4 space-y-3.5">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/50 text-xs text-emerald-950 dark:text-amber-100 space-y-1 leading-relaxed">
                <p className="font-bold">
                  Please allow <span className="text-emerald-700 dark:text-amber-300">Camera</span>,{' '}
                  <span className="text-emerald-700 dark:text-amber-300">Audio / Microphone</span>, and{' '}
                  <span className="text-emerald-700 dark:text-amber-300">Location</span> to continue using this app and to enable{' '}
                  <span className="underline decoration-amber-400">Audio &amp; Video Calls</span>.
                </p>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-200">
                  Note: Pindota ang <strong>Allow &amp; Continue</strong> sa ubos aron magamit ang Camera, Audio/Mic, ug Location para sa Audio Call, Video Call, Voice Messages, ug pagpadayon sa app.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    key: 'camera',
                    label: 'Camera',
                    sub: 'Video Call & Photo',
                    icon: <Camera className="w-4 h-4" />,
                    status: appPermissions.camera,
                  },
                  {
                    key: 'music',
                    label: 'Audio / Mic',
                    sub: 'Audio & Video Call',
                    icon: <Music className="w-4 h-4" />,
                    status: appPermissions.music,
                  },
                  {
                    key: 'location',
                    label: 'Location',
                    sub: 'Device Location',
                    icon: <MapPin className="w-4 h-4" />,
                    status: appPermissions.location,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className={`p-2.5 rounded-xl border text-center space-y-1 ${
                      item.status === 'granted'
                        ? 'bg-emerald-100/90 dark:bg-emerald-900/70 border-emerald-400 text-emerald-900 dark:text-emerald-100'
                        : item.status === 'denied'
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-700 dark:text-rose-200'
                        : 'bg-emerald-50 dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex justify-center text-emerald-700 dark:text-emerald-300">{item.icon}</div>
                    <div className="text-[11px] font-extrabold leading-tight">{item.label}</div>
                    <div className="text-[9px] opacity-80 leading-tight">{item.sub}</div>
                    <div className="text-[9px] font-black uppercase pt-0.5">
                      {item.status === 'granted' ? '✓ Allowed' : item.status === 'denied' ? '✕ Blocked' : '• Required'}
                    </div>
                  </div>
                ))}
              </div>

              {permAttemptedOnce && (appPermissions.camera === 'denied' || appPermissions.music === 'denied' || appPermissions.location === 'denied') && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 text-[11px] text-rose-800 dark:text-rose-200">
                  Naay permission nga naka-block sa browser settings. Pwede nimo i-Allow sa browser address bar lock icon para mo-work ang Audio/Video Call, o pindota ang Continue to Dashboard.
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  disabled={isRequestingPermissions}
                  onClick={async () => {
                    const perms = await requestRequiredAppPermissions();
                    setPermAttemptedOnce(true);
                    if (initialGpsRef.current && authToken) {
                      fetch('/api/choy/gps/ping', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${authToken}`,
                        },
                        body: JSON.stringify(initialGpsRef.current),
                      }).catch(() => {});
                    }
                    const allGranted =
                      perms.camera === 'granted' &&
                      perms.music === 'granted' &&
                      perms.location === 'granted';
                    if (allGranted || permAttemptedOnce) {
                      try {
                        localStorage.setItem(`choychat_perm_prompt_v1_${currentUser.id}`, 'done');
                      } catch {
                        // ignore storage errors
                      }
                      setShowDashboardPermissionModal(false);
                      showNotice(
                        allGranted
                          ? 'Permissions Allowed! Camera, Audio & Video Call, ug Location ready na.'
                          : 'Dashboard ready. Pwede nimo i-allow ang uban pang permissions sa browser settings kon mag Video/Audio Call.'
                      );
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {isRequestingPermissions ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Requesting Camera, Audio &amp; Location...</span>
                    </>
                  ) : permAttemptedOnce ? (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Retry Allow All (Camera, Audio &amp; Location)</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Allow &amp; Continue (Camera, Audio &amp; Location)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem(`choychat_perm_prompt_v1_${currentUser.id}`, 'done');
                    } catch {
                      // ignore storage errors
                    }
                    setShowDashboardPermissionModal(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold text-xs transition"
                >
                  Continue to Dashboard / Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
