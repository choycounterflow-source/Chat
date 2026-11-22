/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Home, 
  MessageSquare, 
  Video, 
  Users, 
  Share2, 
  Download, 
  Send, 
  Heart, 
  Trash2, 
  Award, 
  FileSpreadsheet, 
  User as UserIcon, 
  LogOut, 
  BarChart3,
  Bot,
  Plus,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Smile,
  ShieldCheck,
  Key,
  Sliders,
  Database,
  Search,
  PhoneCall,
  Camera,
  VideoOff,
  PhoneOff,
  ThumbsUp,
  Edit3,
  Sparkles
} from 'lucide-react';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SecurityStudio } from './components/SecurityStudio';
import { ChatVideoPlayer } from './components/ChatVideoPlayer';

interface UserAccount {
  id: string;
  name: string;
  phone: string;
  status: 'pending' | 'approved';
  loginDate: string;
}

interface Post {
  id: string;
  author: { name: string; handle: string; avatar: string; };
  content: string;
  mediaUrl?: string;
  mediaType?: 'text' | 'image' | 'video';
  timestamp: string;
  category: 'feed' | 'myday' | 'video';
}

interface Message {
  id: string;
  sender: string;
  receiver: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'text' | 'image' | 'video' | 'audio' | 'file';
  time: string;
  isMe?: boolean;
  reactions?: string[];
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

interface KnowledgeQA {
  id: string;
  question: string;
  answer: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(localStorage.getItem('choychat_loggedin') === 'true');
  const [loginPhone, setLoginPhone] = useState('09361223978');
  const [loginPin, setLoginPin] = useState('051690');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'feed' | 'profile' | 'messages' | 'ledger' | 'analytics' | 'admin_approvals' | 'admin_knowledge' | 'admin_prices' | 'admin_security' | 'choyai' | 'people' | 'videos'>('feed');
  const [searchQuery, setSearchQuery] = useState('');

  // Video Call Modal State
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const [usersList, setUsersList] = useState<UserAccount[]>([
    { id: 'u1', name: 'Choy Admin', phone: '09361223978', status: 'approved', loginDate: '2026-11-21 07:00' },
    { id: 'u2', name: 'Maria Santos', phone: '09123456789', status: 'pending', loginDate: '2026-11-21 07:05' }
  ]);

  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeQA[]>([
    { id: 'k1', question: 'What is Choy Chat?', answer: 'Choy Chat is a secure social media, entertainment, and milestone ledger platform.' },
    { id: 'k2', question: 'How does the ledger work?', answer: 'The ledger tracks quantities for 5H, Bulig, Point 5, Half sack, and One sack with automatic calculations.' }
  ]);
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

