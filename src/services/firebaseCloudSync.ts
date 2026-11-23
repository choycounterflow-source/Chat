import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAILS,
  db,
  googleProvider,
  handleFirestoreError,
  onAuthStateChanged,
  OperationType,
  signInWithPopup,
  signOut,
  type User,
} from '../firebase';

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_ID_LEN = 128;
const MAX_ACCOUNT_NAME_LEN = 100;
const MAX_PHONE_LEN = 64;
const MAX_PIN_HASH_LEN = 256;
const MAX_AVATAR_LEN = 200000;
const MAX_BLOCKED_USERS = 100;
const MAX_BLOCKED_NAME_LEN = 80;
const MAX_DATE_STR_LEN = 64;
const MAX_NF_TITLE_LEN = 80;
const MAX_ANN_TITLE_LEN = 120;
const MAX_ANN_MSG_LEN = 1000;
const MAX_CREATED_BY_LEN = 80;
const MAX_LEDGER_NAME_LEN = 100;
const MAX_KNOWLEDGE_Q_LEN = 300;
const MAX_KNOWLEDGE_A_LEN = 2000;

export interface CloudBackupUser {
  id: string;
  name: string;
  phone: string;
  pinHash: string;
  role: 'admin' | 'member';
  status: 'pending' | 'approved';
  blockedUsers: string[];
  avatar?: string;
  newsfeed: 'feed_a' | 'feed_b' | 'feed_c' | 'feed_bc';
  createdAt: string;
  updatedAt: string;
}

export interface CloudBackupSettings {
  fiveH: number;
  bulig: number;
  point5: number;
  halfSack: number;
  oneSack: number;
  defFiveH: number;
  defBulig: number;
  defPoint5: number;
  defHalfSack: number;
  defOneSack: number;
}

export interface CloudBackupNewsfeedConfig {
  feedATitle: string;
  feedBTitle: string;
  feedCTitle: string;
}

export interface CloudBackupLedgerRow {
  id: string;
  name: string;
  fiveH: number;
  fiveHType: 'blue' | 'red';
  bulig: number;
  point5: number;
  halfSack: number;
  oneSack: number;
  bal: number;
  updatedAt: string;
}

export interface CloudBackupKnowledgeQA {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

export interface CloudBackupAnnouncement {
  id: string;
  title: string;
  message: string;
  badge: 'announcement' | 'reminder' | 'urgent';
  tone: 'emerald' | 'amber' | 'sky' | 'rose';
  target: 'all' | 'feed_a' | 'feed_b' | 'feed_c' | 'feed_bc';
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CloudBackupSnapshot {
  exportedAt: string;
  users: CloudBackupUser[];
  settings: CloudBackupSettings;
  newsfeedConfig: CloudBackupNewsfeedConfig;
  ledger: CloudBackupLedgerRow[];
  knowledge: CloudBackupKnowledgeQA[];
  announcements: CloudBackupAnnouncement[];
}

function sanitizeSafeId(raw: string): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, MAX_ID_LEN);
  if (!cleaned || !SAFE_ID_REGEX.test(cleaned)) {
    return 'id_' + Date.now();
  }
  return cleaned;
}

function clampFinite(val: unknown, min: number, max: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

function normalizeNewsfeed(raw: unknown): 'feed_a' | 'feed_b' | 'feed_c' | 'feed_bc' {
  if (raw === 'feed_b' || raw === 'feed_c' || raw === 'feed_bc') return raw;
  return 'feed_a';
}

export function isVerifiedAdminFirebaseUser(user: User | null): boolean {
  if (!user || !user.emailVerified || !user.email) return false;
  const normalized = user.email.trim().toLowerCase();
  return BOOTSTRAPPED_ADMIN_EMAILS.some((allowed) => allowed.toLowerCase() === normalized);
}

export async function connectFirebaseGoogleAdmin(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (!result.user.emailVerified) {
      throw new Error('Google account email must be verified.');
    }
    return result.user;
  } catch (err: unknown) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
    if (code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked by your browser. Please allow popups for this site and try again.');
    }
    if (code === 'auth/popup-closed-by-user') {
      throw new Error('Google sign-in popup was closed before completing login.');
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error(
        `Domain "${window.location.hostname}" is not yet authorized in Firebase Authentication. Connect from the AI Studio app URL or add this domain in Firebase Console -> Authentication -> Settings -> Authorized domains.`
      );
    }
    throw err;
  }
}

export async function disconnectFirebaseGoogle(): Promise<void> {
  await signOut(auth);
}

