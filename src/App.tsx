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
  EyeOff
} from 'lucide-react';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SecurityStudio } from './components/SecurityStudio';
import { ChatVideoPlayer } from './components/ChatVideoPlayer';
import { ImageZoomModal } from './components/ImageZoomModal';

interface CurrentUser {
  id: string;
  name: string;
  phone: string;
  role: 'admin' | 'member';
  status: 'pending' | 'approved';
  blockedUsers: string[];
}

interface UserAccount {
  id: string;
  name: string;
  phone: string;
  role?: 'admin' | 'member';
  status: 'pending' | 'approved';
  loginDate: string;
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
}

interface Message {
  id: string;
  senderId?: string;
  sender: string;
  receiver: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'text' | 'image' | 'video' | 'audio' | 'file';
  time: string;
  createdAtMs: number;
  isMe?: boolean;
  reactions?: string[];
  isLocalOnly?: boolean;
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

const DEFAULT_AVATAR = '/assets/aistudio/image_20261121_145253_f477cbfa.webp';
const CHAT_ROOMS = ['VIP Group', 'Choy Admin', 'Maria Santos'] as const;

function formatIsoTime(iso?: string): string {
  if (!iso) return 'Just now';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
}

export default function App() {
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
    | 'admin_security'
    | 'choyai'
    | 'people'
    | 'videos'
  >('feed');
  const [searchQuery, setSearchQuery] = useState('');

  // Video Call Modal State
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

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
  const [aiChatMessages, setAiChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: 'Hello! I am Choy AI. I am synchronized with all cloud app knowledge across your devices. Ask me anything!'
    }
  ]);

  const [isFriend, setIsFriend] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostMedia, setNewPostMedia] = useState('');
  const [newPostMediaName, setNewPostMediaName] = useState('');
  const [newPostType, setNewPostType] = useState<'text' | 'image' | 'video'>('text');
  const [newPostCategory, setNewPostCategory] = useState<'feed' | 'myday' | 'video'>('feed');
  const [isProcessingPostMedia, setIsProcessingPostMedia] = useState(false);
  const postFileInputRef = useRef<HTMLInputElement>(null);

  const [activeChat, setActiveChat] = useState<string>('VIP Group');
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [galleryScope, setGalleryScope] = useState<'chat' | 'all'>('chat');
  const [selectedGalleryVideo, setSelectedGalleryVideo] = useState<Message | null>(null);
  const [cloudMessages, setCloudMessages] = useState<Message[]>([]);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [msgMediaType, setMsgMediaType] = useState<'text' | 'image' | 'video' | 'audio' | 'file'>('text');
  const [msgMediaUrl, setMsgMediaUrl] = useState('');
  const [showMsgLinkInput, setShowMsgLinkInput] = useState(false);
  const [msgLinkDraft, setMsgLinkDraft] = useState('');
  const [msgLinkType, setMsgLinkType] = useState<'video' | 'image' | 'audio'>('video');
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const msgFileInputRef = useRef<HTMLInputElement>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor] = useState('#10b981');
  const [drawWidth] = useState(4);

  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [newLedgerName, setNewLedgerName] = useState('');

  const [isChoyAIPopupOpen, setIsChoyAIPopupOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const showNotice = (msg: string) => {
    setSyncNotice(msg);
    setTimeout(() => setSyncNotice(''), 3500);
  };

  // Authenticated fetch helper using in-memory Bearer token
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
      const res = await fetch(url, { ...options, headers, credentials: 'same-origin' });
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
    },
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

  // 2. Sync full state from backend database
  const fetchSyncedState = useCallback(async () => {
    if (!authToken) return;
    try {
      const data = await apiFetch('/api/choy/state');
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
            category: (p.category as 'feed' | 'myday' | 'video') || 'feed'
          }))
        );
      }
      if (Array.isArray(data.messages)) {
        const myId = data.user?.id;
        setCloudMessages(
          data.messages.map((m: Record<string, unknown>) => ({
            id: String(m.id),
            senderId: String(m.senderId || ''),
            sender: String(m.senderName || 'Member'),
            receiver: String(m.roomId || 'VIP Group'),
            text: String(m.text || ''),
            mediaUrl: typeof m.mediaUrl === 'string' ? m.mediaUrl : undefined,
            mediaType: (m.mediaType as Message['mediaType']) || 'text',
            time: formatIsoTime(typeof m.createdAt === 'string' ? m.createdAt : undefined),
            createdAtMs: typeof m.createdAt === 'string' ? new Date(m.createdAt).getTime() : Date.now(),
            isMe: m.senderId === myId,
            reactions: Array.isArray(m.reactions) ? (m.reactions as string[]) : []
          }))
        );
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
      console.error('Sync refresh error:', err);
    }
  }, [authToken, apiFetch]);

  // 3. Initial sync + Real-Time SSE stream + fallback polling
  useEffect(() => {
    if (!authToken) return;
    fetchSyncedState();

    const abortController = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = async () => {
      try {
        const res = await fetch('/api/choy/stream', {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: abortController.signal
        });
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          if (buffer.includes('event: sync')) {
            buffer = '';
            fetchSyncedState();
          }
        }
      } catch {
        // Ignore abort / reconnect cleanly
      }
      if (!abortController.signal.aborted) {
        reconnectTimer = setTimeout(connectSSE, 4000);
      }
    };

    connectSSE();
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchSyncedState();
      }
    }, 6000);

    return () => {
      abortController.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(pollInterval);
    };
  }, [authToken, fetchSyncedState]);

  const messages = [...cloudMessages, ...localMessages].sort((a, b) => a.createdAtMs - b.createdAtMs);

  // Photo Editor Canvas Loader
  useEffect(() => {
    if (isPhotoEditorOpen && msgMediaUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width > 600 ? 600 : img.width;
        canvas.height = img.height > 600 ? 600 : img.height;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
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

  const compressImageToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image file'));
        img.onload = () => {
          const maxDim = 1080;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(reader.result || ''));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = String(reader.result || '');
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

  const handlePostFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPostMedia(true);
    try {
      if (file.type.startsWith('image/')) {
        const dataUrl = await compressImageToDataUrl(file);
        setNewPostMedia(dataUrl);
        setNewPostType('image');
        setNewPostMediaName(file.name);
      } else if (file.type.startsWith('video/')) {
        if (file.size > 6 * 1024 * 1024) {
          showNotice('Video must be 6 MB or smaller para ma-sync sa tanan device.');
          return;
        }
        const dataUrl = await readFileAsDataUrl(file);
        setNewPostMedia(dataUrl);
        setNewPostType('video');
        setNewPostMediaName(file.name);
      } else {
        showNotice('Please select an image or short video file.');
      }
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to load selected file');
    } finally {
      setIsProcessingPostMedia(false);
      e.target.value = '';
    }
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
          category: newPostCategory
        })
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

  const startAudioRecording = async () => {
    if (isRecordingAudio || isProcessingAudio) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showNotice('Voice recording is not supported in this browser.');
      return;
    }
    try {
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

        if (action === 'cancel' || chunks.length === 0) {
          return;
        }

        const audioBlob = new Blob(chunks, { type: finalMime });
        if (audioBlob.size > 3.5 * 1024 * 1024) {
          showNotice('Voice snippet is too large (max 3.5 MB). Please record a shorter clip.');
          return;
        }

        setIsProcessingAudio(true);
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Failed to encode voice recording'));
            reader.onload = () => resolve(String(reader.result || ''));
            reader.readAsDataURL(audioBlob);
          });

          if (action === 'send') {
            await apiFetch('/api/choy/messages', {
              method: 'POST',
              body: JSON.stringify({
                roomId: activeChat,
                text: msgInput.trim() || 'Voice message',
                mediaUrl: dataUrl,
                mediaType: 'audio'
              })
            });
            setMsgInput('');
            setMsgMediaUrl('');
            setMsgMediaType('text');
            await fetchSyncedState();
          } else {
            setMsgMediaType('audio');
            setMsgMediaUrl(dataUrl);
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
    try {
      if (file.type.startsWith('image/')) {
        const dataUrl = await compressImageToDataUrl(file);
        setMsgMediaType('image');
        setMsgMediaUrl(dataUrl);
      } else if (file.type.startsWith('video/') && file.size <= 6 * 1024 * 1024) {
        const dataUrl = await readFileAsDataUrl(file);
        setMsgMediaType('video');
        setMsgMediaUrl(dataUrl);
      } else if (file.type.startsWith('audio/') && file.size <= 3.5 * 1024 * 1024) {
        const dataUrl = await readFileAsDataUrl(file);
        setMsgMediaType('audio');
        setMsgMediaUrl(dataUrl);
      } else {
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith('video/')
          ? 'video'
          : file.type.startsWith('audio/')
          ? 'audio'
          : 'file';
        setMsgMediaType(type);
        setMsgMediaUrl(url);
      }
    } catch {
      showNotice('Failed to load selected attachment');
    } finally {
      e.target.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || (!msgInput.trim() && !msgMediaUrl)) return;

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

    try {
      await apiFetch('/api/choy/messages', {
        method: 'POST',
        body: JSON.stringify({
          roomId: activeChat,
          text: msgInput.trim(),
          mediaUrl: msgMediaUrl || undefined,
          mediaType: msgMediaUrl ? msgMediaType : 'text'
        })
      });
      setMsgInput('');
      setMsgMediaUrl('');
      setMsgMediaType('text');
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to send message');
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

  const handleToggleUserStatus = async (userItem: UserAccount) => {
    if (!isAdmin) return;
    const nextStatus = userItem.status === 'approved' ? 'pending' : 'approved';
    try {
      await apiFetch(`/api/choy/users/${encodeURIComponent(userItem.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleAddCloudUser = async (name: string, phone: string) => {
    if (!isAdmin) return;
    try {
      await apiFetch('/api/choy/users', {
        method: 'POST',
        body: JSON.stringify({ name, phone: phone || `member_${Date.now()}` })
      });
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to add user');
    }
  };

  const handleDeleteCloudUser = async (userId: string) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/choy/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      await fetchSyncedState();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = drawWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = drawColor;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleCropSquare = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
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
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Choy Chat', url: window.location.href });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard?.writeText(window.location.href).catch(() => {});
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

  const filteredPosts = posts
    .filter((p) => !blockedUsers.includes(p.author.name))
    .filter((p) => p.content.toLowerCase().includes(searchQuery.toLowerCase()));

  // Loading state while checking server status
  if (!authChecked) {
    return (
      <div className="fixed inset-0 bg-emerald-950 text-slate-100 flex flex-col items-center justify-center gap-3 p-4">
        <div className="w-16 h-24 rounded-2xl overflow-hidden border border-emerald-400 bg-emerald-950 p-0.5 shadow-lg">
          <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-contain rounded-xl" />
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" /> Connecting to Choy Chat...
        </div>
      </div>
    );
  }

  // Auth Gate: First-Run Admin Setup OR Standard Phone + PIN Login / Register
  if (!authToken || !currentUser) {
    return (
      <div className="fixed inset-0 bg-emerald-950 text-slate-100 flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-emerald-950">
          <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-contain opacity-35" />
          <div className="absolute inset-0 bg-emerald-950/65"></div>
        </div>

        <div className="relative z-15 w-[95%] max-w-sm max-h-[92vh] overflow-y-auto bg-emerald-950/90 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="text-center space-y-1.5">
            <div className="w-16 h-24 rounded-2xl overflow-hidden border border-emerald-400 bg-emerald-950 p-0.5 mx-auto shadow-md">
              <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-contain rounded-xl" />
            </div>
            <h1 className="text-3xl font-black tracking-[0.22em] uppercase bg-gradient-to-r from-amber-200 via-emerald-200 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(251,191,36,0.35)]">
              CHOY CHAT
            </h1>
            <p className="text-[11px] text-emerald-300 flex items-center justify-center gap-1.5">
              <Cloud className="w-3.5 h-3.5" />
              {storageMode === 'postgres' ? 'PostgreSQL Cloud Sync Ready' : 'Render Live Sync Ready'}
            </p>
          </div>

          {loginError && (
            <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-400/40 text-red-200 text-xs text-center">
              {loginError}
            </div>
          )}

          {needsAdminSetup ? (
            <form onSubmit={handleFirstRunAdminSetup} className="space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-900/70 border border-emerald-500/40 text-emerald-200 text-[11px] leading-relaxed">
                <strong className="text-white">First-Run Admin Setup:</strong> I-claim imong Admin account gamit imong phone number ug gusto nimong PIN.
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Admin Name</label>
                <input
                  type="text"
                  required
                  placeholder="Choy Admin"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Admin Phone Number</label>
                <input
                  type="text"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  placeholder="09361223978"
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Create Admin PIN (min. 4 chars)</label>
                <div className="relative">
                  <input
                    type={showAuthPin ? 'text' : 'password'}
                    required
                    minLength={4}
                    placeholder="Enter your secret PIN..."
                    value={authPin}
                    onChange={(e) => setAuthPin(e.target.value)}
                    className="w-full p-2.5 pr-10 bg-slate-900 border border-slate-700 rounded-xl text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPin((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
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
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-emerald-900/60 border border-emerald-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setLoginError('');
                  }}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                    authMode === 'login' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-emerald-200'
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
                    authMode === 'register' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-emerald-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Sign Up
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Your name..."
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    placeholder="09..."
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">PIN</label>
                  <div className="relative">
                    <input
                      type={showAuthPin ? 'text' : 'password'}
                      required
                      minLength={4}
                      placeholder="Enter PIN..."
                      value={authPin}
                      onChange={(e) => setAuthPin(e.target.value)}
                      className="w-full p-2.5 pr-10 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthPin((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
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

          <div className="pt-2 border-t border-emerald-800/80">
            <PWAInstallButton fullWidth />
          </div>
        </div>
        <OfflineIndicator />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-emerald-950/95 text-slate-100 flex flex-col md:flex-row overflow-hidden text-sm">
      {/* VIDEO CALL MODAL */}
      {isInVideoCall && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-3xl h-[70vh] bg-slate-900 rounded-3xl overflow-hidden border border-emerald-500/40 flex items-center justify-center shadow-2xl">
            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-slate-400">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
                  <Video className="w-8 h-8" />
                </div>
                <div className="text-sm font-bold text-white">Video Call Active (HD Stream)</div>
              </div>
            </div>

            <div className="absolute bottom-6 right-6 w-32 h-24 bg-slate-950 rounded-xl border border-emerald-500/50 flex items-center justify-center text-[10px] text-slate-300">
              Your Camera
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <button
              type="button"
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`p-4 rounded-full ${isAudioMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'}`}
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsInVideoCall(false)}
              className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => setIsVideoMuted(!isVideoMuted)}
              className={`p-4 rounded-full ${isVideoMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'}`}
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* PHOTO EDITOR MODAL */}
      {isPhotoEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-4">
          <div className="bg-emerald-950 border border-emerald-500/50 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-emerald-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" /> Photo Editor (Draw & Crop)
              </h3>
              <button type="button" onClick={() => setIsPhotoEditorOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex justify-center bg-slate-900 p-2 rounded-2xl border border-emerald-800 overflow-auto max-h-[50vh]">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
                className="cursor-crosshair max-w-full rounded"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCropSquare}
                  className="px-3 py-1.5 bg-emerald-900 border border-emerald-700 rounded-xl text-emerald-200 hover:bg-emerald-800 font-semibold"
                >
                  Square Crop
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilterGrayscale}
                  className="px-3 py-1.5 bg-emerald-900 border border-emerald-700 rounded-xl text-emerald-200 hover:bg-emerald-800 font-semibold"
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
              (galleryScope === 'all' || m.receiver === activeChat)
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
              <div className="bg-emerald-950 border border-emerald-500/50 rounded-3xl p-5 max-w-2xl w-full space-y-4 shadow-2xl max-h-[88vh] flex flex-col">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-emerald-800 pb-3 shrink-0">
                  <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                    {galleryFilter === 'video' ? (
                      <Video className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                    )}
                    {galleryFilter === 'video' ? 'Shared Videos' : 'Media Gallery'} (
                    {galleryScope === 'all' ? 'All Chats' : activeChat})
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg bg-emerald-900/80 border border-emerald-700 p-0.5 text-[10px]">
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
                      className="text-slate-300 hover:text-white px-2 py-1 font-bold"
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
                  <div className="p-3 rounded-2xl bg-emerald-900/70 border border-emerald-500/50 space-y-2 shrink-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white truncate">
                        Playing Video from {selectedGalleryVideo.sender} ({selectedGalleryVideo.receiver})
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedGalleryVideo(null)}
                        className="text-emerald-300 hover:text-white text-[11px] font-bold"
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
                    <div className="col-span-full py-12 text-center text-emerald-400 text-xs">
                      No shared {galleryFilter === 'all' ? 'media' : galleryFilter} files in{' '}
                      {galleryScope === 'all' ? 'any chat' : activeChat} yet.
                    </div>
                  ) : (
                    filteredGallery.map((m) => (
                      <div
                        key={m.id}
                        className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-2.5 space-y-2 flex flex-col justify-between"
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
                              className="w-full py-1.5 rounded-lg bg-emerald-400/20 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-400 hover:text-slate-950 font-bold text-[11px] transition"
                            >
                              Expand Video with Sound
                            </button>
                          </div>
                        )}
                        {m.mediaType === 'audio' && <audio src={m.mediaUrl} controls className="w-full h-8 my-auto" />}
                        {m.mediaType === 'file' && (
                          <div className="text-amber-300 text-xs py-8 text-center">📎 Shared File</div>
                        )}
                        {m.mediaType !== 'video' && (
                          <div className="text-[10px] text-emerald-300 truncate w-full text-center">
                            {m.sender} • {m.time}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-emerald-800 shrink-0">
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
      <aside className="w-full md:w-60 bg-emerald-900/90 border-b md:border-b-0 md:border-r border-emerald-800 p-2.5 md:p-3 flex flex-row md:flex-col justify-between shrink-0 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto touch-pan-x md:touch-pan-y overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <div className="flex md:flex-col items-center md:items-stretch gap-1.5 w-max md:w-full">
          <div className="hidden md:flex items-center gap-2 px-2 py-2 mb-2">
            <div className="w-9 h-12 rounded-lg overflow-hidden border border-emerald-400 bg-emerald-950 p-0.5 shrink-0">
              <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-contain rounded" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">Choy Chat</div>
              <div className="text-[10px] text-emerald-300 flex items-center gap-1">
                <Cloud className="w-3 h-3" /> {storageMode === 'postgres' ? 'Postgres Synced' : 'Live Synced'}
              </div>
            </div>
          </div>

          <nav className="flex md:flex-col gap-1.5 md:gap-1 w-max md:w-full text-xs font-medium pr-3 md:pr-0">
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === 'feed' ? 'bg-emerald-400 text-slate-950 font-bold' : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Newsfeed</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('people')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === 'people'
                  ? 'bg-emerald-400 text-slate-950 font-bold'
                  : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>People</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('videos')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === 'videos'
                  ? 'bg-emerald-400 text-slate-950 font-bold'
                  : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <Video className="w-4 h-4 shrink-0" />
              <span>Videos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === 'messages'
                  ? 'bg-emerald-400 text-slate-950 font-bold'
                  : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Messages</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap ${
                  activeTab === 'ledger'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'text-emerald-100 hover:bg-emerald-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Milestone</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-emerald-400 text-slate-950 font-bold'
                  : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('choyai')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === 'choyai' ? 'bg-cyan-400 text-slate-950 font-bold' : 'text-cyan-200 hover:bg-emerald-800'
              }`}
            >
              <img
                src={DEFAULT_AVATAR}
                alt=""
                className="w-4 h-5 rounded bg-emerald-950 object-contain shrink-0 border border-cyan-300"
              />
              <span>Choy AI</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`md:hidden px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === 'profile' ? 'bg-emerald-400 text-slate-950 font-bold' : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <img
                src={DEFAULT_AVATAR}
                alt=""
                className="w-4 h-5 rounded bg-emerald-950 object-contain shrink-0 border border-emerald-400"
              />
              <span>Account</span>
            </button>

            {isAdmin && (
              <>
                <div className="pt-2 pb-1 text-[10px] font-bold uppercase text-indigo-300 hidden md:block px-2">
                  Admin Panel
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('admin_approvals')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap ${
                    activeTab === 'admin_approvals'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-indigo-200 hover:bg-emerald-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Approvals</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admin_knowledge')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap ${
                    activeTab === 'admin_knowledge'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-indigo-200 hover:bg-emerald-800'
                  }`}
                >
                  <Database className="w-4 h-4 shrink-0" />
                  <span>AI Brain</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admin_prices')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 whitespace-nowrap ${
                    activeTab === 'admin_prices'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-indigo-200 hover:bg-emerald-800'
                  }`}
                >
                  <Sliders className="w-4 h-4 shrink-0" />
                  <span>Unit Prices</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admin_security')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    activeTab === 'admin_security'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-indigo-200 hover:bg-emerald-800'
                  }`}
                >
                  <Key className="w-4 h-4 shrink-0" />
                  <span>Security Studio</span>
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="hidden md:block pt-3 border-t border-emerald-800 space-y-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="w-full p-2 rounded-xl bg-emerald-950/70 border border-emerald-800 flex items-center gap-2 text-left hover:bg-emerald-800/70 transition"
          >
            <img src={DEFAULT_AVATAR} alt="" className="w-8 h-11 rounded-lg bg-emerald-950 object-contain shrink-0 border border-emerald-500/50" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-white truncate">{currentUser.name}</div>
              <div className="text-[9px] text-emerald-300 truncate">{isAdmin ? 'Admin • Synced' : 'Member • Synced'}</div>
            </div>
          </button>
          <PWAInstallButton fullWidth />
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-xl bg-emerald-950 text-red-300 text-xs font-semibold hover:bg-emerald-800 flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP BAR — FULL-WIDTH DESIGNED CHOY CHAT BANNER */}
        <header className="flex flex-col px-3 sm:px-5 pt-3 pb-3 border-b border-emerald-700/70 bg-gradient-to-b from-emerald-950 via-emerald-900/70 to-emerald-950/90 shrink-0 gap-2.5">
          {/* Full-width edge-to-edge CHOY CHAT Hero Banner */}
          <div className="relative w-full overflow-hidden rounded-2xl border border-amber-400/45 bg-gradient-to-r from-emerald-950 via-emerald-900/95 to-emerald-950 px-3 sm:px-6 py-2.5 sm:py-3.5 shadow-[0_0_25px_rgba(16,185,129,0.22)]">
            {/* Soft ambient emerald & gold glow */}
            <div className="pointer-events-none absolute -top-10 left-1/4 w-48 h-24 rounded-full bg-amber-400/15 blur-2xl"></div>
            <div className="pointer-events-none absolute -bottom-10 right-1/4 w-48 h-24 rounded-full bg-emerald-400/20 blur-2xl"></div>

            {/* Ornamental Gold Corner Accents */}
            <span className="pointer-events-none absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-300/80 rounded-tl-md"></span>
            <span className="pointer-events-none absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-300/80 rounded-tr-md"></span>
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-300/80 rounded-bl-md"></span>
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-300/80 rounded-br-md"></span>

            <div className="relative z-10 w-full flex items-center justify-between gap-2 sm:gap-4">
              {/* Left ornamental wing */}
              <div className="hidden xs:flex sm:flex items-center gap-1.5 flex-1 min-w-[20px]">
                <span className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-amber-400/80 to-emerald-300"></span>
                <span className="w-2 h-2 rotate-45 bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)] shrink-0"></span>
              </div>

              {/* Stretched Full-Width CHOY CHAT Wordmark */}
              <h1 className="flex-1 sm:flex-none text-center font-black uppercase leading-none select-none text-[clamp(1.65rem,7.2vw,3.4rem)] tracking-[0.18em] sm:tracking-[0.28em] md:tracking-[0.34em] bg-gradient-to-r from-amber-200 via-white via-50% to-emerald-300 bg-clip-text text-transparent drop-shadow-[0_3px_14px_rgba(251,191,36,0.4)] whitespace-nowrap pl-[0.18em] sm:pl-[0.28em] md:pl-[0.34em]">
                CHOY CHAT
              </h1>

              {/* Right ornamental wing */}
              <div className="hidden xs:flex sm:flex items-center gap-1.5 flex-1 min-w-[20px]">
                <span className="w-2 h-2 rotate-45 bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)] shrink-0"></span>
                <span className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-amber-400/80 to-emerald-300"></span>
              </div>
            </div>

            {/* Subtle gold bottom shimmer line */}
            <div className="relative z-10 mt-1.5 flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.25em] text-amber-200/85">
              <span className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-amber-300/70"></span>
              <span className="truncate">VIP Social • Live Cloud Sync</span>
              <span className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-amber-300/70"></span>
            </div>
          </div>

          {/* Action & Search Row */}
          <div className="flex items-center gap-2 w-full">
            <div className="shrink-0">
              <PWAInstallButton compact />
            </div>

            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-300" />
              <input
                type="text"
                placeholder="Search posts, people, chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-emerald-950 border border-emerald-700/80 rounded-xl text-xs text-white placeholder-emerald-400 focus:outline-none focus:border-amber-300/80 shadow-inner"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleShareApp}
                className="p-2 bg-emerald-900 border border-emerald-700 rounded-xl text-emerald-200 hover:text-white hover:border-amber-300/60 transition shrink-0"
                title={shareCopied ? 'Link Copied!' : 'Share'}
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="md:hidden p-2 bg-emerald-900 border border-emerald-700 rounded-xl text-red-300 hover:text-white shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
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
              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 shadow space-y-3">
                <div className="flex flex-wrap items-center gap-2 border-b border-emerald-800 pb-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setNewPostCategory('feed')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${
                      newPostCategory === 'feed'
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-extrabold shadow-md'
                        : 'text-emerald-200 bg-emerald-950/80 hover:bg-emerald-800'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" /> Post Feed
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPostCategory('myday')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${
                      newPostCategory === 'myday'
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-extrabold shadow-md'
                        : 'text-emerald-200 bg-emerald-950/80 hover:bg-emerald-800'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Story (My Day)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('messages')}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white ml-auto hover:brightness-110 transition shadow"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Message Chat
                  </button>
                </div>

                <form onSubmit={handleCreatePost} className="space-y-2.5">
                  <input
                    type="file"
                    ref={postFileInputRef}
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handlePostFileSelect}
                  />
                  <textarea
                    rows={2}
                    placeholder="Share an update across all devices..."
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    className="w-full p-2.5 bg-emerald-950 border border-emerald-700 rounded-xl text-xs text-white focus:outline-none resize-none"
                  ></textarea>

                  {newPostMedia && (
                    <div className="relative rounded-xl overflow-hidden bg-emerald-950 border border-emerald-700 p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNewPostMedia('');
                          setNewPostMediaName('');
                          setNewPostType('text');
                        }}
                        className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-lg bg-slate-950/85 border border-red-400/50 text-red-300 hover:text-white text-[11px] font-bold"
                        title="Remove attachment"
                      >
                        ✕
                      </button>
                      {newPostType === 'image' ? (
                        <img
                          src={newPostMedia}
                          alt="Selected attachment"
                          className="max-h-56 w-full object-contain rounded-lg bg-slate-950/60"
                        />
                      ) : (
                        <video
                          src={newPostMedia}
                          controls
                          playsInline
                          className="max-h-56 w-full rounded-lg bg-slate-950"
                        />
                      )}
                      {newPostMediaName && (
                        <div className="text-[10px] text-emerald-300 mt-1.5 truncate px-1">{newPostMediaName}</div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessingPostMedia}
                      onClick={() => postFileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-emerald-950 border border-emerald-500/60 text-emerald-200 hover:bg-emerald-800 hover:text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-60"
                    >
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>{isProcessingPostMedia ? 'Loading...' : 'Add + Image / Video'}</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingPostMedia || (!newPostText.trim() && !newPostMedia.trim())}
                      className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow disabled:opacity-50"
                    >
                      Publish
                    </button>
                  </div>
                </form>
              </div>

              {/* Public Newsfeed Posts */}
              <div className="space-y-3">
                {filteredPosts.length === 0 ? (
                  <div className="bg-emerald-900/40 border border-emerald-800 rounded-2xl p-8 text-center text-xs text-emerald-300">
                    No posts yet. Publish your first update above to sync across all devices!
                  </div>
                ) : (
                  filteredPosts.map((p) => (
                    <div key={p.id} className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('profile')}>
                          <div className="relative">
                            <img src={p.author.avatar} alt="" className="w-9 h-12 rounded-lg bg-emerald-950 object-contain border border-emerald-500/50" />
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-emerald-950 rounded-full"
                              title="Online"
                            ></span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{p.author.name}</div>
                            <div className="text-[10px] text-emerald-300">{p.timestamp}</div>
                          </div>
                        </div>
                        {(p.authorId === currentUser.id || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(p.id)}
                            className="text-red-300 hover:text-red-100"
                            title="Delete Post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {p.content && <p className="text-xs text-slate-100 break-words">{p.content}</p>}
                      {p.mediaUrl && p.mediaType === 'image' && (
                        <button
                          type="button"
                          onClick={() =>
                            setZoomedImage({
                              src: p.mediaUrl!,
                              caption: p.content || `${p.author.name} • ${p.timestamp}`
                            })
                          }
                          className="group relative block w-full rounded-xl overflow-hidden bg-emerald-950/70 border border-emerald-700/50 hover:border-emerald-400/80 transition cursor-zoom-in text-left"
                          title="Tap to zoom in / zoom out"
                        >
                          <img
                            src={p.mediaUrl}
                            alt={p.content || 'Post image'}
                            className="max-h-96 w-full object-contain group-hover:scale-[1.01] transition duration-200"
                          />
                          <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-slate-950/85 border border-emerald-400/60 text-emerald-200 text-[10px] font-bold flex items-center gap-1 shadow">
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
              {usersList.map((u) => {
                const isMe = u.id === currentUser.id;
                const isBlocked = blockedUsers.includes(u.name);
                return (
                  <div
                    key={u.id}
                    className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img src={DEFAULT_AVATAR} alt="" className="w-9 h-12 rounded-xl bg-emerald-950 object-contain border border-emerald-500/50" />
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-emerald-950 rounded-full"
                          title="Online"
                        ></span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {u.name} {isMe ? '(You)' : ''}
                        </div>
                        <div className="text-[10px] text-emerald-300 truncate">{u.status}</div>
                      </div>
                    </div>
                    {!isMe && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleBlockUser(u.name)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                            isBlocked ? 'bg-red-500 text-white' : 'bg-red-950 text-red-300 border border-red-700'
                          }`}
                        >
                          {isBlocked ? 'Blocked' : 'Block User'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsFriend(!isFriend)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                            isFriend ? 'bg-slate-800 text-slate-300' : 'bg-emerald-400 text-slate-950'
                          }`}
                        >
                          {isFriend ? 'Friends' : 'Add Friend'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
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
                  <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <Video className="w-4 h-4 text-emerald-400" /> Shared Chat Videos ({sharedChatVideos.length})
                      </div>
                      <span className="text-[10px] text-emerald-300">Sound Enabled • Cloud Synced</span>
                    </div>
                    {sharedChatVideos.length === 0 ? (
                      <div className="py-6 text-center text-xs text-emerald-300">
                        No shared videos from chats yet. Share a video link in Messages to sync it across all devices.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sharedChatVideos.map((vid) => (
                          <div key={vid.id} className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800">
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

                  <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 space-y-2">
                    <div className="text-xs font-bold text-white">Video Streams & Entertainment</div>
                    <ChatVideoPlayer
                      src="https://www.w3schools.com/html/mov_bbb.mp4"
                      title="Featured Stream"
                      subtitle="HD Audio"
                    />
                  </div>
                </div>
              );
            })()}

          {/* PROFILE / ACCOUNT (ZOOMED OUT FULL PORTRAIT) */}
          {activeTab === 'profile' && (
            <div className="max-w-xl mx-auto bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-5 shadow-lg">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div className="relative w-full max-w-[240px] aspect-[9/16] max-h-[380px] rounded-2xl bg-emerald-950 border-2 border-emerald-400/80 p-1.5 overflow-hidden shadow-xl shrink-0">
                  <img
                    src={DEFAULT_AVATAR}
                    alt="Account portrait"
                    className="w-full h-full object-contain rounded-xl"
                  />
                  <span
                    className="absolute bottom-3 right-3 w-3.5 h-3.5 bg-emerald-400 border-2 border-emerald-950 rounded-full"
                    title="Online"
                  ></span>
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left space-y-2.5 pt-1">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-300">My Account</div>
                    <div className="text-lg font-black text-white truncate">{currentUser.name}</div>
                    <div className="text-xs text-emerald-200 font-mono truncate">{currentUser.phone}</div>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-200">
                      <Cloud className="w-3 h-3" />{' '}
                      {storageMode === 'postgres' ? 'PostgreSQL Cloud Sync Active' : 'Live Server Sync Active'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-[10px] font-bold text-indigo-200 uppercase">
                      {isAdmin ? 'Admin' : 'Member'}
                    </span>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-xl bg-emerald-950 border border-red-500/40 text-red-300 text-xs font-bold hover:bg-red-950/60 inline-flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Logout Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MESSAGES WITH REAL-TIME SYNC & REACTIONS */}
          {activeTab === 'messages' && (
            <div className="max-w-4xl mx-auto flex flex-col md:grid md:grid-cols-3 gap-3 md:gap-4 md:h-[580px]">
              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-3 flex flex-col space-y-2 shrink-0">
                <div className="text-xs font-bold text-emerald-300 uppercase">Chats</div>
                <div className="flex md:flex-col gap-2 overflow-x-auto touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch] md:overflow-visible pb-1.5 md:pb-0">
                  {CHAT_ROOMS.map((room) => {
                    const isActive = activeChat === room;
                    return (
                      <button
                        key={room}
                        type="button"
                        onClick={() => setActiveChat(room)}
                        className={`px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition whitespace-nowrap shrink-0 md:w-full text-left ${
                          isActive
                            ? 'bg-emerald-400 text-slate-950 font-bold shadow'
                            : 'bg-emerald-950 text-emerald-200 hover:bg-emerald-800'
                        }`}
                      >
                        <span>{room}</span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? 'bg-slate-950' : 'bg-emerald-400'}`}
                          title={isActive ? 'Active' : 'Online'}
                        ></span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2 bg-emerald-900/60 border border-emerald-700/50 rounded-2xl flex flex-col min-h-[430px] md:min-h-0 md:h-full overflow-hidden">
                {/* Responsive Swipeable Chat Header */}
                <div className="p-3 border-b border-emerald-800 space-y-2 text-xs font-bold text-white shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-white truncate">{activeChat}</span>
                    <div className="flex items-center gap-1.5 overflow-x-auto touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch] max-w-[68%] sm:max-w-none pb-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const targetUser = activeChat === 'VIP Group' ? 'Choy Admin' : activeChat;
                          handleToggleBlockUser(targetUser);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 whitespace-nowrap ${
                          blockedUsers.includes(activeChat === 'VIP Group' ? 'Choy Admin' : activeChat)
                            ? 'bg-red-500 text-white'
                            : 'bg-red-950 text-red-300 border border-red-700'
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
                        className="px-2.5 py-1.5 bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 rounded-lg flex items-center gap-1 shadow shrink-0 whitespace-nowrap hover:bg-cyan-400 hover:text-slate-950 text-[11px] transition"
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
                        className="px-2.5 py-1.5 bg-emerald-900 border border-emerald-700 text-emerald-200 rounded-lg flex items-center gap-1 shadow shrink-0 whitespace-nowrap hover:text-white text-[11px]"
                        title="Shared Media Gallery"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Gallery
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsInVideoCall(true)}
                        className="px-2.5 py-1.5 bg-emerald-400 text-slate-950 rounded-lg flex items-center gap-1 shadow shrink-0 whitespace-nowrap text-[11px]"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Call
                      </button>
                    </div>
                  </div>
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-300" />
                    <input
                      type="text"
                      placeholder={`Search messages in ${activeChat}...`}
                      value={msgSearchQuery}
                      onChange={(e) => setMsgSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-emerald-950 border border-emerald-700 rounded-lg text-[11px] font-normal text-white placeholder-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-y-auto touch-pan-y [-webkit-overflow-scrolling:touch] p-3 space-y-3 min-h-[240px] max-h-[55dvh] md:max-h-none">
                  {messages
                    .filter((m) => m.receiver === activeChat)
                    .filter((m) => !blockedUsers.includes(m.sender))
                    .filter((m) => (m.text || '').toLowerCase().includes(msgSearchQuery.toLowerCase()))
                    .map((m) => (
                      <div key={m.id} className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}>
                        <div className="text-[10px] text-emerald-300 px-1 mb-0.5">
                          {m.sender} • {m.time}
                        </div>
                        <div className="p-3 rounded-2xl text-xs bg-emerald-950 text-slate-100 space-y-2 max-w-[85%]">
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
                            <audio src={m.mediaUrl} controls className="w-full h-8" />
                          )}
                          {m.mediaType === 'file' && (
                            <div className="text-amber-300 text-[10px]">📎 File Attachment</div>
                          )}
                          {m.text && <div className="break-words">{m.text}</div>}

                          {m.reactions && m.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {m.reactions.map((emoji, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="px-1.5 py-0.5 rounded-full bg-emerald-900/80 text-[10px] border border-emerald-700"
                                >
                                  {emoji}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mt-1 px-1">
                          {(['❤️', '👍', '🔥', '😄'] as const).map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => addReactionToMessage(m, emoji)}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-800 text-slate-300"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="p-3 border-t border-emerald-800 bg-emerald-950 space-y-2">
                  <input
                    type="file"
                    ref={msgFileInputRef}
                    className="hidden"
                    accept="image/*,video/*,audio/*,*"
                    onChange={handleMsgFileSelect}
                  />

                  {showMsgLinkInput && (
                    <div className="flex flex-wrap items-center gap-2 p-2 bg-emerald-900/80 rounded-xl border border-emerald-700 text-xs">
                      <select
                        value={msgLinkType}
                        onChange={(e) => setMsgLinkType(e.target.value as 'video' | 'image' | 'audio')}
                        className="p-1.5 bg-emerald-950 border border-emerald-700 rounded-lg text-emerald-200 text-[11px]"
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
                        className="flex-1 min-w-[140px] p-1.5 bg-emerald-950 border border-emerald-700 rounded-lg text-white text-[11px]"
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
                    <div className="flex items-center justify-between p-2 bg-emerald-900/80 rounded-xl text-xs border border-emerald-700">
                      <div className="flex items-center gap-2">
                        <img src={msgMediaUrl} alt="" className="w-8 h-8 rounded object-cover" />
                        <span className="text-emerald-200">Attached Image</span>
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
                          className="text-red-300 hover:text-red-100 font-bold px-1.5"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {msgMediaUrl && msgMediaType === 'audio' && (
                    <div className="flex items-center gap-2 p-2 bg-emerald-900/80 rounded-xl text-xs border border-emerald-700">
                      <span className="text-emerald-300 font-bold text-[11px] shrink-0 flex items-center gap-1">
                        <Mic className="w-3.5 h-3.5 text-emerald-400" /> Voice
                      </span>
                      <audio src={msgMediaUrl} controls className="h-8 flex-1 min-w-0" />
                      <button
                        type="button"
                        onClick={() => {
                          setMsgMediaUrl('');
                          setMsgMediaType('text');
                        }}
                        className="text-red-300 hover:text-red-100 font-bold px-1.5 shrink-0"
                        title="Discard voice snippet"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {msgMediaUrl && msgMediaType !== 'image' && msgMediaType !== 'audio' && (
                    <div className="flex items-center justify-between p-2 bg-emerald-900/80 rounded-xl text-xs border border-emerald-700">
                      <span className="text-emerald-200 truncate">📎 Attached {msgMediaType.toUpperCase()}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMsgMediaUrl('');
                          setMsgMediaType('text');
                        }}
                        className="text-red-300 hover:text-red-100 font-bold px-1.5"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {isRecordingAudio ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-red-950/70 border border-red-500/60 rounded-xl text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                        <span className="font-bold text-red-100 whitespace-nowrap">Recording Voice</span>
                        <span className="font-mono text-red-200 bg-red-900/80 px-2 py-0.5 rounded-md">
                          {formatRecordingTime(recordingSeconds)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => stopAudioRecording('cancel')}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-semibold flex items-center gap-1"
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
                    <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => msgFileInputRef.current?.click()}
                        className="p-2.5 rounded-xl bg-emerald-900 border border-emerald-700 text-emerald-300 hover:text-white hover:bg-emerald-800 transition shrink-0"
                        title="Upload local picture, video, audio or file"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isProcessingAudio}
                        onClick={startAudioRecording}
                        className="p-2.5 rounded-xl bg-emerald-900 border border-emerald-700 text-emerald-300 hover:text-white hover:bg-emerald-800 transition shrink-0 disabled:opacity-50"
                        title="Record voice message"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMsgLinkInput(!showMsgLinkInput)}
                        className={`p-2.5 rounded-xl border transition shrink-0 ${
                          showMsgLinkInput
                            ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                            : 'bg-emerald-900 border-emerald-700 text-cyan-300 hover:text-white hover:bg-emerald-800'
                        }`}
                        title="Attach synced Video/Image URL"
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                      <input
                        type="text"
                        placeholder={isProcessingAudio ? 'Preparing voice clip...' : `Message ${activeChat}...`}
                        value={msgInput}
                        onChange={(e) => setMsgInput(e.target.value)}
                        className="flex-1 min-w-0 p-2.5 bg-emerald-900 border border-emerald-700 rounded-xl text-xs text-white placeholder-emerald-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isProcessingAudio}
                        className="px-3.5 sm:px-4 py-2.5 bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow hover:bg-emerald-300 transition shrink-0 disabled:opacity-50"
                      >
                        Send
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MILESTONE SPREADSHEET LEDGER (ADMIN ONLY) */}
          {activeTab === 'ledger' && isAdmin && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2 bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 shadow">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase">Milestone Spreadsheet Ledger</h3>
                  <p className="text-[10px] text-emerald-300">
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

              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 shadow space-y-3">
                <h3 className="text-xs font-bold text-white uppercase">Add Quantity Record</h3>
                <form onSubmit={handleAddLedgerRow} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Name..."
                    value={newLedgerName}
                    onChange={(e) => setNewLedgerName(e.target.value)}
                    className="p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-xs text-white flex-1"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
                  >
                    Add Name Row
                  </button>
                </form>
              </div>

              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl overflow-hidden shadow">
                <div className="max-h-[60vh] overflow-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead className="bg-emerald-950 text-emerald-300 sticky top-0 z-10 text-[10px] uppercase">
                      <tr>
                        <th className="p-3 sticky left-0 bg-emerald-950 z-20">Name</th>
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
                          <tr key={row.id} className="hover:bg-emerald-850">
                            <td className="p-3 sticky left-0 bg-emerald-900 font-bold text-white font-sans max-w-[120px] truncate">
                              {row.name}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={row.fiveH}
                                  onChange={(e) => handleUpdateLedgerField(row, { fiveH: Number(e.target.value) })}
                                  className={`w-12 p-1 bg-emerald-950 border-2 rounded text-center text-white font-bold ${
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
                                className="w-12 p-1 bg-emerald-950 border border-emerald-700 rounded text-center text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.point5}
                                onChange={(e) => handleUpdateLedgerField(row, { point5: Number(e.target.value) })}
                                className="w-12 p-1 bg-emerald-950 border border-emerald-700 rounded text-center text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.halfSack}
                                onChange={(e) => handleUpdateLedgerField(row, { halfSack: Number(e.target.value) })}
                                className="w-12 p-1 bg-emerald-950 border border-emerald-700 rounded text-center text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.oneSack}
                                onChange={(e) => handleUpdateLedgerField(row, { oneSack: Number(e.target.value) })}
                                className="w-12 p-1 bg-emerald-950 border border-emerald-700 rounded text-center text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.bal}
                                onChange={(e) => handleUpdateLedgerField(row, { bal: Number(e.target.value) })}
                                className="w-16 p-1 bg-emerald-950 border border-emerald-700 rounded text-center text-white"
                              />
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-300">₱{total}</td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteLedgerRow(row.id)}
                                className="text-red-300 hover:text-red-100"
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
                <div className="p-4 rounded-2xl bg-blue-600/25 border-2 border-blue-500 shadow-lg shadow-blue-950/50 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-md bg-blue-500 border border-blue-200 inline-block shadow"></span>
                      <span className="text-[10px] font-bold text-blue-200 uppercase">Total</span>
                    </div>
                    <div className="text-2xl font-black text-white font-mono">₱{totalBlue.toLocaleString()}</div>
                  </div>
                  <div className="w-2.5 h-12 rounded-full bg-blue-500"></div>
                </div>
                <div className="p-4 rounded-2xl bg-red-600/25 border-2 border-red-500 shadow-lg shadow-red-950/50 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-md bg-red-500 border border-red-200 inline-block shadow"></span>
                      <span className="text-[10px] font-bold text-red-200 uppercase">Total</span>
                    </div>
                    <div className="text-2xl font-black text-white font-mono">₱{totalRed.toLocaleString()}</div>
                  </div>
                  <div className="w-2.5 h-12 rounded-full bg-red-500"></div>
                </div>
              </div>
            </div>
          )}

          {/* CHOY AI */}
          {activeTab === 'choyai' && (
            <div className="max-w-2xl mx-auto bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 flex flex-col h-[500px]">
              <div className="flex items-center gap-2 pb-3 border-b border-emerald-800 text-xs font-bold text-cyan-300">
                <Bot className="w-4 h-4" /> Choy AI
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
                {aiChatMessages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`p-3 rounded-xl max-w-[80%] ${
                        m.sender === 'user' ? 'bg-emerald-400 text-slate-950 font-bold' : 'bg-emerald-950 text-cyan-200'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!aiChatInput.trim()) return;
                  const q = aiChatInput;
                  setAiChatMessages((prev) => [...prev, { sender: 'user', text: q }]);
                  setAiChatInput('');

                  const found = knowledgeBase.find(
                    (k) =>
                      k.question.toLowerCase().includes(q.toLowerCase()) ||
                      q.toLowerCase().includes(k.question.toLowerCase())
                  );
                  const aiAns = found
                    ? found.answer
                    : `Choy AI synchronized answer for: "${q}". (Note: Private messages are strictly accessible by admin only).`;
                  setTimeout(() => {
                    setAiChatMessages((prev) => [...prev, { sender: 'ai', text: aiAns }]);
                  }, 400);
                }}
                className="p-2 border-t border-emerald-800 flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask Choy AI..."
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  className="flex-1 p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-xs text-white"
                />
                <button type="submit" className="px-4 py-2 bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl">
                  Ask
                </button>
              </form>
            </div>
          )}

          {/* ADMIN TABS */}
          {activeTab === 'admin_approvals' && isAdmin && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">User Accounts Approval & Sync Monitor</h3>
                <div className="space-y-2">
                  {usersList.map((u) => (
                    <div
                      key={u.id}
                      className="p-3 bg-emerald-950 border border-emerald-800 rounded-xl flex items-center justify-between text-xs gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          {u.name} ({u.phone})
                        </div>
                        <div className="text-[10px] text-emerald-300">Last Synced: {u.loginDate}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {u.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(u)}
                          className="px-2.5 py-1 bg-emerald-400 text-slate-950 font-bold rounded"
                        >
                          {u.status === 'approved' ? 'Set Pending' : 'Approve'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin_knowledge' && isAdmin && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">Choy AI Brain Knowledge Box (Synced Q & A)</h3>
                <form onSubmit={handleAddKnowledge} className="space-y-2 text-xs">
                  <input
                    type="text"
                    placeholder="Question..."
                    value={newQ}
                    onChange={(e) => setNewQ(e.target.value)}
                    className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
                  />
                  <input
                    type="text"
                    placeholder="Answer..."
                    value={newA}
                    onChange={(e) => setNewA(e.target.value)}
                    className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
                  />
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl">
                    Add Knowledge
                  </button>
                </form>

                <div className="space-y-2 pt-2">
                  {knowledgeBase.map((k) => (
                    <div
                      key={k.id}
                      className="p-2.5 bg-emerald-950 rounded-xl text-xs flex items-start justify-between gap-2"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-cyan-300">Q: {k.question}</div>
                        <div className="text-slate-200">A: {k.answer}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteKnowledge(k.id)}
                        className="text-red-300 hover:text-red-100 p-1 shrink-0"
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
              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4 text-xs">
                <h3 className="text-sm font-bold text-white">Set Unit Prices (Synced)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-emerald-300 mb-1">5H Unit Price</label>
                    <input
                      type="number"
                      value={unitPrices.fiveH}
                      onChange={(e) => setUnitPrices({ ...unitPrices, fiveH: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-300 mb-1">Bulig Unit Price</label>
                    <input
                      type="number"
                      value={unitPrices.bulig}
                      onChange={(e) => setUnitPrices({ ...unitPrices, bulig: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-300 mb-1">Point 5 Unit Price</label>
                    <input
                      type="number"
                      value={unitPrices.point5}
                      onChange={(e) => setUnitPrices({ ...unitPrices, point5: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-300 mb-1">Half Sack Unit Price</label>
                    <input
                      type="number"
                      value={unitPrices.halfSack}
                      onChange={(e) => setUnitPrices({ ...unitPrices, halfSack: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-300 mb-1">One Sack Unit Price</label>
                    <input
                      type="number"
                      value={unitPrices.oneSack}
                      onChange={(e) => setUnitPrices({ ...unitPrices, oneSack: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
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

              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4 text-xs">
                <h3 className="text-sm font-bold text-white">
                  Add Quantity / Default Quantities (Apply & Sync to All Milestones)
                </h3>
                <form onSubmit={handleSaveDefaultQuantities} className="space-y-3">
                  <div>
                    <label className="block text-emerald-300 mb-1">5H Default Quantity</label>
                    <input
                      type="number"
                      value={defaultQuantities.fiveH}
                      onChange={(e) => setDefaultQuantities({ ...defaultQuantities, fiveH: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-300 mb-1">Bulig Default Quantity</label>
                    <input
                      type="number"
                      value={defaultQuantities.bulig}
                      onChange={(e) => setDefaultQuantities({ ...defaultQuantities, bulig: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-300 mb-1">Point 5 Default Quantity</label>
                    <input
                      type="number"
                      value={defaultQuantities.point5}
                      onChange={(e) => setDefaultQuantities({ ...defaultQuantities, point5: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-300 mb-1">Half Sack Default Quantity</label>
                    <input
                      type="number"
                      value={defaultQuantities.halfSack}
                      onChange={(e) =>
                        setDefaultQuantities({ ...defaultQuantities, halfSack: Number(e.target.value) })
                      }
                      className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-300 mb-1">One Sack Default Quantity</label>
                    <input
                      type="number"
                      value={defaultQuantities.oneSack}
                      onChange={(e) =>
                        setDefaultQuantities({ ...defaultQuantities, oneSack: Number(e.target.value) })
                      }
                      className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
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

          {/* SECURITY STUDIO (ADMIN ONLY) */}
          {activeTab === 'admin_security' && isAdmin && (
            <SecurityStudio
              usersList={usersList}
              setUsersList={setUsersList}
              onAddUser={(name, phone) => handleAddCloudUser(name, phone)}
              onToggleUserStatus={handleToggleUserStatus}
              onDeleteUser={handleDeleteCloudUser}
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
            />
          )}

          {/* ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="w-3 h-3 rounded bg-blue-500 border border-blue-200 inline-block"></span>
                  Top 3 Earners
                </h3>
                {topLeaderboard.length === 0 ? (
                  <div className="text-xs text-emerald-300 text-center py-6">
                    No leaderboard records synced yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {topLeaderboard.slice(0, 3).map((u, i) => (
                      <div
                        key={u.id}
                        className="p-4 rounded-xl bg-emerald-950 border border-emerald-800 text-center space-y-1 text-xs"
                      >
                        <div className="text-amber-400 font-bold">#{i + 1}</div>
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="font-mono text-emerald-300">₱{u.total.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-emerald-800 bg-emerald-950 py-3 px-4 text-center text-[10px] text-emerald-300 shrink-0">
          CHOYCHAT 2026: All Rights Reserved
        </footer>
      </div>

      {/* FLOATING CHOY AI POPUP WIDGET */}
      <div className="fixed bottom-16 right-3 md:bottom-6 md:right-6 z-40">
        {!isChoyAIPopupOpen && (
          <button
            type="button"
            onClick={() => setIsChoyAIPopupOpen(true)}
            className="w-12 h-14 md:w-14 md:h-16 bg-emerald-950 border-2 border-cyan-400 rounded-2xl shadow-2xl flex items-center justify-center font-bold hover:scale-105 overflow-hidden p-0.5 transition"
            title="Ask Choy AI"
          >
            <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-contain rounded-xl" />
          </button>
        )}

        {isChoyAIPopupOpen && (
          <div className="w-80 h-96 bg-emerald-950 border border-cyan-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 bg-emerald-900 border-b border-cyan-500/40 text-cyan-200 font-bold text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={DEFAULT_AVATAR}
                  alt=""
                  className="w-5 h-6 rounded bg-emerald-950 object-contain border border-cyan-400"
                />{' '}
                Choy AI Assistant
              </div>
              <button
                type="button"
                onClick={() => setIsChoyAIPopupOpen(false)}
                className="text-slate-300 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              {aiChatMessages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`p-2.5 rounded-xl max-w-[85%] ${
                      m.sender === 'user' ? 'bg-cyan-400 text-slate-950 font-bold' : 'bg-emerald-900 text-cyan-200'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!aiChatInput.trim()) return;
                const q = aiChatInput;
                setAiChatMessages((prev) => [...prev, { sender: 'user', text: q }]);
                setAiChatInput('');

                const found = knowledgeBase.find(
                  (k) =>
                    k.question.toLowerCase().includes(q.toLowerCase()) ||
                    q.toLowerCase().includes(k.question.toLowerCase())
                );
                const aiAns = found
                  ? found.answer
                  : `Choy AI synchronized answer for: "${q}". (Note: Private messages are strictly accessible by admin only).`;
                setTimeout(() => {
                  setAiChatMessages((prev) => [...prev, { sender: 'ai', text: aiAns }]);
                }, 400);
              }}
              className="p-2 border-t border-emerald-800 bg-emerald-950 flex gap-2"
            >
              <input
                type="text"
                placeholder="Ask Choy AI anything..."
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                className="flex-1 p-2 bg-emerald-900 border border-emerald-700 rounded-xl text-xs text-white placeholder-emerald-300 focus:outline-none"
              />
              <button type="submit" className="px-3 py-2 bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow">
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {zoomedImage && (
        <ImageZoomModal
          src={zoomedImage.src}
          caption={zoomedImage.caption}
          onClose={() => setZoomedImage(null)}
        />
      )}

      <OfflineIndicator />
    </div>
  );
}