  const handleSaveDefaultQuantities = (e: React.FormEvent) => {
    e.preventDefault();
    setLedgerRows(ledgerRows.map(row => ({
      ...row,
      fiveH: defaultQuantities.fiveH,
      bulig: defaultQuantities.bulig,
      point5: defaultQuantities.point5,
      halfSack: defaultQuantities.halfSack,
      oneSack: defaultQuantities.oneSack
    })));
    setQtySavedMsg(true);
    setTimeout(() => setQtySavedMsg(false), 2500);
  };

  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatMessages, setAiChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'ai', text: 'Hello! I am Choy AI. I am synchronized with all app knowledge. Ask me anything in any language!' }
  ]);

  const [profile, setProfile] = useState({
    name: 'Choy Master',
    handle: '@09361223978',
    avatar: '/assets/aistudio/image_20261121_145253_f477cbfa.webp',
    isFriend: false
  });

  const [posts, setPosts] = useState<Post[]>([
    {
      id: 'p1',
      author: { name: 'Choy Chat Official', handle: '@choychat', avatar: '/assets/aistudio/image_20261121_145253_f477cbfa.webp' },
      content: 'Welcome to Choy Chat public newsfeed with image and video support.',
      mediaUrl: '/assets/aistudio/image_20261121_145253_f477cbfa.webp',
      mediaType: 'image',
      timestamp: '1h ago',
      category: 'feed'
    }
  ]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostMedia, setNewPostMedia] = useState('');
  const [newPostType, setNewPostType] = useState<'text' | 'image' | 'video'>('image');
  const [newPostCategory, setNewPostCategory] = useState<'feed' | 'myday' | 'video'>('feed');

  const chatRooms = ['VIP Group', 'Choy Admin', 'Maria Santos'];
  const [activeChat, setActiveChat] = useState<string>('VIP Group');
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [galleryScope, setGalleryScope] = useState<'chat' | 'all'>('chat');
  const [selectedGalleryVideo, setSelectedGalleryVideo] = useState<Message | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'm1', sender: 'Admin', receiver: 'VIP Group', text: 'Welcome to group chat.', time: '10:00 AM', mediaType: 'text', reactions: ['❤️', '👍'] },
    { id: 'm1_vid', sender: 'Admin', receiver: 'VIP Group', text: 'Shared group video clip (tap Play with Sound).', mediaType: 'video', mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', time: '10:02 AM', reactions: ['🔥'] },
    { id: 'm2', sender: 'Choy Admin', receiver: 'Choy Admin', text: 'Direct chat with Choy Admin is ready.', time: '10:05 AM', mediaType: 'text', reactions: ['👍'] },
    { id: 'm3', sender: 'Maria Santos', receiver: 'Maria Santos', text: 'Hi! Kumusta na?', time: '10:12 AM', mediaType: 'text', reactions: ['❤️'] }
  ]);
  const [msgInput, setMsgInput] = useState('');
  const [msgMediaType, setMsgMediaType] = useState<'text' | 'image' | 'video' | 'audio' | 'file'>('text');
  const [msgMediaUrl, setMsgMediaUrl] = useState('');
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const msgFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleMsgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('image/') ? 'image' :
                 file.type.startsWith('video/') ? 'video' :
                 file.type.startsWith('audio/') ? 'audio' : 'file';
    setMsgMediaType(type);
    setMsgMediaUrl(url);
  };

  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#10b981');
  const [drawWidth, setDrawWidth] = useState(4);

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
    const imgData = ctx.getImageData((canvas.width - size)/2, (canvas.height - size)/2, size, size);
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
      const avg = (d[i] + d[i+1] + d[i+2]) / 3;
      d[i] = avg;
      d[i+1] = avg;
      d[i+2] = avg;
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

  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([
    { id: 'l1', name: 'Choy Admin', fiveH: 5, fiveHType: 'blue', bulig: 3, point5: 2, halfSack: 4, oneSack: 2, bal: 500 },
    { id: 'l2', name: 'Maria Vibe', fiveH: 4, fiveHType: 'red', bulig: 5, point5: 3, halfSack: 2, oneSack: 3, bal: -200 }
  ]);

  const isAdmin = loginPhone === '09361223978';
  const [isChoyAIPopupOpen, setIsChoyAIPopupOpen] = useState(false);

  const [shareCopied, setShareCopied] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPhone.trim() === '09361223978' && loginPin.trim() === '051690') {
      setIsLoggedIn(true);
      localStorage.setItem('choychat_loggedin', 'true');
      setLoginError('');
      setActiveTab('feed');
    } else {
      setLoginError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('choychat_loggedin');
  };

  const handleShareApp = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Choy Chat', url: window.location.href }); } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const handleDownloadLedgerCSV = () => {
    const headers = ['Name', '5H Qty', '5H Type', 'Bulig', 'Point 5', 'Half Sack', 'One Sack', 'Balance', 'Total'];
    const rows = ledgerRows.map(r => [
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
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `choychat_ledger_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addReactionToMessage = (msgId: string, emoji: string) => {
    setMessages(messages.map(m => {
      if (m.id === msgId) {
        const currentReactions = m.reactions || [];
        return { ...m, reactions: [...currentReactions, emoji] };
      }
      return m;
    }));
  };

  const calculateRowTotal = (row: LedgerRow) => {
    return (row.fiveH * unitPrices.fiveH) +
           (row.bulig * unitPrices.bulig) +
           (row.point5 * unitPrices.point5) +
           (row.halfSack * unitPrices.halfSack) +
           (row.oneSack * unitPrices.oneSack) +
           row.bal;
  };

  const totalBlue = ledgerRows
    .filter(r => r.fiveHType === 'blue')
    .reduce((sum, r) => sum + calculateRowTotal(r), 0);

  const totalRed = ledgerRows
    .filter(r => r.fiveHType === 'red')
    .reduce((sum, r) => sum + Math.abs(calculateRowTotal(r)), 0);

  const sortedLeaderboard = [...ledgerRows].sort((a, b) => calculateRowTotal(b) - calculateRowTotal(a));
  const filteredPosts = posts
    .filter(p => !blockedUsers.includes(p.author.name))
    .filter(p => p.content.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/assets/aistudio/image_20261121_145253_f477cbfa.webp" alt="" className="w-full h-full object-cover filter brightness-50" />
          <div className="absolute inset-0 bg-emerald-950/80"></div>
        </div>

        <div className="relative z-15 w-[95%] max-w-sm max-h-[90vh] overflow-y-auto bg-emerald-950/90 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-emerald-400 mx-auto">
              <img src="/assets/aistudio/image_20261121_145253_f477cbfa.webp" alt="" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-bold text-white">Choy Chat</h1>
          </div>

          {loginError && <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 text-xs text-center">{loginError}</div>}

          <form onSubmit={handleLogin} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1">Phone</label>
              <input
                type="text"
                required
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">PIN</label>
              <input
                type="password"
                required
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
              />
            </div>
            <button type="submit" className="w-full py-3 bg-emerald-400 text-slate-950 font-bold rounded-xl shadow">
              Login
            </button>
          </form>

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
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`p-4 rounded-full ${isAudioMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'}`}
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsInVideoCall(false)}
              className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
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
              <button onClick={() => setIsPhotoEditorOpen(false)} className="text-slate-400 hover:text-white">✕</button>
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
      {isMediaGalleryOpen && (() => {
        const scopedMedia = messages.filter(m =>
          Boolean(m.mediaUrl) &&
          !blockedUsers.includes(m.sender) &&
          (galleryScope === 'all' || m.receiver === activeChat)
        );
        const counts = {
          all: scopedMedia.length,
          image: scopedMedia.filter(m => m.mediaType === 'image').length,
          video: scopedMedia.filter(m => m.mediaType === 'video').length,
          audio: scopedMedia.filter(m => m.mediaType === 'audio').length,
        };
        const filteredGallery = galleryFilter === 'all'
          ? scopedMedia
          : scopedMedia.filter(m => m.mediaType === galleryFilter);
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
                  {galleryFilter === 'video' ? 'Shared Videos' : 'Media Gallery'} ({galleryScope === 'all' ? 'All Chats' : activeChat})
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
                    <span>
                      {tab === 'all' ? `All (${counts.all})` : `${tab}s (${counts[tab]})`}
                    </span>
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

              <div className={`flex-1 overflow-y-auto grid gap-3 p-1 ${galleryFilter === 'video' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                {filteredGallery.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-emerald-400 text-xs">
                    No shared {galleryFilter === 'all' ? 'media' : galleryFilter} files in {galleryScope === 'all' ? 'any chat' : activeChat} yet.
                  </div>
                ) : (
                  filteredGallery.map(m => (
                    <div key={m.id} className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-2.5 space-y-2 flex flex-col justify-between">
                      {m.mediaType === 'image' && <img src={m.mediaUrl} alt="" className="w-full h-28 object-cover rounded-xl" />}
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
                      {m.mediaType === 'file' && <div className="text-amber-300 text-xs py-8 text-center">📎 Shared File</div>}
                      {m.mediaType !== 'video' && (
                        <div className="text-[10px] text-emerald-300 truncate w-full text-center">{m.sender} • {m.time}</div>
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
              <img src="/assets/aistudio/image_20261121_145253_f477cbfa.webp" alt="" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-bold text-white truncate">Choy Chat</span>
          </div>

          <nav className="flex md:flex-col gap-1 w-full text-xs font-medium">
            <button onClick={() => setActiveTab('feed')} className={`px-3 py-2 rounded-xl flex items-center gap-2 ${activeTab === 'feed' ? 'bg-emerald-400 text-slate-950 font-bold' : 'text-emerald-100 hover:bg-emerald-800'}`}>
              <Home className="w-4 h-4 shrink-0" /><span className="hidden md:inline">Newsfeed</span>
            </button>
            <button onClick={() => setActiveTab('people')} className={`px-3 py-2 rounded-xl flex items-center gap-2 ${activeTab === 'people' ? 'bg-emerald-400 text-slate-950 font-bold' : 'text-emerald-100 hover:bg-emerald-800'}`}>
              <Users className="w-4 h-4 shrink-0" /><span className="hidden md:inline">People</span>
            </button>
            <button onClick={() => setActiveTab('videos')} className={`px-3 py-2 rounded-xl flex items-center gap-2 ${activeTab === 'videos' ? 'bg-emerald-400 text-slate-950 font-bold' : 'text-emerald-100 hover:bg-emerald-800'}`}>
              <Video className="w-4 h-4 shrink-0" /><span className="hidden md:inline">Videos</span>
            </button>
            <button onClick={() => setActiveTab('messages')} className={`px-3 py-2 rounded-xl flex items-center gap-2 ${activeTab === 'messages' ? 'bg-emerald-400 text-slate-950 font-bold' : 'text-emerald-100 hover:bg-emerald-800'}`}>
              <MessageSquare className="w-4 h-4 shrink-0" /><span className="hidden md:inline">Messages</span>
            </button>
            {isAdmin && (
              <button onClick={() => setActiveTab('ledger')} className={`px-3 py-2 rounded-xl flex items-center gap-2 ${activeTab === 'ledger' ? 'bg-emerald-400 text-slate-950 font-bold' : 'text-emerald-100 hover:bg-emerald-800'}`}>
                <FileSpreadsheet className="w-4 h-4 shrink-0" /><span className="hidden md:inline">Milestone</span>
              </button>
            )}
            <button onClick={() => setActiveTab('analytics')} className={`px-3 py-2 rounded-xl flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-emerald-400 text-slate-950 font-bold' : 'text-emerald-100 hover:bg-emerald-800'}`}>
              <Award className="w-4 h-4 shrink-0" /><span className="hidden md:inline">Analytics</span>
            </button>
            <button onClick={() => setActiveTab('choyai')} className={`px-3 py-2 rounded-xl flex items-center gap-2 ${activeTab === 'choyai' ? 'bg-cyan-400 text-slate-950 font-bold' : 'text-cyan-200 hover:bg-emerald-800'}`}>
              <img src="/assets/aistudio/image_20261121_145253_f477cbfa.webp" alt="" className="w-4 h-4 rounded object-cover shrink-0 border border-cyan-300" /><span className="hidden md:inline">Choy AI</span>
            </button>

            {isAdmin && (
              <>
                <div className="pt-2 pb-1 text-[10px] font-bold uppercase text-indigo-300 hidden md:block px-2">Admin Panel</div>

                <button onClick={() => setActiveTab('admin_approvals')} className={`px-3 py-2 rounded-xl flex items-center gap-2 ${activeTab === 'admin_approvals' ? 'bg-indigo-600 text-white font-bold' : 'text-indigo-200 hover:bg-emerald-800'}`}>
                  <ShieldCheck className="w-4 h-4 shrink-0" /><span className="hidden md:inline">User Approvals & Logs</span>
                </button>
                <button onClick={() => setActiveTab('admin_knowledge')} className={`px-3 py-2 rounded-xl flex items-center gap-2 ${activeTab === 'admin_knowledge' ? 'bg-indigo-600 text-white font-bold' : 'text-indigo-200 hover:bg-emerald-800'}`}>
                  <Database className="w-4 h-4 shrink-0" /><span className="hidden md:inline">Choy AI Brain Q&A</span>
                </button>
                <button onClick={() => setActiveTab('admin_prices')} className={`px-3 py-2 rounded-xl flex items-center gap-2 ${activeTab === 'admin_prices' ? 'bg-indigo-600 text-white font-bold' : 'text-indigo-200 hover:bg-emerald-800'}`}>
                  <Sliders className="w-4 h-4 shrink-0" /><span className="hidden md:inline">Unit Prices Setup</span>
                </button>
                <button onClick={() => setActiveTab('admin_security')} className={`px-3 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 ${activeTab === 'admin_security' ? 'bg-indigo-600 text-white font-bold' : 'text-indigo-200 hover:bg-emerald-800'}`}>
                  <Key className="w-4 h-4 shrink-0" /><span>Security Studio</span>
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="hidden md:block pt-3 border-t border-emerald-800 space-y-2">
          <PWAInstallButton fullWidth />
          <button onClick={handleLogout} className="w-full px-3 py-2 rounded-xl bg-emerald-950 text-red-300 text-xs font-semibold hover:bg-emerald-800 flex items-center justify-center gap-2">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOP BAR */}
        <header className="flex flex-col px-4 py-3 border-b border-emerald-800 bg-emerald-900/50 shrink-0 gap-2.5">
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center min-w-8">
              <PWAInstallButton compact />
            </div>
            <div className="text-center">
              <h1 className="text-lg md:text-xl font-black text-white tracking-widest uppercase">
                CHOY CHAT
              </h1>
            </div>
            <button onClick={handleShareApp} className="p-2 bg-emerald-900 border border-emerald-700 rounded-lg text-emerald-200 hover:text-white shrink-0" title="Share">
              <Share2 className="w-3.5 h-3.5" />
            </button>
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

        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0">
          
          {/* FEED */}
          {activeTab === 'feed' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 shadow space-y-3">
                <div className="flex items-center gap-2 border-b border-emerald-800 pb-2 text-xs font-bold">
                  <button onClick={() => setNewPostCategory('feed')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${newPostCategory === 'feed' ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-extrabold shadow-md' : 'text-emerald-200 bg-emerald-950/80 hover:bg-emerald-800'}`}>
                    <Home className="w-3.5 h-3.5" /> Post Feed
                  </button>
                  <button onClick={() => setNewPostCategory('myday')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${newPostCategory === 'myday' ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-extrabold shadow-md' : 'text-emerald-200 bg-emerald-950/80 hover:bg-emerald-800'}`}>
                    <Sparkles className="w-3.5 h-3.5" /> Story (My Day)
                  </button>
                  <button onClick={() => setActiveTab('messages')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white ml-auto hover:brightness-110 transition shadow">
                    <MessageSquare className="w-3.5 h-3.5" /> Message Chat
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newPostText.trim()) return;
                  const newP: Post = {
                    id: 'p_' + Date.now(),
                    author: { name: profile.name, handle: profile.handle, avatar: profile.avatar },
                    content: newPostText,
                    mediaUrl: newPostMedia || undefined,
                    mediaType: newPostType,
                    timestamp: 'Now',
                    category: newPostCategory
                  };
                  setPosts([newP, ...posts]);
                  setNewPostText('');
                  setNewPostMedia('');
                }} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Content..."
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    className="w-full p-2.5 bg-emerald-950 border border-emerald-700 rounded-xl text-xs text-white focus:outline-none resize-none"
                  ></textarea>

                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={newPostType}
                        onChange={(e: any) => setNewPostType(e.target.value)}
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
                    <button type="submit" className="px-4 py-1.5 bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl">
                      Publish
                    </button>
                  </div>
                </form>
              </div>

              {/* Public Newsfeed Posts */}
              <div className="space-y-3">
                {filteredPosts.map(p => (
                  <div key={p.id} className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('profile')}>
                        <div className="relative">
                          <img src={p.author.avatar} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-emerald-950 rounded-full" title="Online"></span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{p.author.name}</div>
                          <div className="text-[10px] text-emerald-300">{p.timestamp}</div>
                        </div>
                      </div>
                      <button onClick={() => setPosts(posts.filter(item => item.id !== p.id))} className="text-red-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-100 break-words">{p.content}</p>
                    {p.mediaUrl && p.mediaType === 'image' && <img src={p.mediaUrl} alt="" className="rounded-xl max-h-72 w-full object-cover" />}
                    {p.mediaUrl && p.mediaType === 'video' && (
                      <video src={p.mediaUrl} controls preload="auto" className="rounded-xl max-h-72 w-full object-cover bg-black" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PEOPLE TAB */}
          {activeTab === 'people' && (
            <div className="max-w-xl mx-auto space-y-3">
              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={profile.avatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-emerald-950 rounded-full" title="Online"></span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{profile.name}</div>
                    <div className="text-[10px] text-emerald-300">{profile.handle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const isBlocked = blockedUsers.includes(profile.name);
                      if (isBlocked) {
                        setBlockedUsers(blockedUsers.filter(n => n !== profile.name));
                      } else {
                        setBlockedUsers([...blockedUsers, profile.name]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${blockedUsers.includes(profile.name) ? 'bg-red-500 text-white' : 'bg-red-950 text-red-300 border border-red-700'}`}
                  >
                    {blockedUsers.includes(profile.name) ? 'Blocked' : 'Block User'}
                  </button>
                  <button
                    onClick={() => setProfile({ ...profile, isFriend: !profile.isFriend })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${profile.isFriend ? 'bg-slate-800 text-slate-300' : 'bg-emerald-400 text-slate-950'}`}
                  >
                    {profile.isFriend ? 'Friends' : 'Add Friend'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIDEOS TAB */}
          {activeTab === 'videos' && (() => {
            const sharedChatVideos = messages.filter(
              m => m.mediaType === 'video' && Boolean(m.mediaUrl) && !blockedUsers.includes(m.sender)
            );
            return (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Video className="w-4 h-4 text-emerald-400" /> Shared Chat Videos ({sharedChatVideos.length})
                    </div>
                    <span className="text-[10px] text-emerald-300">Sound Enabled</span>
                  </div>
                  {sharedChatVideos.length === 0 ? (
                    <div className="py-6 text-center text-xs text-emerald-300">
                      No shared videos from chats yet. Upload a video in Messages to see it here.
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
                  <img src={profile.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border border-emerald-400" />
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-emerald-950 rounded-full" title="Online"></span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{profile.name}</div>
                  <div className="text-xs text-emerald-300">{profile.handle}</div>
                </div>
              </div>
            </div>
          )}

          {/* MESSAGES WITH REACTION BUTTONS */}
          {activeTab === 'messages' && (
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:h-[540px]">
              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-3 flex flex-col space-y-2">
                <div className="text-xs font-bold text-emerald-300 uppercase mb-1">Chats</div>
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
                  {chatRooms.map((room) => {
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
                {/* Responsive Chat Header (No horizontal clipping on mobile!) */}
                <div className="p-3 border-b border-emerald-800 space-y-2 text-xs font-bold text-white">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-black text-white truncate">{activeChat}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const targetUser = activeChat === 'VIP Group' ? 'Admin' : activeChat;
                          const isBlocked = blockedUsers.includes(targetUser);
                          if (isBlocked) {
                            setBlockedUsers(blockedUsers.filter(n => n !== targetUser));
                          } else {
                            setBlockedUsers([...blockedUsers, targetUser]);
                          }
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
                    .filter(m => m.receiver === activeChat)
                    .filter(m => !blockedUsers.includes(m.sender))
                    .filter(m => (m.text || '').toLowerCase().includes(msgSearchQuery.toLowerCase()))
                    .map(m => (
                    <div key={m.id} className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}>
                      <div className="text-[10px] text-emerald-300 px-1 mb-0.5">{m.sender} • {m.time}</div>
                      <div className={`p-3 rounded-2xl text-xs bg-emerald-950 text-slate-100 space-y-2 max-w-[85%]`}>
                        {m.mediaType === 'image' && m.mediaUrl && <img src={m.mediaUrl} alt="" className="max-h-40 rounded" />}
                        {m.mediaType === 'video' && m.mediaUrl && (
                          <ChatVideoPlayer src={m.mediaUrl} compact />
                        )}
                        {m.mediaType === 'audio' && m.mediaUrl && <audio src={m.mediaUrl} controls className="w-full h-8" />}
                        {m.mediaType === 'file' && <div className="text-amber-300 text-[10px]">📎 File Attachment</div>}
                        {m.text && <div>{m.text}</div>}

                        {/* Display Reactions */}
                        {m.reactions && m.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {m.reactions.map((emoji, rIdx) => (
                              <span key={rIdx} className="px-1.5 py-0.5 rounded-full bg-emerald-900/80 text-[10px] border border-emerald-700">
                                {emoji}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reaction Buttons Toolbar */}
                      <div className="flex items-center gap-1 mt-1 px-1">
                        <button type="button" onClick={() => addReactionToMessage(m.id, '❤️')} className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-800 text-slate-300" title="Heart">❤️</button>
                        <button type="button" onClick={() => addReactionToMessage(m.id, '👍')} className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-800 text-slate-300" title="Thumbs Up">👍</button>
                        <button type="button" onClick={() => addReactionToMessage(m.id, '🔥')} className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-800 text-slate-300" title="Fire">🔥</button>
                        <button type="button" onClick={() => addReactionToMessage(m.id, '😄')} className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-800 text-slate-300" title="Smile">😄</button>
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
                          onClick={() => { setMsgMediaUrl(''); setMsgMediaType('text'); }}
                          className="text-red-300 hover:text-red-100 font-bold px-1.5"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {msgMediaUrl && msgMediaType !== 'image' && (
                    <div className="flex items-center justify-between p-2 bg-emerald-900/80 rounded-xl text-xs border border-emerald-700">
                      <span className="text-emerald-200 truncate">
                        📎 Attached {msgMediaType.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setMsgMediaUrl(''); setMsgMediaType('text'); }}
                        className="text-red-300 hover:text-red-100 font-bold px-1.5"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!msgInput.trim() && !msgMediaUrl) return;
                    const newM: Message = {
                      id: 'm_' + Date.now(),
                      sender: profile.name,
                      receiver: activeChat,
                      text: msgInput,
                      mediaType: msgMediaType,
                      mediaUrl: msgMediaUrl || undefined,
                      time: 'Now',
                      isMe: true,
                      reactions: []
                    };
                    setMessages([...messages, newM]);
                    setMsgInput('');
                    setMsgMediaUrl('');
                    setMsgMediaType('text');
                  }} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => msgFileInputRef.current?.click()}
                      className="p-2.5 rounded-xl bg-emerald-900 border border-emerald-700 text-emerald-300 hover:text-white hover:bg-emerald-800 transition shrink-0"
                      title="Add picture, video, audio or file"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      placeholder={`Message ${activeChat}...`}
                      value={msgInput}
                      onChange={(e) => setMsgInput(e.target.value)}
                      className="flex-1 min-w-0 p-2.5 bg-emerald-900 border border-emerald-700 rounded-xl text-xs text-white placeholder-emerald-400 focus:outline-none"
                    />
                    <button type="submit" className="px-4 py-2.5 bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow hover:bg-emerald-300 transition shrink-0">
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* MILESTONE SPREADSHEET LEDGER */}
          {activeTab === 'ledger' && (
            <div className="max-w-6xl mx-auto space-y-4">
              
              <div className="flex justify-between items-center bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 shadow">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase">Milestone Spreadsheet Ledger</h3>
                  <p className="text-[10px] text-emerald-300">Live quantities and automatic calculations</p>
                </div>
                <button
                  onClick={handleDownloadLedgerCSV}
                  className="px-4 py-2 bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow hover:bg-emerald-300"
                >
                  <Download className="w-4 h-4" /> Download CSV
                </button>
              </div>

              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-4 shadow space-y-3">
                <h3 className="text-xs font-bold text-white uppercase">Add Quantity Record</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const nameInput = (document.getElementById('ledger_name') as HTMLInputElement)?.value;
                  if (!nameInput) return;
                  const newR: LedgerRow = {
                    id: 'l_' + Date.now(),
                    name: nameInput,
                    fiveH: 0,
                    fiveHType: 'blue',
                    bulig: 0,
                    point5: 0,
                    halfSack: 0,
                    oneSack: 0,
                    bal: 0
                  };
                  setLedgerRows([...ledgerRows, newR]);
                }} className="flex gap-2">
                  <input
                    id="ledger_name"
                    type="text"
                    placeholder="Name..."
                    className="p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-xs text-white flex-1"
                  />
                  <button type="submit" className="px-4 py-2 bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl">
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
                      {ledgerRows.map(row => {
                        const total = calculateRowTotal(row);
                        return (
                          <tr key={row.id} className="hover:bg-emerald-850">
                            <td className="p-3 sticky left-0 bg-emerald-900 font-bold text-white font-sans max-w-[120px] truncate">{row.name}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={row.fiveH}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setLedgerRows(ledgerRows.map(r => r.id === row.id ? { ...r, fiveH: val } : r));
                                  }}
                                  className={`w-12 p-1 bg-emerald-950 border-2 rounded text-center text-white font-bold ${row.fiveHType === 'blue' ? 'border-blue-500' : 'border-red-500'}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextType = row.fiveHType === 'blue' ? 'red' : 'blue';
                                    setLedgerRows(ledgerRows.map(r => r.id === row.id ? { ...r, fiveHType: nextType } : r));
                                  }}
                                  aria-label="Toggle color"
                                  className={`w-6 h-6 rounded-lg border-2 shadow-md transition-transform active:scale-95 ${row.fiveHType === 'blue' ? 'bg-blue-500 border-blue-200 shadow-blue-500/40' : 'bg-red-500 border-red-200 shadow-red-500/40'}`}
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.bulig}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setLedgerRows(ledgerRows.map(r => r.id === row.id ? { ...r, bulig: val } : r));
                                }}
                                className="w-12 p-1 bg-emerald-950 border border-emerald-700 rounded text-center text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.point5}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setLedgerRows(ledgerRows.map(r => r.id === row.id ? { ...r, point5: val } : r));
                                }}
                                className="w-12 p-1 bg-emerald-950 border border-emerald-700 rounded text-center text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.halfSack}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setLedgerRows(ledgerRows.map(r => r.id === row.id ? { ...r, halfSack: val } : r));
                                }}
                                className="w-12 p-1 bg-emerald-950 border border-emerald-700 rounded text-center text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.oneSack}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setLedgerRows(ledgerRows.map(r => r.id === row.id ? { ...r, oneSack: val } : r));
                                }}
                                className="w-12 p-1 bg-emerald-950 border border-emerald-700 rounded text-center text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.bal}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setLedgerRows(ledgerRows.map(r => r.id === row.id ? { ...r, bal: val } : r));
                                }}
                                className="w-16 p-1 bg-emerald-950 border border-emerald-700 rounded text-center text-white"
                              />
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-300">₱{total}</td>
                            <td className="p-3 text-center">
                              <button onClick={() => setLedgerRows(ledgerRows.filter(r => r.id !== row.id))} className="text-red-300">
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
                    <div className={`p-3 rounded-xl max-w-[80%] ${m.sender === 'user' ? 'bg-emerald-400 text-slate-950 font-bold' : 'bg-emerald-950 text-cyan-200'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!aiChatInput.trim()) return;
                const q = aiChatInput;
                setAiChatMessages(prev => [...prev, { sender: 'user', text: q }]);
                setAiChatInput('');

                const found = knowledgeBase.find(k => k.question.toLowerCase().includes(q.toLowerCase()) || q.toLowerCase().includes(k.question.toLowerCase()));
                const aiAns = found ? found.answer : `Choy AI synchronized answer for: "${q}". (Note: Private messages are strictly accessible by admin only).`;
                setTimeout(() => {
                  setAiChatMessages(prev => [...prev, { sender: 'ai', text: aiAns }]);
                }, 500);
              }} className="p-2 border-t border-emerald-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Ask Choy AI..."
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  className="flex-1 p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-xs text-white"
                />
                <button type="submit" className="px-4 py-2 bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl">Ask</button>
              </form>
            </div>
          )}

          {/* ADMIN TABS */}
          {activeTab === 'admin_approvals' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">User Accounts Approval & Login Monitor</h3>
                <div className="space-y-2">
                  {usersList.map(u => (
                    <div key={u.id} className="p-3 bg-emerald-950 border border-emerald-800 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{u.name} ({u.phone})</div>
                        <div className="text-[10px] text-emerald-300">Login Date: {u.loginDate}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {u.status}
                        </span>
                        {u.status === 'pending' && (
                          <button
                            onClick={() => setUsersList(usersList.map(item => item.id === u.id ? { ...item, status: 'approved' } : item))}
                            className="px-2 py-1 bg-emerald-400 text-slate-950 font-bold rounded"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin_knowledge' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">Choy AI Brain Knowledge Box (Q & A)</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newQ.trim() || !newA.trim()) return;
                  setKnowledgeBase([...knowledgeBase, { id: 'k_' + Date.now(), question: newQ, answer: newA }]);
                  setNewQ('');
                  setNewA('');
                }} className="space-y-2 text-xs">
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
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl">Add Knowledge</button>
                </form>

                <div className="space-y-2 pt-2">
                  {knowledgeBase.map(k => (
                    <div key={k.id} className="p-2.5 bg-emerald-950 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-cyan-300">Q: {k.question}</div>
                      <div className="text-slate-200">A: {k.answer}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin_prices' && isAdmin && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4 text-xs">
                <h3 className="text-sm font-bold text-white">Set Unit Prices (Admin)</h3>
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
                    onClick={() => {
                      setPricesSavedMsg(true);
                      setTimeout(() => setPricesSavedMsg(false), 2500);
                    }}
                    className="w-full py-2.5 bg-emerald-400 text-slate-950 font-bold rounded-xl shadow mt-2"
                  >
                    {pricesSavedMsg ? 'Unit Prices Saved!' : 'Save Unit Prices'}
                  </button>
                </div>
              </div>

              <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 space-y-4 text-xs">
                <h3 className="text-sm font-bold text-white">Add Quantity / Default Quantities (Apply to All Milestones)</h3>
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
                      onChange={(e) => setDefaultQuantities({ ...defaultQuantities, halfSack: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-300 mb-1">One Sack Default Quantity</label>
                    <input
                      type="number"
                      value={defaultQuantities.oneSack}
                      onChange={(e) => setDefaultQuantities({ ...defaultQuantities, oneSack: Number(e.target.value) })}
                      className="w-full p-2 bg-emerald-950 border border-emerald-700 rounded-xl text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-cyan-400 text-slate-950 font-bold rounded-xl shadow mt-2"
                  >
                    {qtySavedMsg ? 'Quantities Applied to All Milestones!' : 'Save & Apply Quantities to All Milestones'}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {sortedLeaderboard.slice(0, 3).map((u, i) => (
                    <div key={u.id} className="p-4 rounded-xl bg-emerald-950 border border-emerald-800 text-center space-y-1 text-xs">
                      <div className="text-amber-400 font-bold">#{i + 1}</div>
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="font-mono text-emerald-300">₱{calculateRowTotal(u)}</div>
                    </div>
                  ))}
                </div>
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
            <img src="/assets/aistudio/image_20261121_145253_f477cbfa.webp" alt="" className="w-full h-full object-cover" />
          </button>
        )}

        {isChoyAIPopupOpen && (
          <div className="w-80 h-96 bg-emerald-950 border border-cyan-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 bg-emerald-900 border-b border-cyan-500/40 text-cyan-200 font-bold text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/assets/aistudio/image_20261121_145253_f477cbfa.webp" alt="" className="w-5 h-5 rounded object-cover border border-cyan-400" /> Choy AI Assistant
              </div>
              <button onClick={() => setIsChoyAIPopupOpen(false)} className="text-slate-300 hover:text-white font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              {aiChatMessages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-2.5 rounded-xl max-w-[85%] ${m.sender === 'user' ? 'bg-cyan-400 text-slate-950 font-bold' : 'bg-emerald-900 text-cyan-200'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!aiChatInput.trim()) return;
              const q = aiChatInput;
              setAiChatMessages(prev => [...prev, { sender: 'user', text: q }]);
              setAiChatInput('');

              const found = knowledgeBase.find(k => k.question.toLowerCase().includes(q.toLowerCase()) || q.toLowerCase().includes(k.question.toLowerCase()));
              const aiAns = found ? found.answer : `Choy AI synchronized answer for: "${q}". (Note: Private messages are strictly accessible by admin only).`;
              setTimeout(() => {
                setAiChatMessages(prev => [...prev, { sender: 'ai', text: aiAns }]);
              }, 400);
            }} className="p-2 border-t border-emerald-800 bg-emerald-950 flex gap-2">
              <input
                type="text"
                placeholder="Ask Choy AI anything..."
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                className="flex-1 p-2 bg-emerald-900 border border-emerald-700 rounded-xl text-xs text-white placeholder-emerald-300 focus:outline-none"
              />
              <button type="submit" className="px-3 py-2 bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow">Send</button>
            </form>
          </div>
        )}
      </div>

      <OfflineIndicator />
    </div>
  );
}
