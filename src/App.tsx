/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Loader2
} from 'lucide-react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  type Timestamp
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  BOOTSTRAPPED_ADMIN_EMAIL,
  handleFirestoreError,
  OperationType,
  type User
} from './firebase';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SecurityStudio } from './components/SecurityStudio';
import { ChatVideoPlayer } from './components/ChatVideoPlayer';

interface UserAccount {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
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
  createdAtMs: number;
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

function clampNumber(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(min, Math.min(max, val));
}

function formatTimestamp(ts?: Timestamp | null): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Just now';
  try {
    const d = ts.toDate();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
}

function formatDateTime(ts?: Timestamp | null): string {
  if (!ts || typeof ts.toDate !== 'function') return new Date().toISOString().slice(0, 16).replace('T', ' ');
  try {
    return ts.toDate().toISOString().slice(0, 16).replace('T', ' ');
  } catch {
    return '';
  }
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [hasAdminDoc, setHasAdminDoc] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [fatalError, setFatalError] = useState<Error | null>(null);
  const [syncNotice, setSyncNotice] = useState('');

  if (fatalError) {
    throw fatalError;
  }

  const isBootstrappedAdmin =
    Boolean(firebaseUser?.emailVerified) &&
    firebaseUser?.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
  const isAdmin = isBootstrappedAdmin || hasAdminDoc;

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

  const [profile, setProfile] = useState({
    name: 'Choy Member',
    handle: '@choychat',
    avatar: DEFAULT_AVATAR,
    isFriend: false
  });

  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostMedia, setNewPostMedia] = useState('');
  const [newPostType, setNewPostType] = useState<'text' | 'image' | 'video'>('image');
  const [newPostCategory, setNewPostCategory] = useState<'feed' | 'myday' | 'video'>('feed');

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

  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
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
  const seededOnceRef = useRef(false);

  const reportError = (error: unknown, op: OperationType, path: string | null) => {
    try {
      handleFirestoreError(error, op, path);
    } catch (wrapped) {
      setFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
    }
  };

  const showNotice = (msg: string) => {
    setSyncNotice(msg);
    setTimeout(() => setSyncNotice(''), 3500);
  };

  const calculateRowTotalWithPrices = (row: LedgerRow, prices = unitPrices) => {
    return (
      row.fiveH * prices.fiveH +
      row.bulig * prices.bulig +
      row.point5 * prices.point5 +
      row.halfSack * prices.halfSack +
      row.oneSack * prices.oneSack +
      row.bal
    );
  };

  const calculateRowTotal = (row: LedgerRow) => calculateRowTotalWithPrices(row, unitPrices);