export function subscribeFirebaseAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userRef = doc(db, 'users', sanitizeSafeId(user.uid));
        await setDoc(
          userRef,
          {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Anonymous',
            status: 'approved',
            visibility: 'public',
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        console.log('User data successfully synced to Firestore!');
      } catch (err) {
        console.error('Failed to sync user login to Firestore:', err);
      }
    }
    cb(user);
  });
}

export async function syncSnapshotToFirestore(snapshot: CloudBackupSnapshot): Promise<{
  accountsSynced: number;
  announcementsSynced: number;
  ledgerSynced: number;
  knowledgeSynced: number;
}> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) {
    throw new Error('Please connect your verified Google Admin account first.');
  }
  const uid = sanitizeSafeId(fbUser.uid);

  // 1. Sync Cloud Accounts (/cloud_accounts/{accountId})
  const accountsPath = 'cloud_accounts';
  const existingAccounts = new Map<string, { createdAt?: Timestamp; raw: Record<string, unknown> }>();
  try {
    const snap = await getDocs(collection(db, accountsPath));
    snap.forEach((d) => {
      existingAccounts.set(d.id, {
        createdAt: d.data().createdAt as Timestamp | undefined,
        raw: d.data(),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, accountsPath);
  }

  let accountsSynced = 0;
  const targetAccountIds = new Set<string>();

  for (const u of snapshot.users || []) {
    const accountId = sanitizeSafeId(u.id);
    const name = String(u.name || '').trim().slice(0, MAX_ACCOUNT_NAME_LEN);
    const phone = String(u.phone || '').trim().slice(0, MAX_PHONE_LEN);
    const pinHash = String(u.pinHash || '').trim().slice(0, MAX_PIN_HASH_LEN);
    if (!name || !phone || pinHash.length < 10) continue;

    targetAccountIds.add(accountId);
    const blockedUsers = Array.isArray(u.blockedUsers)
      ? u.blockedUsers
          .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
          .slice(0, MAX_BLOCKED_USERS)
          .map((b) => b.trim().slice(0, MAX_BLOCKED_NAME_LEN))
      : [];
    const safeAvatar =
      typeof u.avatar === 'string' && u.avatar.trim() && u.avatar.trim().length <= MAX_AVATAR_LEN
        ? u.avatar.trim()
        : undefined;
    const role: 'admin' | 'member' = u.role === 'admin' ? 'admin' : 'member';
    const status: 'pending' | 'approved' = u.status === 'pending' ? 'pending' : 'approved';
    const newsfeed = normalizeNewsfeed(u.newsfeed);
    const accountCreatedAt = String(u.createdAt || new Date().toISOString()).slice(0, MAX_DATE_STR_LEN);
    const accountUpdatedAt = String(u.updatedAt || accountCreatedAt).slice(0, MAX_DATE_STR_LEN);

    const prev = existingAccounts.get(accountId);
    if (
      prev &&
      prev.raw.name === name &&
      prev.raw.phone === phone &&
      prev.raw.pinHash === pinHash &&
      prev.raw.role === role &&
      prev.raw.status === status &&
      prev.raw.newsfeed === newsfeed &&
      prev.raw.accountUpdatedAt === accountUpdatedAt &&
      (prev.raw.avatar || undefined) === safeAvatar &&
      JSON.stringify(prev.raw.blockedUsers || []) === JSON.stringify(blockedUsers)
    ) {
      accountsSynced += 1;
      continue;
    }

    const payload: Record<string, unknown> = {
      accountId,
      name,
      phone,
      pinHash,
      role,
      status,
      blockedUsers,
      newsfeed,
      accountCreatedAt,
      accountUpdatedAt,
      updatedBy: uid,
      createdAt: prev?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (safeAvatar) {
      payload.avatar = safeAvatar;
    }

    const docPath = `${accountsPath}/${accountId}`;
    try {
      await setDoc(doc(db, accountsPath, accountId), payload);
      accountsSynced += 1;
    } catch (err) {
      handleFirestoreError(err, prev ? OperationType.UPDATE : OperationType.CREATE, docPath);
    }
  }

  for (const existingId of existingAccounts.keys()) {
    if (!targetAccountIds.has(existingId)) {
      const docPath = `${accountsPath}/${existingId}`;
      try {
        await deleteDoc(doc(db, accountsPath, existingId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath);
      }
    }
  }

  // 2. Sync Settings (/settings/prices)
  if (snapshot.settings) {
    const s = snapshot.settings;
    const settingsDocPath = 'settings/prices';
    try {
      await setDoc(doc(db, 'settings', 'prices'), {
        fiveH: clampFinite(s.fiveH, 0, 1000000),
        bulig: clampFinite(s.bulig, 0, 1000000),
        point5: clampFinite(s.point5, 0, 1000000),
        halfSack: clampFinite(s.halfSack, 0, 1000000),
        oneSack: clampFinite(s.oneSack, 0, 1000000),
        defFiveH: clampFinite(s.defFiveH, 0, 1000000),
        defBulig: clampFinite(s.defBulig, 0, 1000000),
        defPoint5: clampFinite(s.defPoint5, 0, 1000000),
        defHalfSack: clampFinite(s.defHalfSack, 0, 1000000),
        defOneSack: clampFinite(s.defOneSack, 0, 1000000),
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, settingsDocPath);
    }
  }

  // 3. Sync Newsfeed Config (/cloud_newsfeed_config/default)
  if (snapshot.newsfeedConfig) {
    const nf = snapshot.newsfeedConfig;
    const nfPath = 'cloud_newsfeed_config/default';
    try {
      await setDoc(doc(db, 'cloud_newsfeed_config', 'default'), {
        feedATitle: (String(nf.feedATitle || 'Newsfeed A').trim() || 'Newsfeed A').slice(0, MAX_NF_TITLE_LEN),
        feedBTitle: (String(nf.feedBTitle || 'Newsfeed B').trim() || 'Newsfeed B').slice(0, MAX_NF_TITLE_LEN),
        feedCTitle: (String(nf.feedCTitle || 'Newsfeed C').trim() || 'Newsfeed C').slice(0, MAX_NF_TITLE_LEN),
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, nfPath);
    }
  }

  // 4. Sync Announcements (/cloud_announcements/{annId})
  const annPath = 'cloud_announcements';
  const existingAnns = new Map<string, { createdAt?: Timestamp; raw: Record<string, unknown> }>();
  try {
    const snap = await getDocs(collection(db, annPath));
    snap.forEach((d) => {
      existingAnns.set(d.id, {
        createdAt: d.data().createdAt as Timestamp | undefined,
        raw: d.data(),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, annPath);
  }

  let announcementsSynced = 0;
  const targetAnnIds = new Set<string>();
  for (const ann of snapshot.announcements || []) {
    const annId = sanitizeSafeId(ann.id);
    const title = String(ann.title || '').trim().slice(0, MAX_ANN_TITLE_LEN);
    const message = String(ann.message || '').trim().slice(0, MAX_ANN_MSG_LEN);
    if (!title || !message) continue;
    targetAnnIds.add(annId);
    const badge = ann.badge === 'reminder' || ann.badge === 'urgent' ? ann.badge : 'announcement';
    const tone = ann.tone === 'amber' || ann.tone === 'sky' || ann.tone === 'rose' ? ann.tone : 'emerald';
    const target =
      ann.target === 'feed_a' || ann.target === 'feed_b' || ann.target === 'feed_c' || ann.target === 'feed_bc'
        ? ann.target
        : 'all';
    const active = ann.active !== false;
    const createdBy = (String(ann.createdBy || 'Admin').trim() || 'Admin').slice(0, MAX_CREATED_BY_LEN);
    const annCreatedAt = String(ann.createdAt || new Date().toISOString()).slice(0, MAX_DATE_STR_LEN);
    const annUpdatedAt = String(ann.updatedAt || annCreatedAt).slice(0, MAX_DATE_STR_LEN);

    const prev = existingAnns.get(annId);
    if (
      prev &&
      prev.raw.title === title &&
      prev.raw.message === message &&
      prev.raw.badge === badge &&
      prev.raw.tone === tone &&
      prev.raw.target === target &&
      prev.raw.active === active &&
      prev.raw.annUpdatedAt === annUpdatedAt
    ) {
      announcementsSynced += 1;
      continue;
    }

    try {
      await setDoc(doc(db, annPath, annId), {
        annId,
        title,
        message,
        badge,
        tone,
        target,
        active,
        createdBy,
        annCreatedAt,
        annUpdatedAt,
        updatedBy: uid,
        createdAt: prev?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      announcementsSynced += 1;
    } catch (err) {
      handleFirestoreError(err, prev ? OperationType.UPDATE : OperationType.CREATE, `${annPath}/${annId}`);
    }
  }
  for (const existingAnnId of existingAnns.keys()) {
    if (!targetAnnIds.has(existingAnnId)) {
      try {
        await deleteDoc(doc(db, annPath, existingAnnId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${annPath}/${existingAnnId}`);
      }
    }
  }

  // 5. Sync Ledger (/ledger/{rowId})
  const ledgerPath = 'ledger';
  const existingLedger = new Map<string, { createdAt?: Timestamp; raw: Record<string, unknown> }>();
  try {
    const snap = await getDocs(collection(db, ledgerPath));
    snap.forEach((d) => {
      existingLedger.set(d.id, {
        createdAt: d.data().createdAt as Timestamp | undefined,
        raw: d.data(),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, ledgerPath);
  }

  let ledgerSynced = 0;
  const targetLedgerIds = new Set<string>();
  for (const row of snapshot.ledger || []) {
    const rowId = sanitizeSafeId(row.id);
    const name = String(row.name || '').trim().slice(0, MAX_LEDGER_NAME_LEN);
    if (!name) continue;
    targetLedgerIds.add(rowId);
    const fiveH = clampFinite(row.fiveH, -1000000, 1000000);
    const fiveHType = row.fiveHType === 'red' ? 'red' : 'blue';
    const bulig = clampFinite(row.bulig, -1000000, 1000000);
    const point5 = clampFinite(row.point5, -1000000, 1000000);
    const halfSack = clampFinite(row.halfSack, -1000000, 1000000);
    const oneSack = clampFinite(row.oneSack, -1000000, 1000000);
    const bal = clampFinite(row.bal, -100000000, 100000000);
    const prev = existingLedger.get(rowId);
    if (
      prev &&
      prev.raw.name === name &&
      prev.raw.fiveH === fiveH &&
      prev.raw.fiveHType === fiveHType &&
      prev.raw.bulig === bulig &&
      prev.raw.point5 === point5 &&
      prev.raw.halfSack === halfSack &&
      prev.raw.oneSack === oneSack &&
      prev.raw.bal === bal
    ) {
      ledgerSynced += 1;
      continue;
    }
    try {
      await setDoc(doc(db, ledgerPath, rowId), {
        name,
        fiveH,
        fiveHType,
        bulig,
        point5,
        halfSack,
        oneSack,
        bal,
        updatedBy: uid,
        createdAt: prev?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      ledgerSynced += 1;
    } catch (err) {
      handleFirestoreError(err, prev ? OperationType.UPDATE : OperationType.CREATE, `${ledgerPath}/${rowId}`);
    }
  }
  for (const existingLedgerId of existingLedger.keys()) {
    if (!targetLedgerIds.has(existingLedgerId)) {
      try {
        await deleteDoc(doc(db, ledgerPath, existingLedgerId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${ledgerPath}/${existingLedgerId}`);
      }
    }
  }

  // 6. Sync Knowledge Q&A (/knowledge/{qaId})
  const knowledgePath = 'knowledge';
  const existingKnowledge = new Map<string, { createdAt?: Timestamp; raw: Record<string, unknown> }>();
  try {
    const snap = await getDocs(collection(db, knowledgePath));
    snap.forEach((d) => {
      existingKnowledge.set(d.id, {
        createdAt: d.data().createdAt as Timestamp | undefined,
        raw: d.data(),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, knowledgePath);
  }

  let knowledgeSynced = 0;
  const targetQaIds = new Set<string>();
  for (const qa of snapshot.knowledge || []) {
    const qaId = sanitizeSafeId(qa.id);
    const question = String(qa.question || '').trim().slice(0, MAX_KNOWLEDGE_Q_LEN);
    const answer = String(qa.answer || '').trim().slice(0, MAX_KNOWLEDGE_A_LEN);
    if (!question || !answer) continue;
    targetQaIds.add(qaId);
    const prev = existingKnowledge.get(qaId);
    if (prev && prev.raw.question === question && prev.raw.answer === answer) {
      knowledgeSynced += 1;
      continue;
    }
    try {
      await setDoc(doc(db, knowledgePath, qaId), {
        question,
        answer,
        visibility: 'public',
        createdBy: (prev?.raw.createdBy as string) || uid,
        createdAt: prev?.createdAt || serverTimestamp(),
      });
      knowledgeSynced += 1;
    } catch (err) {
      handleFirestoreError(err, prev ? OperationType.UPDATE : OperationType.CREATE, `${knowledgePath}/${qaId}`);
    }
  }
  for (const existingQaId of existingKnowledge.keys()) {
    if (!targetQaIds.has(existingQaId)) {
      try {
        await deleteDoc(doc(db, knowledgePath, existingQaId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${knowledgePath}/${existingQaId}`);
      }
    }
  }

  return {
    accountsSynced,
    announcementsSynced,
    ledgerSynced,
    knowledgeSynced,
  };
}

export async function fetchSnapshotFromFirestore(): Promise<Partial<CloudBackupSnapshot>> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) {
    throw new Error('Please connect your verified Google Admin account first.');
  }

  const users: CloudBackupUser[] = [];
  try {
    const snap = await getDocs(collection(db, 'cloud_accounts'));
    snap.forEach((d) => {
      const data = d.data();
      if (!data.name || !data.phone || !data.pinHash) return;
      users.push({
        id: String(data.accountId || d.id),
        name: String(data.name),
        phone: String(data.phone),
        pinHash: String(data.pinHash),
        role: data.role === 'admin' ? 'admin' : 'member',
        status: data.status === 'pending' ? 'pending' : 'approved',
        blockedUsers: Array.isArray(data.blockedUsers) ? data.blockedUsers.map(String) : [],
        avatar: typeof data.avatar === 'string' ? data.avatar : undefined,
        newsfeed: normalizeNewsfeed(data.newsfeed),
        createdAt: String(data.accountCreatedAt || new Date().toISOString()),
        updatedAt: String(data.accountUpdatedAt || new Date().toISOString()),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'cloud_accounts');
  }

  let settings: CloudBackupSettings | undefined;
  try {
    const snap = await getDocs(collection(db, 'settings'));
    snap.forEach((d) => {
      if (d.id === 'prices') {
        const data = d.data();
        settings = {
          fiveH: Number(data.fiveH ?? 50),
          bulig: Number(data.bulig ?? 100),
          point5: Number(data.point5 ?? 150),
          halfSack: Number(data.halfSack ?? 200),
          oneSack: Number(data.oneSack ?? 400),
          defFiveH: Number(data.defFiveH ?? 0),
          defBulig: Number(data.defBulig ?? 0),
          defPoint5: Number(data.defPoint5 ?? 0),
          defHalfSack: Number(data.defHalfSack ?? 0),
          defOneSack: Number(data.defOneSack ?? 0),
        };
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'settings');
  }

  let newsfeedConfig: CloudBackupNewsfeedConfig | undefined;
  try {
    const snap = await getDocs(collection(db, 'cloud_newsfeed_config'));
    snap.forEach((d) => {
      if (d.id === 'default') {
        const data = d.data();
        newsfeedConfig = {
          feedATitle: String(data.feedATitle || 'Newsfeed A'),
          feedBTitle: String(data.feedBTitle || 'Newsfeed B'),
          feedCTitle: String(data.feedCTitle || 'Newsfeed C'),
        };
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'cloud_newsfeed_config');
  }

  const announcements: CloudBackupAnnouncement[] = [];
  try {
    const snap = await getDocs(collection(db, 'cloud_announcements'));
    snap.forEach((d) => {
      const data = d.data();
      if (!data.title || !data.message) return;
      announcements.push({
        id: String(data.annId || d.id),
        title: String(data.title),
        message: String(data.message),
        badge: data.badge === 'reminder' || data.badge === 'urgent' ? data.badge : 'announcement',
        tone: data.tone === 'amber' || data.tone === 'sky' || data.tone === 'rose' ? data.tone : 'emerald',
        target:
          data.target === 'feed_a' || data.target === 'feed_b' || data.target === 'feed_c' || data.target === 'feed_bc'
            ? data.target
            : 'all',
        active: data.active !== false,
        createdBy: String(data.createdBy || 'Admin'),
        createdAt: String(data.annCreatedAt || new Date().toISOString()),
        updatedAt: String(data.annUpdatedAt || new Date().toISOString()),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'cloud_announcements');
  }

  const ledger: CloudBackupLedgerRow[] = [];
  try {
    const snap = await getDocs(collection(db, 'ledger'));
    snap.forEach((d) => {
      const data = d.data();
      if (!data.name) return;
      ledger.push({
        id: d.id,
        name: String(data.name),
        fiveH: Number(data.fiveH ?? 0),
        fiveHType: data.fiveHType === 'red' ? 'red' : 'blue',
        bulig: Number(data.bulig ?? 0),
        point5: Number(data.point5 ?? 0),
        halfSack: Number(data.halfSack ?? 0),
        oneSack: Number(data.oneSack ?? 0),
        bal: Number(data.bal ?? 0),
        updatedAt: new Date().toISOString(),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'ledger');
  }

  const knowledge: CloudBackupKnowledgeQA[] = [];
  try {
    const snap = await getDocs(collection(db, 'knowledge'));
    snap.forEach((d) => {
      const data = d.data();
      if (!data.question || !data.answer) return;
      knowledge.push({
        id: d.id,
        question: String(data.question),
        answer: String(data.answer),
        createdAt: new Date().toISOString(),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'knowledge');
  }

  return {
    exportedAt: new Date().toISOString(),
    users,
    settings,
    newsfeedConfig,
    announcements,
    ledger,
    knowledge,
  };
}