  // 1. Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        const displayName = user.displayName || user.email?.split('@')[0] || 'Choy Member';
        setProfile((prev) => ({
          ...prev,
          name: displayName,
          handle: user.email || '@choychat',
          avatar: user.photoURL || DEFAULT_AVATAR
        }));
      } else {
        setHasAdminDoc(false);
        setPosts([]);
        setCloudMessages([]);
        setLocalMessages([]);
        setUsersList([]);
        setKnowledgeBase([]);
        setLedgerRows([]);
        setLeaderboard([]);
        setBlockedUsers([]);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Sync signed-in user profile + private info + optional initial seed (admin first boot)
  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    let cancelled = false;

    const syncProfileAndBootstrap = async () => {
      try {
        const bootstrapped =
          Boolean(firebaseUser.emailVerified) &&
          firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

        let adminRole = bootstrapped;
        if (!bootstrapped) {
          try {
            const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
            adminRole = adminSnap.exists();
          } catch {
            adminRole = false;
          }
        }
        if (!cancelled) setHasAdminDoc(adminRole);

        // Step A: Ensure /users/{uid} exists FIRST (required by private subcollection rule)
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        const safeName = (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Choy Member').slice(0, 80);
        const safePhoto =
          firebaseUser.photoURL && firebaseUser.photoURL.length <= 500 ? firebaseUser.photoURL : undefined;

        if (!userSnap.exists()) {
          const createPayload: Record<string, unknown> = {
            uid: firebaseUser.uid,
            displayName: safeName,
            status: adminRole ? 'approved' : 'pending',
            visibility: 'public',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          if (safePhoto) createPayload.photoURL = safePhoto;
          await setDoc(userRef, createPayload);
        } else {
          const updatePayload: Record<string, unknown> = {
            displayName: safeName,
            updatedAt: serverTimestamp()
          };
          if (safePhoto) updatePayload.photoURL = safePhoto;
          if (adminRole && userSnap.data().status !== 'approved') {
            updatePayload.status = 'approved';
          }
          await updateDoc(userRef, updatePayload);
        }

        // Step B: Ensure /users/{uid}/private/info exists AFTER parent /users/{uid}
        const privRef = doc(db, 'users', firebaseUser.uid, 'private', 'info');
        const privSnap = await getDoc(privRef);
        const safeEmail = (firebaseUser.email || 'user@choychat.app').slice(0, 160);

        if (!privSnap.exists()) {
          await setDoc(privRef, {
            uid: firebaseUser.uid,
            email: safeEmail,
            blockedUsers: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else if (privSnap.data().email !== safeEmail) {
          await updateDoc(privRef, {
            email: safeEmail,
            updatedAt: serverTimestamp()
          });
        }

        // Step C: One-time initial seed when Admin logs in on a brand-new database
        if (adminRole && !seededOnceRef.current) {
          seededOnceRef.current = true;
          const settingsRef = doc(db, 'settings', 'prices');
          const settingsSnap = await getDoc(settingsRef);
          if (!settingsSnap.exists()) {
            await setDoc(settingsRef, {
              fiveH: 50,
              bulig: 100,
              point5: 150,
              halfSack: 200,
              oneSack: 400,
              defFiveH: 0,
              defBulig: 0,
              defPoint5: 0,
              defHalfSack: 0,
              defOneSack: 0,
              updatedBy: firebaseUser.uid,
              updatedAt: serverTimestamp()
            });

            await addDoc(collection(db, 'posts'), {
              authorId: firebaseUser.uid,
              authorName: 'Choy Chat Official',
              authorHandle: '@choychat',
              authorAvatar: DEFAULT_AVATAR,
              content: 'Welcome to Choy Chat! Real-time cloud sync is now active across all your devices.',
              mediaUrl: DEFAULT_AVATAR,
              mediaType: 'image',
              category: 'feed',
              visibility: 'public',
              createdAt: serverTimestamp()
            });

            await addDoc(collection(db, 'messages'), {
              senderId: firebaseUser.uid,
              senderName: safeName,
              roomId: 'VIP Group',
              text: 'Welcome to VIP Group! Messages now sync in real time across all devices.',
              mediaType: 'text',
              reactions: ['❤️', '👍'],
              visibility: 'members',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            await addDoc(collection(db, 'messages'), {
              senderId: firebaseUser.uid,
              senderName: safeName,
              roomId: 'VIP Group',
              text: 'Shared group video clip (tap Play with Sound).',
              mediaType: 'video',
              mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
              reactions: ['🔥'],
              visibility: 'members',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            await addDoc(collection(db, 'knowledge'), {
              question: 'What is Choy Chat?',
              answer: 'Choy Chat is a cloud-synced social media, entertainment, and milestone ledger platform.',
              visibility: 'public',
              createdBy: firebaseUser.uid,
              createdAt: serverTimestamp()
            });

            await addDoc(collection(db, 'knowledge'), {
              question: 'How does the ledger work?',
              answer:
                'The Milestone Ledger tracks 5H, Bulig, Point 5, Half Sack, and One Sack quantities with automatic cloud sync.',
              visibility: 'public',
              createdBy: firebaseUser.uid,
              createdAt: serverTimestamp()
            });

            const starterRows: Omit<LedgerRow, 'id'>[] = [
              { name: 'Choy Admin', fiveH: 5, fiveHType: 'blue', bulig: 3, point5: 2, halfSack: 4, oneSack: 2, bal: 500 },
              { name: 'Maria Vibe', fiveH: 4, fiveHType: 'red', bulig: 5, point5: 3, halfSack: 2, oneSack: 3, bal: -200 }
            ];
            for (const row of starterRows) {
              const rowRef = await addDoc(collection(db, 'ledger'), {
                ...row,
                updatedBy: firebaseUser.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              const total =
                row.fiveH * 50 + row.bulig * 100 + row.point5 * 150 + row.halfSack * 200 + row.oneSack * 400 + row.bal;
              await setDoc(doc(db, 'leaderboard', rowRef.id), {
                name: row.name,
                total,
                visibility: 'public',
                updatedAt: serverTimestamp()
              });
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          reportError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
      }
    };

    syncProfileAndBootstrap();
    return () => {
      cancelled = true;
    };
  }, [authReady, firebaseUser]);

  // 3. Real-time Firestore listeners for ALL verified users
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const unsubPosts = onSnapshot(
      query(collection(db, 'posts'), where('visibility', '==', 'public')),
      (snapshot) => {
        const list: Post[] = snapshot.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt as Timestamp | null;
          return {
            id: d.id,
            authorId: data.authorId || '',
            author: {
              name: data.authorName || 'Choy User',
              handle: data.authorHandle || '@choychat',
              avatar: data.authorAvatar || DEFAULT_AVATAR
            },
            content: data.content || '',
            mediaUrl: data.mediaUrl || undefined,
            mediaType: data.mediaType || 'text',
            timestamp: formatTimestamp(ts),
            createdAtMs: ts && typeof ts.toMillis === 'function' ? ts.toMillis() : Date.now(),
            category: data.category || 'feed'
          };
        });
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setPosts(list);
      },
      (err) => reportError(err, OperationType.LIST, 'posts')
    );

    const unsubMessages = onSnapshot(
      query(collection(db, 'messages'), where('visibility', '==', 'members')),
      (snapshot) => {
        const list: Message[] = snapshot.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt as Timestamp | null;
          return {
            id: d.id,
            senderId: data.senderId || '',
            sender: data.senderName || 'Member',
            receiver: data.roomId || 'VIP Group',
            text: data.text || '',
            mediaUrl: data.mediaUrl || undefined,
            mediaType: data.mediaType || 'text',
            time: formatTimestamp(ts),
            createdAtMs: ts && typeof ts.toMillis === 'function' ? ts.toMillis() : Date.now(),
            isMe: data.senderId === firebaseUser.uid,
            reactions: Array.isArray(data.reactions) ? data.reactions : []
          };
        });
        list.sort((a, b) => a.createdAtMs - b.createdAtMs);
        setCloudMessages(list);
      },
      (err) => reportError(err, OperationType.LIST, 'messages')
    );

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('visibility', '==', 'public')),
      (snapshot) => {
        const list: UserAccount[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.displayName || 'Choy Member',
            phone: d.id === firebaseUser.uid ? firebaseUser.email || 'Member' : 'Verified Member',
            avatar: data.photoURL || DEFAULT_AVATAR,
            status: data.status === 'approved' ? 'approved' : 'pending',
            loginDate: formatDateTime(data.updatedAt as Timestamp | null)
          };
        });
        setUsersList(list);
      },
      (err) => reportError(err, OperationType.LIST, 'users')
    );

    const unsubPrivate = onSnapshot(
      doc(db, 'users', firebaseUser.uid, 'private', 'info'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setBlockedUsers(Array.isArray(data.blockedUsers) ? data.blockedUsers : []);
        }
      },
      (err) => reportError(err, OperationType.GET, `users/${firebaseUser.uid}/private/info`)
    );

    const unsubKnowledge = onSnapshot(
      query(collection(db, 'knowledge'), where('visibility', '==', 'public')),
      (snapshot) => {
        const list: KnowledgeQA[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            question: data.question || '',
            answer: data.answer || ''
          };
        });
        setKnowledgeBase(list);
      },
      (err) => reportError(err, OperationType.LIST, 'knowledge')
    );

    const unsubLeaderboard = onSnapshot(
      query(collection(db, 'leaderboard'), where('visibility', '==', 'public')),
      (snapshot) => {
        const list: LeaderboardItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Member',
            total: typeof data.total === 'number' ? data.total : 0
          };
        });
        list.sort((a, b) => b.total - a.total);
        setLeaderboard(list);
      },
      (err) => reportError(err, OperationType.LIST, 'leaderboard')
    );

    return () => {
      unsubPosts();
      unsubMessages();
      unsubUsers();
      unsubPrivate();
      unsubKnowledge();
      unsubLeaderboard();
    };
  }, [authReady, firebaseUser]);

  // 4. Real-time Firestore listeners for ADMIN ONLY (Ledger & Settings)
  useEffect(() => {
    if (!authReady || !firebaseUser || !isAdmin) return;

    const unsubLedger = onSnapshot(
      collection(db, 'ledger'),
      (snapshot) => {
        const list: LedgerRow[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Unnamed',
            fiveH: Number(data.fiveH) || 0,
            fiveHType: data.fiveHType === 'red' ? 'red' : 'blue',
            bulig: Number(data.bulig) || 0,
            point5: Number(data.point5) || 0,
            halfSack: Number(data.halfSack) || 0,
            oneSack: Number(data.oneSack) || 0,
            bal: Number(data.bal) || 0
          };
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setLedgerRows(list);
      },
      (err) => reportError(err, OperationType.LIST, 'ledger')
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'prices'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUnitPrices({
            fiveH: Number(data.fiveH) || 0,
            bulig: Number(data.bulig) || 0,
            point5: Number(data.point5) || 0,
            halfSack: Number(data.halfSack) || 0,
            oneSack: Number(data.oneSack) || 0
          });
          setDefaultQuantities({
            fiveH: Number(data.defFiveH) || 0,
            bulig: Number(data.defBulig) || 0,
            point5: Number(data.defPoint5) || 0,
            halfSack: Number(data.defHalfSack) || 0,
            oneSack: Number(data.defOneSack) || 0
          });
        }
      },
      (err) => reportError(err, OperationType.GET, 'settings/prices')
    );

    return () => {
      unsubLedger();
      unsubSettings();
    };
  }, [authReady, firebaseUser, isAdmin]);

  // Combine cloud messages with any local-device media uploads
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

  const handleGoogleSignIn = async () => {
    setLoginError('');
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setActiveTab('feed');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      if (msg.includes('auth/unauthorized-domain')) {
        setLoginError(
          'Domain not yet authorized in Firebase Auth. Add this website domain in Firebase Console -> Authentication -> Settings -> Authorized domains.'
        );
      } else if (msg.includes('popup-closed-by-user')) {
        setLoginError('Sign-in popup was closed. Please try again.');
      } else {
        setLoginError(msg);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('feed');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleToggleBlockUser = async (targetName: string) => {
    if (!firebaseUser) return;
    const trimmed = targetName.slice(0, 80);
    const isBlocked = blockedUsers.includes(trimmed);
    const next = isBlocked
      ? blockedUsers.filter((n) => n !== trimmed)
      : [...blockedUsers, trimmed].slice(0, 100);
    setBlockedUsers(next);
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid, 'private', 'info'), {
        blockedUsers: next,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      reportError(err, OperationType.UPDATE, `users/${firebaseUser.uid}/private/info`);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !newPostText.trim()) return;
    const trimmedMedia = newPostMedia.trim();
    const safeMediaUrl = trimmedMedia && trimmedMedia.length <= 1000 ? trimmedMedia : '';
    const payload: Record<string, unknown> = {
      authorId: firebaseUser.uid,
      authorName: profile.name.slice(0, 80),
      authorHandle: profile.handle.slice(0, 80),
      authorAvatar: (profile.avatar || DEFAULT_AVATAR).slice(0, 500),
      content: newPostText.trim().slice(0, 2000),
      mediaType: safeMediaUrl ? newPostType : 'text',
      category: newPostCategory,
      visibility: 'public',
      createdAt: serverTimestamp()
    };
    if (safeMediaUrl) payload.mediaUrl = safeMediaUrl;
    try {
      await addDoc(collection(db, 'posts'), payload);
      setNewPostText('');
      setNewPostMedia('');
    } catch (err) {
      reportError(err, OperationType.CREATE, 'posts');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      reportError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleMsgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
      ? 'video'
      : file.type.startsWith('audio/')
      ? 'audio'
      : 'file';
    setMsgMediaType(type);
    setMsgMediaUrl(url);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || (!msgInput.trim() && !msgMediaUrl)) return;

    const isLocalBlob =
      Boolean(msgMediaUrl) &&
      (msgMediaUrl.startsWith('blob:') || msgMediaUrl.startsWith('data:') || msgMediaUrl.length > 1000);

    if (isLocalBlob) {
      // Keep local file playback & photo editor working seamlessly on current device
      const localMsg: Message = {
        id: 'local_' + Date.now(),
        senderId: firebaseUser.uid,
        sender: profile.name,
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
      showNotice('Local file sent on this device. Use the Link button (URL) to sync videos/images across all devices.');
      setMsgInput('');
      setMsgMediaUrl('');
      setMsgMediaType('text');
      return;
    }

    const payload: Record<string, unknown> = {
      senderId: firebaseUser.uid,
      senderName: profile.name.slice(0, 80),
      roomId: activeChat,
      text: msgInput.trim().slice(0, 2000),
      mediaType: msgMediaUrl ? msgMediaType : 'text',
      reactions: [],
      visibility: 'members',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (msgMediaUrl) {
      payload.mediaUrl = msgMediaUrl.slice(0, 1000);
    }

    try {
      await addDoc(collection(db, 'messages'), payload);
      setMsgInput('');
      setMsgMediaUrl('');
      setMsgMediaType('text');
    } catch (err) {
      reportError(err, OperationType.CREATE, 'messages');
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
      await updateDoc(doc(db, 'messages', msg.id), {
        reactions: [...currentReactions, emoji],
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      reportError(err, OperationType.UPDATE, `messages/${msg.id}`);
    }
  };

  const syncLeaderboardRow = async (row: LedgerRow, prices = unitPrices) => {
    const total = clampNumber(calculateRowTotalWithPrices(row, prices), -100000000, 100000000);
    await setDoc(doc(db, 'leaderboard', row.id), {
      name: row.name.slice(0, 100),
      total,
      visibility: 'public',
      updatedAt: serverTimestamp()
    });
  };

  const handleAddLedgerRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !isAdmin || !newLedgerName.trim()) return;
    const safeName = newLedgerName.trim().slice(0, 100);
    const newRowData: Omit<LedgerRow, 'id'> = {
      name: safeName,
      fiveH: clampNumber(defaultQuantities.fiveH, -1000000, 1000000),
      fiveHType: 'blue',
      bulig: clampNumber(defaultQuantities.bulig, -1000000, 1000000),
      point5: clampNumber(defaultQuantities.point5, -1000000, 1000000),
      halfSack: clampNumber(defaultQuantities.halfSack, -1000000, 1000000),
      oneSack: clampNumber(defaultQuantities.oneSack, -1000000, 1000000),
      bal: 0
    };
    try {
      const ref = await addDoc(collection(db, 'ledger'), {
        ...newRowData,
        updatedBy: firebaseUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await syncLeaderboardRow({ id: ref.id, ...newRowData });
      setNewLedgerName('');
    } catch (err) {
      reportError(err, OperationType.CREATE, 'ledger');
    }
  };

  const handleUpdateLedgerField = async (
    row: LedgerRow,
    patch: Partial<Omit<LedgerRow, 'id' | 'name'>>
  ) => {
    if (!firebaseUser || !isAdmin) return;
    const updatedRow: LedgerRow = {
      ...row,
      fiveH: clampNumber(patch.fiveH ?? row.fiveH, -1000000, 1000000),
      fiveHType: patch.fiveHType ?? row.fiveHType,
      bulig: clampNumber(patch.bulig ?? row.bulig, -1000000, 1000000),
      point5: clampNumber(patch.point5 ?? row.point5, -1000000, 1000000),
      halfSack: clampNumber(patch.halfSack ?? row.halfSack, -1000000, 1000000),
      oneSack: clampNumber(patch.oneSack ?? row.oneSack, -1000000, 1000000),
      bal: clampNumber(patch.bal ?? row.bal, -100000000, 100000000)
    };
    setLedgerRows((prev) => prev.map((r) => (r.id === row.id ? updatedRow : r)));
    try {
      await updateDoc(doc(db, 'ledger', row.id), {
        fiveH: updatedRow.fiveH,
        fiveHType: updatedRow.fiveHType,
        bulig: updatedRow.bulig,
        point5: updatedRow.point5,
        halfSack: updatedRow.halfSack,
        oneSack: updatedRow.oneSack,
        bal: updatedRow.bal,
        updatedBy: firebaseUser.uid,
        updatedAt: serverTimestamp()
      });
      await syncLeaderboardRow(updatedRow);
    } catch (err) {
      reportError(err, OperationType.UPDATE, `ledger/${row.id}`);
    }
  };

  const handleDeleteLedgerRow = async (rowId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'ledger', rowId));
      await deleteDoc(doc(db, 'leaderboard', rowId));
    } catch (err) {
      reportError(err, OperationType.DELETE, `ledger/${rowId}`);
    }
  };

  const handleSaveUnitPrices = async () => {
    if (!firebaseUser || !isAdmin) return;
    const cleanPrices = {
      fiveH: clampNumber(unitPrices.fiveH, 0, 1000000),
      bulig: clampNumber(unitPrices.bulig, 0, 1000000),
      point5: clampNumber(unitPrices.point5, 0, 1000000),
      halfSack: clampNumber(unitPrices.halfSack, 0, 1000000),
      oneSack: clampNumber(unitPrices.oneSack, 0, 1000000)
    };
    const cleanDefs = {
      fiveH: clampNumber(defaultQuantities.fiveH, 0, 1000000),
      bulig: clampNumber(defaultQuantities.bulig, 0, 1000000),
      point5: clampNumber(defaultQuantities.point5, 0, 1000000),
      halfSack: clampNumber(defaultQuantities.halfSack, 0, 1000000),
      oneSack: clampNumber(defaultQuantities.oneSack, 0, 1000000)
    };
    try {
      await setDoc(doc(db, 'settings', 'prices'), {
        fiveH: cleanPrices.fiveH,
        bulig: cleanPrices.bulig,
        point5: cleanPrices.point5,
        halfSack: cleanPrices.halfSack,
        oneSack: cleanPrices.oneSack,
        defFiveH: cleanDefs.fiveH,
        defBulig: cleanDefs.bulig,
        defPoint5: cleanDefs.point5,
        defHalfSack: cleanDefs.halfSack,
        defOneSack: cleanDefs.oneSack,
        updatedBy: firebaseUser.uid,
        updatedAt: serverTimestamp()
      });
      await Promise.all(ledgerRows.map((row) => syncLeaderboardRow(row, cleanPrices)));
      setPricesSavedMsg(true);
      setTimeout(() => setPricesSavedMsg(false), 2500);
    } catch (err) {
      reportError(err, OperationType.WRITE, 'settings/prices');
    }
  };

  const handleSaveDefaultQuantities = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !isAdmin) return;
    const cleanDefs = {
      fiveH: clampNumber(defaultQuantities.fiveH, 0, 1000000),
      bulig: clampNumber(defaultQuantities.bulig, 0, 1000000),
      point5: clampNumber(defaultQuantities.point5, 0, 1000000),
      halfSack: clampNumber(defaultQuantities.halfSack, 0, 1000000),
      oneSack: clampNumber(defaultQuantities.oneSack, 0, 1000000)
    };
    try {
      await setDoc(doc(db, 'settings', 'prices'), {
        fiveH: clampNumber(unitPrices.fiveH, 0, 1000000),
        bulig: clampNumber(unitPrices.bulig, 0, 1000000),
        point5: clampNumber(unitPrices.point5, 0, 1000000),
        halfSack: clampNumber(unitPrices.halfSack, 0, 1000000),
        oneSack: clampNumber(unitPrices.oneSack, 0, 1000000),
        defFiveH: cleanDefs.fiveH,
        defBulig: cleanDefs.bulig,
        defPoint5: cleanDefs.point5,
        defHalfSack: cleanDefs.halfSack,
        defOneSack: cleanDefs.oneSack,
        updatedBy: firebaseUser.uid,
        updatedAt: serverTimestamp()
      });
      await Promise.all(
        ledgerRows.map(async (row) => {
          const updatedRow: LedgerRow = {
            ...row,
            fiveH: cleanDefs.fiveH,
            bulig: cleanDefs.bulig,
            point5: cleanDefs.point5,
            halfSack: cleanDefs.halfSack,
            oneSack: cleanDefs.oneSack
          };
          await updateDoc(doc(db, 'ledger', row.id), {
            fiveH: updatedRow.fiveH,
            bulig: updatedRow.bulig,
            point5: updatedRow.point5,
            halfSack: updatedRow.halfSack,
            oneSack: updatedRow.oneSack,
            updatedBy: firebaseUser.uid,
            updatedAt: serverTimestamp()
          });
          await syncLeaderboardRow(updatedRow);
        })
      );
      setQtySavedMsg(true);
      setTimeout(() => setQtySavedMsg(false), 2500);
    } catch (err) {
      reportError(err, OperationType.WRITE, 'ledger');
    }
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !isAdmin || !newQ.trim() || !newA.trim()) return;
    try {
      await addDoc(collection(db, 'knowledge'), {
        question: newQ.trim().slice(0, 300),
        answer: newA.trim().slice(0, 2000),
        visibility: 'public',
        createdBy: firebaseUser.uid,
        createdAt: serverTimestamp()
      });
      setNewQ('');
      setNewA('');
    } catch (err) {
      reportError(err, OperationType.CREATE, 'knowledge');
    }
  };

  const handleDeleteKnowledge = async (qaId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'knowledge', qaId));
    } catch (err) {
      reportError(err, OperationType.DELETE, `knowledge/${qaId}`);
    }
  };

  const handleToggleUserStatus = async (userItem: UserAccount) => {
    if (!isAdmin) return;
    const nextStatus = userItem.status === 'approved' ? 'pending' : 'approved';
    try {
      await updateDoc(doc(db, 'users', userItem.id), {
        status: nextStatus,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      reportError(err, OperationType.UPDATE, `users/${userItem.id}`);
    }
  };

  const handleAddCloudUser = async (name: string) => {
    if (!isAdmin) return;
    const newUid = `member_${Date.now()}`;
    try {
      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        displayName: name.slice(0, 80),
        status: 'approved',
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      reportError(err, OperationType.CREATE, `users/${newUid}`);
    }
  };

  const handleDeleteCloudUser = async (userId: string) => {
    if (!isAdmin || userId === firebaseUser?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      reportError(err, OperationType.DELETE, `users/${userId}`);
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

  // Loading state while checking Firebase Auth session
  if (!authReady) {
    return (
      <div className="fixed inset-0 bg-emerald-950 text-slate-100 flex flex-col items-center justify-center gap-3 p-4">
        <div className="w-12 h-12 rounded-xl overflow-hidden border border-emerald-400 shadow-lg">
          <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" /> Syncing Choy Chat...
        </div>
      </div>
    );
  }

  // Google Sign-In Gate (Cross-Device Cloud Sync)
  if (!firebaseUser) {
    return (
      <div className="fixed inset-0 bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-cover filter brightness-50" />
          <div className="absolute inset-0 bg-emerald-950/80"></div>
        </div>

        <div className="relative z-15 w-[95%] max-w-sm max-h-[90vh] overflow-y-auto bg-emerald-950/90 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-emerald-400 mx-auto shadow-lg">
              <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-black text-white tracking-wider uppercase">Choy Chat</h1>
            <p className="text-xs text-emerald-300 flex items-center justify-center gap-1.5">
              <Cloud className="w-3.5 h-3.5" /> Real-time sync across all devices
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-400/40 text-red-200 text-xs text-center leading-relaxed">
              {loginError}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full py-3.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2.5 transition disabled:opacity-60"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.24-.92 2.29-1.97 3l3.18 2.47c1.86-1.71 2.93-4.24 2.93-7.24 0-.42-.04-.82-.23-1.21z"
                    />
                    <path
                      fill="currentColor"
                      d="M12.17 22c2.65 0 4.88-.88 6.51-2.38l-3.18-2.47c-.88.59-2 .94-3.33.94-2.56 0-4.73-1.73-5.51-4.05H3.38v2.55C5 19.83 8.33 22 12.17 22z"
                    />
                    <path
                      fill="currentColor"
                      d="M6.66 14.04a5.96 5.96 0 0 1 0-3.82V7.67H3.38a9.98 9.98 0 0 0 0 8.92l3.28-2.55z"
                    />
                    <path
                      fill="currentColor"
                      d="M12.17 6.17c1.44 0 2.74.5 3.76 1.47l2.82-2.82C17.04 3.22 14.82 2.26 12.17 2.26 8.33 2.26 5 4.43 3.38 7.67l3.28 2.55c.78-2.32 2.95-4.05 5.51-4.05z"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-emerald-200/80 leading-relaxed">
              Gamita imong Google account sa tanan nimong device para automatic ma-sync ang chats, posts, ledger, ug settings.
            </p>
          </div>

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

      {/* SIDEBAR */}
      <aside className="w-full md:w-60 bg-emerald-900/90 border-r border-emerald-800 p-3 flex flex-row md:flex-col justify-between shrink-0 overflow-x-auto md:overflow-y-auto">
        <div className="flex md:flex-col items-center md:items-stretch gap-1.5 w-full">
          <div className="hidden md:flex items-center gap-2 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-emerald-400">
              <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">Choy Chat</div>
              <div className="text-[10px] text-emerald-300 flex items-center gap-1">
                <Cloud className="w-3 h-3" /> Cloud Synced
              </div>
            </div>
          </div>

          <nav className="flex md:flex-col gap-1 w-full text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 ${
                activeTab === 'feed' ? 'bg-emerald-400 text-slate-950 font-bold' : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Newsfeed</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('people')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 ${
                activeTab === 'people'
                  ? 'bg-emerald-400 text-slate-950 font-bold'
                  : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">People</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('videos')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 ${
                activeTab === 'videos'
                  ? 'bg-emerald-400 text-slate-950 font-bold'
                  : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <Video className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Videos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 ${
                activeTab === 'messages'
                  ? 'bg-emerald-400 text-slate-950 font-bold'
                  : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Messages</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className={`px-3 py-2 rounded-xl flex items-center gap-2 ${
                  activeTab === 'ledger'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'text-emerald-100 hover:bg-emerald-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Milestone</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 ${
                activeTab === 'analytics'
                  ? 'bg-emerald-400 text-slate-950 font-bold'
                  : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('choyai')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 ${
                activeTab === 'choyai' ? 'bg-cyan-400 text-slate-950 font-bold' : 'text-cyan-200 hover:bg-emerald-800'
              }`}
            >
              <img
                src={DEFAULT_AVATAR}
                alt=""
                className="w-4 h-4 rounded object-cover shrink-0 border border-cyan-300"
              />
              <span className="hidden md:inline">Choy AI</span>
            </button>

            {isAdmin && (
              <>
                <div className="pt-2 pb-1 text-[10px] font-bold uppercase text-indigo-300 hidden md:block px-2">
                  Admin Panel
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('admin_approvals')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 ${
                    activeTab === 'admin_approvals'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-indigo-200 hover:bg-emerald-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">User Approvals & Logs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admin_knowledge')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 ${
                    activeTab === 'admin_knowledge'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-indigo-200 hover:bg-emerald-800'
                  }`}
                >
                  <Database className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">Choy AI Brain Q&A</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admin_prices')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 ${
                    activeTab === 'admin_prices'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-indigo-200 hover:bg-emerald-800'
                  }`}
                >
                  <Sliders className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">Unit Prices Setup</span>
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
            <img src={profile.avatar} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-white truncate">{profile.name}</div>
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
        {/* TOP BAR */}
        <header className="flex flex-col px-4 py-3 border-b border-emerald-800 bg-emerald-900/50 shrink-0 gap-2.5">
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2 min-w-8">
              <PWAInstallButton compact />
            </div>
            <div className="text-center">
              <h1 className="text-lg md:text-xl font-black text-white tracking-widest uppercase">CHOY CHAT</h1>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleShareApp}
                className="p-2 bg-emerald-900 border border-emerald-700 rounded-lg text-emerald-200 hover:text-white shrink-0"
                title={shareCopied ? 'Link Copied!' : 'Share'}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="md:hidden p-2 bg-emerald-900 border border-emerald-700 rounded-lg text-red-300 hover:text-white shrink-0"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative w-full max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-300" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-emerald-950 border border-emerald-700 rounded-xl text-xs text-white placeholder-emerald-400 focus:outline-none focus:border-emerald-400 shadow-inner"
            />
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

        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0">
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

                <form onSubmit={handleCreatePost} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Share an update across all devices..."
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    className="w-full p-2.5 bg-emerald-950 border border-emerald-700 rounded-xl text-xs text-white focus:outline-none resize-none"
                  ></textarea>

                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={newPostType}
                        onChange={(e) => setNewPostType(e.target.value as 'text' | 'image' | 'video')}
                        className="p-1 bg-emerald-950 border border-emerald-700 rounded-lg text-xs text-emerald-200"
                      >
                        <option value="image">Picture</option>
                        <option value="video">Video</option>
                        <option value="text">Text Only</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Image or Video URL..."
                        value={newPostMedia}
                        onChange={(e) => setNewPostMedia(e.target.value)}
                        className="p-1.5 bg-emerald-950 border border-emerald-700 rounded-lg text-xs text-white w-48"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
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
                            <img src={p.author.avatar} alt="" className="w-8 h-8 rounded-lg object-cover" />
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
                        {(p.authorId === firebaseUser.uid || isAdmin) && (
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
                      <p className="text-xs text-slate-100 break-words">{p.content}</p>
                      {p.mediaUrl && p.mediaType === 'image' && (
                        <img src={p.mediaUrl} alt="" className="rounded-xl max-h-72 w-full object-cover" />
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
              {usersList.length === 0 ? (
                <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-6 text-center text-xs text-emerald-300">
                  Loading synced community members...
                </div>
              ) : (
                usersList.map((u) => {
                  const isMe = u.id === firebaseUser.uid;
                  const isBlocked = blockedUsers.includes(u.name);
                  return (
                    <div
                      key={u.id}
                      className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={u.avatar || DEFAULT_AVATAR}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover"
                          />
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
                              isBlocked
                                ? 'bg-red-500 text-white'
                                : 'bg-red-950 text-red-300 border border-red-700'
                            }`}
                          >
                            {isBlocked ? 'Blocked' : 'Block User'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfile({ ...profile, isFriend: !profile.isFriend })}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                              profile.isFriend ? 'bg-slate-800 text-slate-300' : 'bg-emerald-400 text-slate-950'
                            }`}
                          >
                            {profile.isFriend ? 'Friends' : 'Add Friend'}
                          </button>
                        </div>
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

          {/* PROFILE */}
          {activeTab === 'profile' && (
            <div className="max-w-xl mx-auto bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={profile.avatar}
                    alt=""
                    className="w-16 h-16 rounded-2xl object-cover border border-emerald-400"
                  />
                  <span
                    className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-emerald-950 rounded-full"
                    title="Online"
                  ></span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{profile.name}</div>
                  <div className="text-xs text-emerald-300 truncate">{profile.handle}</div>
                  <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-200">
                    <Cloud className="w-3 h-3" /> {isAdmin ? 'Admin Cloud Sync Active' : 'Cloud Sync Active'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MESSAGES WITH REAL-TIME CLOUD SYNC & REACTIONS */}
          {activeTab === 'messages' && (
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:h-[560px]">
              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-3 flex flex-col space-y-2">
                <div className="text-xs font-bold text-emerald-300 uppercase mb-1">Chats</div>
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
                  {CHAT_ROOMS.map((room) => {
                    const isActive = activeChat === room;
                    return (
                      <button
                        key={room}
                        type="button"
                        onClick={() => setActiveChat(room)}
                        className={`px-3 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition whitespace-nowrap shrink-0 md:w-full text-left ${
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

              <div className="md:col-span-2 bg-emerald-900/60 border border-emerald-700/50 rounded-2xl flex flex-col overflow-hidden min-h-[380px]">
                {/* Responsive Chat Header */}
                <div className="p-3 border-b border-emerald-800 space-y-2 text-xs font-bold text-white">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-black text-white truncate">{activeChat}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const targetUser = activeChat === 'VIP Group' ? 'Admin' : activeChat;
                          handleToggleBlockUser(targetUser);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 ${
                          blockedUsers.includes(activeChat === 'VIP Group' ? 'Admin' : activeChat)
                            ? 'bg-red-500 text-white'
                            : 'bg-red-950 text-red-300 border border-red-700'
                        }`}
                        title="Block / Unblock User"
                      >
                        {blockedUsers.includes(activeChat === 'VIP Group' ? 'Admin' : activeChat) ? 'Unblock' : 'Block'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGalleryScope('chat');
                          setGalleryFilter('video');
                          setSelectedGalleryVideo(null);
                          setIsMediaGalleryOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 rounded-lg flex items-center gap-1 shadow shrink-0 hover:bg-cyan-400 hover:text-slate-950 text-[11px] transition"
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
                        className="px-2.5 py-1.5 bg-emerald-900 border border-emerald-700 text-emerald-200 rounded-lg flex items-center gap-1 shadow shrink-0 hover:text-white text-[11px]"
                        title="Shared Media Gallery"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Gallery
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsInVideoCall(true)}
                        className="px-2.5 py-1.5 bg-emerald-400 text-slate-950 rounded-lg flex items-center gap-1 shadow shrink-0 text-[11px]"
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

                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[220px] max-h-[45vh] md:max-h-none">
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
                            <img src={m.mediaUrl} alt="" className="max-h-40 rounded" />
                          )}
                          {m.mediaType === 'video' && m.mediaUrl && <ChatVideoPlayer src={m.mediaUrl} compact />}
                          {m.mediaType === 'audio' && m.mediaUrl && (
                            <audio src={m.mediaUrl} controls className="w-full h-8" />
                          )}
                          {m.mediaType === 'file' && (
                            <div className="text-amber-300 text-[10px]">📎 File Attachment</div>
                          )}
                          {m.text && <div className="break-words">{m.text}</div>}

                          {/* Display Reactions */}
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

                        {/* Reaction Buttons Toolbar */}
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

                  {msgMediaUrl && msgMediaType !== 'image' && (
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

                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
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
                      placeholder={`Message ${activeChat}...`}
                      value={msgInput}
                      onChange={(e) => setMsgInput(e.target.value)}
                      className="flex-1 min-w-0 p-2.5 bg-emerald-900 border border-emerald-700 rounded-xl text-xs text-white placeholder-emerald-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow hover:bg-emerald-300 transition shrink-0"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* MILESTONE SPREADSHEET LEDGER (ADMIN ONLY, REAL-TIME CLOUD SYNCED) */}
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

              {/* Spreadsheet Table */}
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
                <h3 className="text-sm font-bold text-white">User Accounts Approval & Cloud Sync Monitor</h3>
                <div className="space-y-2">
                  {usersList.map((u) => (
                    <div
                      key={u.id}
                      className="p-3 bg-emerald-950 border border-emerald-800 rounded-xl flex items-center justify-between text-xs gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{u.name}</div>
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
                <h3 className="text-sm font-bold text-white">Choy AI Brain Knowledge Box (Cloud Synced Q & A)</h3>
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
                <h3 className="text-sm font-bold text-white">Set Unit Prices (Cloud Synced)</h3>
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
                    {pricesSavedMsg ? 'Unit Prices Synced to Cloud!' : 'Save Unit Prices'}
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
              onAddUser={(name) => handleAddCloudUser(name)}
              onToggleUserStatus={handleToggleUserStatus}
              onDeleteUser={handleDeleteCloudUser}
              isCloudSynced
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
      <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40">
        {!isChoyAIPopupOpen && (
          <button
            type="button"
            onClick={() => setIsChoyAIPopupOpen(true)}
            className="w-12 h-12 md:w-14 md:h-14 bg-emerald-950 border-2 border-cyan-400 rounded-full shadow-2xl flex items-center justify-center font-bold hover:scale-105 overflow-hidden transition"
            title="Ask Choy AI"
          >
            <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
          </button>
        )}

        {isChoyAIPopupOpen && (
          <div className="w-80 h-96 bg-emerald-950 border border-cyan-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 bg-emerald-900 border-b border-cyan-500/40 text-cyan-200 font-bold text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={DEFAULT_AVATAR}
                  alt=""
                  className="w-5 h-5 rounded object-cover border border-cyan-400"
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

      <OfflineIndicator />
    </div>
  );
}
