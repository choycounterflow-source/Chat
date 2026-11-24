import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

export type NewsfeedChannel = 'feed_a' | 'feed_b' | 'feed_c' | 'feed_bc' | 'both';
export type SelectableNewsfeedChannel = 'feed_a' | 'feed_b' | 'feed_c' | 'feed_bc';

export function normalizeUserNewsfeed(raw: unknown): SelectableNewsfeedChannel {
  const val = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (val === 'feed_b') return 'feed_b';
  if (val === 'feed_c') return 'feed_c';
  if (val === 'feed_bc') return 'feed_bc';
  return 'feed_a';
}

export function normalizePostNewsfeed(raw: unknown): NewsfeedChannel {
  const val = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (val === 'feed_a') return 'feed_a';
  if (val === 'feed_b') return 'feed_b';
  if (val === 'feed_c') return 'feed_c';
  if (val === 'feed_bc') return 'feed_bc';
  if (val === 'both') return 'both';
  return 'feed_a';
}

export type AnnouncementTarget = 'all' | 'feed_a' | 'feed_b' | 'feed_c' | 'feed_bc';
export type AnnouncementBadge = 'announcement' | 'reminder' | 'urgent';
export type AnnouncementTone = 'emerald' | 'amber' | 'sky' | 'rose';

export interface StoredAnnouncement {
  id: string;
  title: string;
  message: string;
  badge: AnnouncementBadge;
  tone: AnnouncementTone;
  target: AnnouncementTarget;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function normalizeAnnouncementTarget(raw: unknown): AnnouncementTarget {
  const val = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (val === 'feed_a' || val === 'feed_b' || val === 'feed_c' || val === 'feed_bc') return val;
  return 'all';
}

export function normalizeAnnouncementBadge(raw: unknown): AnnouncementBadge {
  const val = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (val === 'reminder' || val === 'urgent') return val;
  return 'announcement';
}

export function normalizeAnnouncementTone(raw: unknown): AnnouncementTone {
  const val = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (val === 'amber' || val === 'sky' || val === 'rose') return val;
  return 'emerald';
}

export interface StoredUser {
  id: string;
  name: string;
  phone: string;
  pinHash: string;
  role: 'admin' | 'member';
  status: 'pending' | 'approved';
  blockedUsers: string[];
  avatar?: string;
  newsfeed: SelectableNewsfeedChannel;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUserDTO {
  id: string;
  name: string;
  phone: string;
  role: 'admin' | 'member';
  status: 'pending' | 'approved';
  avatar?: string;
  newsfeed: SelectableNewsfeedChannel;
  loginDate: string;
}

export interface StoredPost {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  mediaUrl?: string;
  mediaType: 'text' | 'image' | 'video';
  category: 'feed' | 'myday' | 'video';
  newsfeed: NewsfeedChannel;
  createdAt: string;
}

export interface StoredMessage {
  id: string;
  senderId: string;
  senderName: string;
  roomId: string;
  text: string;
  mediaUrl?: string;
  mediaType: 'text' | 'image' | 'video' | 'audio' | 'file';
  transcript?: string;
  reactions: string[];
  createdAt: string;
}

export interface StoredLedgerRow {
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

export interface StoredKnowledgeQA {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

export interface StoredPricesSettings {
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

export interface StoredPushSubscription {
  endpoint: string;
  userId: string;
  userName: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  updatedAt: string;
}

export interface VapidKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface StoredEmojiLink {
  id: string;
  emojiCode: string;
  targetUrl: string;
  title: string;
  iconUrl: string;
  pinnedToAppIcon: boolean;
  createdBy: string;
  createdAt: string;
}

export interface StudioNoteEntry {
  id: string;
  rawText: string;
  createdAt: string;
}

export interface StoredStudioNoteFile {
  id: string;
  title: string;
  category: string;
  entries: StudioNoteEntry[];
  organizedPrompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredEnvVaultEntry {
  id: string;
  category: string;
  keyName: string;
  value: string;
  secret: boolean;
  notes?: string;
  updatedAt: string;
}

export interface StoredNewsfeedConfig {
  feedATitle: string;
  feedBTitle: string;
  feedCTitle: string;
}

export interface SessionPayload {
  uid: string;
  role: 'admin' | 'member';
  exp: number;
}

const DEFAULT_AVATAR = '/assets/aistudio/image_20261121_145253_f477cbfa.webp';
const DEFAULT_NEWSFEED_CONFIG: StoredNewsfeedConfig = {
  feedATitle: 'Newsfeed A',
  feedBTitle: 'Newsfeed B',
  feedCTitle: 'Newsfeed C',
};
const DEFAULT_SETTINGS: StoredPricesSettings = {
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
};

export const ALLOWED_CHAT_ROOMS = ['VIP Group', 'Choy Admin'] as const;

const LOCAL_DATA_FILE = path.join(process.cwd(), '.choychat-data.json');

function initSessionSigningKey(): string {
  const envSecret = (process.env.SESSION_SECRET || '').trim();
  if (envSecret.length >= 16) return envSecret;
  try {
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw) as { sessionKey?: unknown };
      if (typeof parsed.sessionKey === 'string' && parsed.sessionKey.length >= 32) {
        return parsed.sessionKey;
      }
    }
  } catch {
    // ignore read error on initial startup
  }
  return crypto.randomBytes(32).toString('hex');
}

const SESSION_SIGNING_KEY = initSessionSigningKey();

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(pin, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPin(pin: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const derived = crypto.scryptSync(pin, salt, 64);
    const storedBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(derived, storedBuf);
  } catch {
    return false;
  }
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function normalizePhone(raw: string): string {
  const stripped = raw.trim().replace(/[\s\-().]/g, '');
  if (/^\+639\d{9}$/.test(stripped)) {
    return '0' + stripped.slice(3);
  }
  if (/^639\d{9}$/.test(stripped)) {
    return '0' + stripped.slice(2);
  }
  return stripped;
}

export function signSessionToken(uid: string, role: 'admin' | 'member'): string {
  const payload: SessionPayload = {
    uid,
    role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SIGNING_KEY)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SIGNING_KEY)
    .update(payloadB64)
    .digest('base64url');
  if (!timingSafeStringEqual(sig, expectedSig)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed.uid || (parsed.role !== 'admin' && parsed.role !== 'member')) return null;
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function sanitizeMediaUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('/assets/') && trimmed.length <= 500) return trimmed;
  if (
    trimmed.length <= 4000000 &&
    /^data:image\/(png|jpeg|jpg|webp|gif|avif|heic);base64,[A-Za-z0-9+/=]+$/.test(trimmed)
  ) {
    return trimmed;
  }
  if (
    trimmed.length <= 8500000 &&
    /^data:video\/(mp4|webm|quicktime);base64,[A-Za-z0-9+/=]+$/.test(trimmed)
  ) {
    return trimmed;
  }
  if (
    trimmed.length <= 5000000 &&
    /^data:audio\/(webm|ogg|mp4|mpeg|mp3|wav|aac|x-m4a)(;codecs=[a-zA-Z0-9._-]+)?;base64,[A-Za-z0-9+/=]+$/.test(trimmed)
  ) {
    return trimmed;
  }
  if (trimmed.length > 1000) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function sanitizeWebsiteUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 1000) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function clampNum(val: unknown, min: number, max: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

export function computeLedgerTotal(row: StoredLedgerRow, settings: StoredPricesSettings): number {
  return (
    row.fiveH * settings.fiveH +
    row.bulig * settings.bulig +
    row.point5 * settings.point5 +
    row.halfSack * settings.halfSack +
    row.oneSack * settings.oneSack +
    row.bal
  );
}

export class ChoyStore {
  private pool: Pool | null = null;
  private usePostgres = false;
  private _storageStatus: 'postgres_connected' | 'no_database_url' | 'auth_failed' | 'connection_failed' = 'no_database_url';
  private readyPromise: Promise<void>;
  private poolSource: 'pooler_url' | 'database_url' | 'none' = 'none';
  private poolMax = clampNum(process.env.PG_POOL_MAX || 15, 2, 50);

  // In-memory fallback when DATABASE_URL is not yet configured
  private memUsers: StoredUser[] = [];
  private memPosts: StoredPost[] = [];
  private memMessages: StoredMessage[] = [];
  private memLedger: StoredLedgerRow[] = [];
  private memKnowledge: StoredKnowledgeQA[] = [];
  private memSettings: StoredPricesSettings = { ...DEFAULT_SETTINGS };
  private memNewsfeedConfig: StoredNewsfeedConfig = { ...DEFAULT_NEWSFEED_CONFIG };
  private memPushSubs: StoredPushSubscription[] = [];
  private memVapidKeys: VapidKeyPair | null = null;
  private memLocations: Array<{
    userId: string;
    userName: string;
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    updatedAt: string;
  }> = [];
  private locationTrails = new Map<string, Array<{ lat: number; lng: number; ts: string }>>();
  private memEmojiLinks: StoredEmojiLink[] = [
    {
      id: 'el_default',
      emojiCode: '🔐🟢💬✨🚀',
      targetUrl: 'https://chat-9-si9x.onrender.com',
      title: 'Choy Chat Live App',
      iconUrl: DEFAULT_AVATAR,
      pinnedToAppIcon: true,
      createdBy: 'System',
      createdAt: new Date().toISOString(),
    },
  ];
  private memStudioNotes: StoredStudioNoteFile[] = [];
  private memEnvVault: StoredEnvVaultEntry[] = [];
  private memAnnouncements: StoredAnnouncement[] = [];
  private memSeeded = false;
  private persistInFlight: Promise<void> | null = null;
  private persistQueued = false;

  constructor() {
    this.readyPromise = this.init();
  }

  public get storageMode(): 'postgres' | 'memory' {
    return this.usePostgres ? 'postgres' : 'memory';
  }

  public get storageStatus(): 'postgres_connected' | 'no_database_url' | 'auth_failed' | 'connection_failed' {
    return this._storageStatus;
  }

  public getPoolStats(): {
    enabled: boolean;
    source: 'pooler_url' | 'database_url' | 'none';
    max: number;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      enabled: this.usePostgres && Boolean(this.pool),
      source: this.poolSource,
      max: this.poolMax,
      totalCount: this.pool?.totalCount ?? 0,
      idleCount: this.pool?.idleCount ?? 0,
      waitingCount: this.pool?.waitingCount ?? 0,
    };
  }

  public async ready(): Promise<void> {
    await this.readyPromise;
  }

  private loadMemoryFromDisk(): boolean {
    try {
      if (!fs.existsSync(LOCAL_DATA_FILE)) return false;
      const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
      if (!raw.trim()) return false;
      const data = JSON.parse(raw) as Record<string, unknown>;
      if (Array.isArray(data.users)) this.memUsers = data.users as StoredUser[];
      if (Array.isArray(data.posts)) this.memPosts = data.posts as StoredPost[];
      if (Array.isArray(data.messages)) this.memMessages = data.messages as StoredMessage[];
      if (Array.isArray(data.ledger)) this.memLedger = data.ledger as StoredLedgerRow[];
      if (Array.isArray(data.knowledge)) this.memKnowledge = data.knowledge as StoredKnowledgeQA[];
      if (data.settings && typeof data.settings === 'object') {
        this.memSettings = { ...DEFAULT_SETTINGS, ...(data.settings as Partial<StoredPricesSettings>) };
      }
      if (data.newsfeedConfig && typeof data.newsfeedConfig === 'object') {
        this.memNewsfeedConfig = {
          ...DEFAULT_NEWSFEED_CONFIG,
          ...(data.newsfeedConfig as Partial<StoredNewsfeedConfig>),
        };
      }
      if (Array.isArray(data.pushSubs)) this.memPushSubs = data.pushSubs as StoredPushSubscription[];
      if (data.vapidKeys && typeof data.vapidKeys === 'object') {
        this.memVapidKeys = data.vapidKeys as VapidKeyPair;
      }
      if (Array.isArray(data.locations)) {
        this.memLocations = data.locations as typeof this.memLocations;
      }
      if (data.locationTrails && typeof data.locationTrails === 'object') {
        this.locationTrails = new Map(
          Object.entries(data.locationTrails as Record<string, Array<{ lat: number; lng: number; ts: string }>>)
        );
      }
      if (Array.isArray(data.emojiLinks) && data.emojiLinks.length > 0) {
        this.memEmojiLinks = data.emojiLinks as StoredEmojiLink[];
      }
      if (Array.isArray(data.studioNotes)) this.memStudioNotes = data.studioNotes as StoredStudioNoteFile[];
      if (Array.isArray(data.envVault)) this.memEnvVault = data.envVault as StoredEnvVaultEntry[];
      if (Array.isArray(data.announcements)) this.memAnnouncements = data.announcements as StoredAnnouncement[];
      this.memSeeded = true;
      console.log(
        `[ChoyStore] Loaded persistent local store (${this.memUsers.length} users, ${this.memPosts.length} posts, ${this.memMessages.length} messages).`
      );
      return true;
    } catch (err) {
      console.error('[ChoyStore] Failed to load local JSON store:', err instanceof Error ? err.message : err);
      return false;
    }
  }

  private async persistMemory(): Promise<void> {
    if (this.usePostgres) return;
    if (this.persistInFlight) {
      this.persistQueued = true;
      await this.persistInFlight;
      if (this.persistQueued) {
        this.persistQueued = false;
        return this.persistMemory();
      }
      return;
    }
    const run = async () => {
      try {
        const trailsObj: Record<string, Array<{ lat: number; lng: number; ts: string }>> = {};
        for (const [uid, pts] of this.locationTrails.entries()) {
          trailsObj[uid] = pts;
        }
        const payload = {
          version: 1,
          sessionKey: SESSION_SIGNING_KEY,
          users: this.memUsers,
          posts: this.memPosts,
          messages: this.memMessages,
          ledger: this.memLedger,
          knowledge: this.memKnowledge,
          settings: this.memSettings,
          newsfeedConfig: this.memNewsfeedConfig,
          pushSubs: this.memPushSubs,
          vapidKeys: this.memVapidKeys,
          locations: this.memLocations,
          locationTrails: trailsObj,
          emojiLinks: this.memEmojiLinks,
          studioNotes: this.memStudioNotes,
          envVault: this.memEnvVault,
          announcements: this.memAnnouncements,
        };
        const tmpPath = `${LOCAL_DATA_FILE}.tmp.${process.pid}`;
        await fs.promises.writeFile(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
        await fs.promises.rename(tmpPath, LOCAL_DATA_FILE);
      } catch (err) {
        console.error('[ChoyStore] Failed to persist local JSON store:', err instanceof Error ? err.message : err);
      }
    };
    this.persistInFlight = run().finally(() => {
      this.persistInFlight = null;
    });
    await this.persistInFlight;
    if (this.persistQueued) {
      this.persistQueued = false;
      await this.persistMemory();
    }
  }

  private stripEnvQuotes(raw: string | undefined): string {
    const trimmed = (raw || '').trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1).trim();
    }
    return trimmed;
  }

  private async init(): Promise<void> {
    const poolerUrl = this.stripEnvQuotes(process.env.DATABASE_POOL_URL);
    const directUrl = this.stripEnvQuotes(process.env.DATABASE_URL);
    const candidates: Array<{ url: string; source: 'pooler_url' | 'database_url' }> = [];
    if (poolerUrl) candidates.push({ url: poolerUrl, source: 'pooler_url' });
    if (directUrl && directUrl !== poolerUrl) candidates.push({ url: directUrl, source: 'database_url' });

    if (candidates.length > 0) {
      for (const candidate of candidates) {
        try {
          const isLocal = candidate.url.includes('localhost') || candidate.url.includes('127.0.0.1');
          const pool = new Pool({
            connectionString: candidate.url,
            ssl: isLocal ? false : { rejectUnauthorized: false },
            max: this.poolMax,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
          });
          pool.on('error', (err) => {
            console.error(
              '[ChoyStore] Idle PostgreSQL pool client error:',
              err instanceof Error ? err.message : err
            );
          });
          await pool.query('SELECT 1');
          this.pool = pool;
          this.poolSource = candidate.source;
          await this.createTables();
          await this.seedIfEmptyPostgres();
          this.usePostgres = true;
          this._storageStatus = 'postgres_connected';
          console.log(
            `[ChoyStore] Connected to PostgreSQL cloud database (pool max=${this.poolMax}, source=${candidate.source}).`
          );
          return;
        } catch (err) {
          const msg = err instanceof Error ? err.message.toLowerCase() : '';
          this._storageStatus =
            msg.includes('password') || msg.includes('authentication') || msg.includes('28p01')
              ? 'auth_failed'
              : 'connection_failed';
          console.error(
            `[ChoyStore] PostgreSQL connection (${candidate.source}) failed:`,
            err instanceof Error ? err.message : err
          );
          this.pool = null;
          this.poolSource = 'none';
          this.usePostgres = false;
        }
      }
      console.error('[ChoyStore] All PostgreSQL URLs failed, falling back to local disk store.');
    } else {
      this._storageStatus = 'no_database_url';
    }
    const loaded = this.loadMemoryFromDisk();
    if (!loaded) {
      this.seedMemory();
      await this.persistMemory();
    }
    console.log('[ChoyStore] Running with persistent local disk fallback (.choychat-data.json).');
  }

  private async createTables(): Promise<void> {
    if (!this.pool) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        pin_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        status TEXT NOT NULL DEFAULT 'approved',
        blocked_users JSONB NOT NULL DEFAULT '[]'::jsonb,
        avatar_url TEXT,
        newsfeed TEXT NOT NULL DEFAULT 'feed_a',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS newsfeed TEXT NOT NULL DEFAULT 'feed_a';
      CREATE TABLE IF NOT EXISTS app_posts (
        id TEXT PRIMARY KEY,
        author_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_handle TEXT NOT NULL,
        author_avatar TEXT NOT NULL,
        content TEXT NOT NULL,
        media_url TEXT,
        media_type TEXT NOT NULL DEFAULT 'text',
        category TEXT NOT NULL DEFAULT 'feed',
        newsfeed TEXT NOT NULL DEFAULT 'both',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS newsfeed TEXT NOT NULL DEFAULT 'both';
      CREATE TABLE IF NOT EXISTS app_messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        room_id TEXT NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        media_url TEXT,
        media_type TEXT NOT NULL DEFAULT 'text',
        transcript TEXT,
        reactions JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE app_messages ADD COLUMN IF NOT EXISTS transcript TEXT;
      CREATE TABLE IF NOT EXISTS app_ledger (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        five_h DOUBLE PRECISION NOT NULL DEFAULT 0,
        five_h_type TEXT NOT NULL DEFAULT 'blue',
        bulig DOUBLE PRECISION NOT NULL DEFAULT 0,
        point5 DOUBLE PRECISION NOT NULL DEFAULT 0,
        half_sack DOUBLE PRECISION NOT NULL DEFAULT 0,
        one_sack DOUBLE PRECISION NOT NULL DEFAULT 0,
        bal DOUBLE PRECISION NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS app_knowledge (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS app_settings (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS app_push_subscriptions (
        endpoint TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_push_subs_user_name ON app_push_subscriptions (LOWER(user_name));
      CREATE TABLE IF NOT EXISTS app_user_locations (
        user_id TEXT PRIMARY KEY,
        user_name TEXT NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        accuracy DOUBLE PRECISION,
        speed DOUBLE PRECISION,
        heading DOUBLE PRECISION,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE app_user_locations ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION;
      ALTER TABLE app_user_locations ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION;
      CREATE TABLE IF NOT EXISTS app_emoji_links (
        id TEXT PRIMARY KEY,
        emoji_code TEXT NOT NULL,
        target_url TEXT NOT NULL,
        title TEXT NOT NULL,
        icon_url TEXT NOT NULL,
        pinned_to_app_icon BOOLEAN NOT NULL DEFAULT false,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS app_studio_notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'App Features',
        entries JSONB NOT NULL DEFAULT '[]'::jsonb,
        organized_prompt TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS app_env_vault (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL DEFAULT 'Auth & App URL',
        key_name TEXT NOT NULL,
        value TEXT NOT NULL DEFAULT '',
        secret BOOLEAN NOT NULL DEFAULT false,
        notes TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS app_announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        badge TEXT NOT NULL DEFAULT 'announcement',
        tone TEXT NOT NULL DEFAULT 'emerald',
        target TEXT NOT NULL DEFAULT 'all',
        active BOOLEAN NOT NULL DEFAULT true,
        created_by TEXT NOT NULL DEFAULT 'Admin',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  private async seedIfEmptyPostgres(): Promise<void> {
    if (!this.pool) return;
    const settingsRes = await this.pool.query('SELECT id FROM app_settings WHERE id = $1', ['prices']);
    if (settingsRes.rowCount && settingsRes.rowCount > 0) return;

    await this.pool.query(
      'INSERT INTO app_settings (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING',
      ['prices', JSON.stringify(DEFAULT_SETTINGS)]
    );

    // Ensure all existing member accounts are active (no admin approval gate required)
    await this.pool.query(
      `UPDATE app_users SET status = 'approved', updated_at = NOW() WHERE status != 'approved'`
    );

    await this.pool.query(
      `INSERT INTO app_posts (id, author_id, author_name, author_handle, author_avatar, content, media_url, media_type, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
      [
        'p_welcome',
        'system',
        'Choy Chat Official',
        '@choychat',
        DEFAULT_AVATAR,
        'Welcome to Choy Chat! Live cross-device database sync is active.',
        DEFAULT_AVATAR,
        'image',
        'feed',
      ]
    );

    await this.pool.query(
      `INSERT INTO app_messages (id, sender_id, sender_name, room_id, text, media_url, media_type, reactions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb) ON CONFLICT (id) DO NOTHING`,
      [
        'm_welcome',
        'system',
        'Choy Admin',
        'VIP Group',
        'Welcome to VIP Group! Messages sync across all devices in real time.',
        null,
        'text',
        JSON.stringify(['❤️', '👍']),
      ]
    );

    await this.pool.query(
      `INSERT INTO app_messages (id, sender_id, sender_name, room_id, text, media_url, media_type, reactions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb) ON CONFLICT (id) DO NOTHING`,
      [
        'm_welcome_vid',
        'system',
        'Choy Admin',
        'VIP Group',
        'Shared group video clip (tap Play with Sound).',
        'https://www.w3schools.com/html/mov_bbb.mp4',
        'video',
        JSON.stringify(['🔥']),
      ]
    );

    await this.pool.query(
      `INSERT INTO app_knowledge (id, question, answer)
       VALUES ($1, $2, $3), ($4, $5, $6) ON CONFLICT (id) DO NOTHING`,
      [
        'k_1',
        'What is Choy Chat?',
        'Choy Chat is a real-time cloud-synced social media, video gallery, and milestone ledger platform.',
        'k_2',
        'How does the ledger work?',
        'The Milestone Ledger tracks 5H, Bulig, Point 5, Half Sack, and One Sack quantities with live cross-device sync.',
      ]
    );

    await this.pool.query(
      `INSERT INTO app_ledger (id, name, five_h, five_h_type, bulig, point5, half_sack, one_sack, bal)
       VALUES ($1, $2, 5, 'blue', 3, 2, 4, 2, 500), ($3, $4, 4, 'red', 5, 3, 2, 3, -200)
       ON CONFLICT (id) DO NOTHING`,
      ['l_1', 'Choy Admin', 'l_2', 'Maria Vibe']
    );
  }

  private seedMemory(): void {
    if (this.memSeeded) return;
    this.memSeeded = true;
    const now = new Date().toISOString();
    this.memPosts = [
      {
        id: 'p_welcome',
        authorId: 'system',
        authorName: 'Choy Chat Official',
        authorHandle: '@choychat',
        authorAvatar: DEFAULT_AVATAR,
        content: 'Welcome to Choy Chat! Live cross-device database sync is active.',
        mediaUrl: DEFAULT_AVATAR,
        mediaType: 'image',
        category: 'feed',
        newsfeed: 'both',
        createdAt: now,
      },
    ];
    this.memMessages = [
      {
        id: 'm_welcome',
        senderId: 'system',
        senderName: 'Choy Admin',
        roomId: 'VIP Group',
        text: 'Welcome to VIP Group! Messages sync across all devices in real time.',
        mediaType: 'text',
        reactions: ['❤️', '👍'],
        createdAt: now,
      },
      {
        id: 'm_welcome_vid',
        senderId: 'system',
        senderName: 'Choy Admin',
        roomId: 'VIP Group',
        text: 'Shared group video clip (tap Play with Sound).',
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        mediaType: 'video',
        reactions: ['🔥'],
        createdAt: now,
      },
    ];
    this.memKnowledge = [
      {
        id: 'k_1',
        question: 'What is Choy Chat?',
        answer: 'Choy Chat is a real-time cloud-synced social media, video gallery, and milestone ledger platform.',
        createdAt: now,
      },
      {
        id: 'k_2',
        question: 'How does the ledger work?',
        answer: 'The Milestone Ledger tracks 5H, Bulig, Point 5, Half Sack, and One Sack quantities with live cross-device sync.',
        createdAt: now,
      },
    ];
    this.memLedger = [
      { id: 'l_1', name: 'Choy Admin', fiveH: 5, fiveHType: 'blue', bulig: 3, point5: 2, halfSack: 4, oneSack: 2, bal: 500, updatedAt: now },
      { id: 'l_2', name: 'Maria Vibe', fiveH: 4, fiveHType: 'red', bulig: 5, point5: 3, halfSack: 2, oneSack: 3, bal: -200, updatedAt: now },
    ];
  }

  // ---- AUTH & USERS ----
  public hasEnvAdminConfigured(): boolean {
    return Boolean((process.env.ADMIN_PIN || '').trim());
  }

  public async hasAnyAdmin(): Promise<boolean> {
    await this.ready();
    if (this.hasEnvAdminConfigured()) return true;
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT id FROM app_users WHERE role = $1 LIMIT 1', ['admin']);
      return Boolean(res.rowCount && res.rowCount > 0);
    }
    return this.memUsers.some((u) => u.role === 'admin');
  }

  public async getUserById(id: string): Promise<StoredUser | null> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM app_users WHERE id = $1 LIMIT 1', [id]);
      if (!res.rowCount) return null;
      return this.mapUserRow(res.rows[0]);
    }
    return this.memUsers.find((u) => u.id === id) || null;
  }

  public async getUserByPhone(phone: string): Promise<StoredUser | null> {
    await this.ready();
    const norm = normalizePhone(phone);
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query(
        'SELECT * FROM app_users WHERE phone = $1 OR phone = $2 LIMIT 1',
        [norm, phone.trim()]
      );
      if (!res.rowCount) return null;
      return this.mapUserRow(res.rows[0]);
    }
    return (
      this.memUsers.find((u) => normalizePhone(u.phone) === norm || u.phone === phone.trim()) || null
    );
  }

  public async ensureEnvAdminUser(phone: string): Promise<StoredUser> {
    await this.ready();
    const normPhone = normalizePhone(phone);
    const existing = await this.getUserByPhone(normPhone);
    if (existing) {
      if (existing.role !== 'admin' || existing.status !== 'approved') {
        if (this.usePostgres && this.pool) {
          await this.pool.query(
            'UPDATE app_users SET role = $1, status = $2, updated_at = NOW() WHERE id = $3',
            ['admin', 'approved', existing.id]
          );
        } else {
          existing.role = 'admin';
          existing.status = 'approved';
          existing.updatedAt = new Date().toISOString();
          await this.persistMemory();
        }
      }
      return (await this.getUserById(existing.id))!;
    }
    const id = 'admin_' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();
    const user: StoredUser = {
      id,
      name: 'Choy Admin',
      phone: normPhone,
      pinHash: hashPin(crypto.randomBytes(16).toString('hex')),
      role: 'admin',
      status: 'approved',
      blockedUsers: [],
      newsfeed: 'feed_a',
      createdAt: now,
      updatedAt: now,
    };
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_users (id, name, phone, pin_hash, role, status, blocked_users, newsfeed)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
        [user.id, user.name, user.phone, user.pinHash, user.role, user.status, JSON.stringify(user.blockedUsers), user.newsfeed]
      );
    } else {
      this.memUsers.push(user);
      await this.persistMemory();
    }
    return user;
  }

  public async createUser(params: {
    name: string;
    phone: string;
    pin: string;
    role: 'admin' | 'member';
    status: 'pending' | 'approved';
    newsfeed?: SelectableNewsfeedChannel;
  }): Promise<StoredUser> {
    await this.ready();
    const id = (params.role === 'admin' ? 'admin_' : 'u_') + crypto.randomUUID().slice(0, 10);
    const now = new Date().toISOString();
    const newsfeed = normalizeUserNewsfeed(params.newsfeed);
    const user: StoredUser = {
      id,
      name: params.name.slice(0, 80),
      phone: normalizePhone(params.phone).slice(0, 40),
      pinHash: hashPin(params.pin),
      role: params.role,
      status: params.status,
      blockedUsers: [],
      newsfeed,
      createdAt: now,
      updatedAt: now,
    };
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_users (id, name, phone, pin_hash, role, status, blocked_users, newsfeed)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
        [user.id, user.name, user.phone, user.pinHash, user.role, user.status, JSON.stringify(user.blockedUsers), user.newsfeed]
      );
    } else {
      this.memUsers.push(user);
      await this.persistMemory();
    }
    return user;
  }

  public async updateUserNewsfeed(userId: string, newsfeed: unknown): Promise<StoredUser | null> {
    await this.ready();
    const clean = normalizeUserNewsfeed(newsfeed);
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query(
        'UPDATE app_users SET newsfeed = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [clean, userId]
      );
      if (res.rows.length === 0) return null;
      return this.mapUserRow(res.rows[0]);
    }
    const found = this.memUsers.find((u) => u.id === userId);
    if (!found) return null;
    found.newsfeed = clean;
    found.updatedAt = new Date().toISOString();
    await this.persistMemory();
    return found;
  }

  public async updateUserPin(userId: string, newPin: string): Promise<StoredUser | null> {
    await this.ready();
    const nextHash = hashPin(newPin);
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query(
        'UPDATE app_users SET pin_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [nextHash, userId]
      );
      if (res.rows.length === 0) return null;
      return this.mapUserRow(res.rows[0]);
    }
    const found = this.memUsers.find((u) => u.id === userId);
    if (!found) return null;
    found.pinHash = nextHash;
    found.updatedAt = new Date().toISOString();
    await this.persistMemory();
    return found;
  }

  public async listUsers(includePhone: boolean): Promise<PublicUserDTO[]> {
    await this.ready();
    let rows: StoredUser[];
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM app_users ORDER BY created_at DESC');
      rows = res.rows.map((r) => this.mapUserRow(r));
    } else {
      rows = [...this.memUsers];
    }
    return rows.map((u) => ({
      id: u.id,
      name: u.name,
      phone: includePhone ? u.phone : 'Member',
      role: u.role,
      status: u.status,
      avatar: u.avatar,
      newsfeed: normalizeUserNewsfeed(u.newsfeed),
      loginDate: u.updatedAt.slice(0, 16).replace('T', ' '),
    }));
  }

  public async updateUserAvatar(userId: string, avatarUrl?: string): Promise<StoredUser | null> {
    await this.ready();
    const cleanAvatar = typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : undefined;
    const postAvatar = cleanAvatar || '/assets/aistudio/image_20261121_145253_f477cbfa.webp';

    if (this.usePostgres && this.pool) {
      const res = await this.pool.query(
        'UPDATE app_users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [cleanAvatar ?? null, userId]
      );
      if (res.rows.length === 0) return null;
      await this.pool.query('UPDATE app_posts SET author_avatar = $1 WHERE author_id = $2', [postAvatar, userId]);
      return this.mapUserRow(res.rows[0]);
    }

    const found = this.memUsers.find((u) => u.id === userId);
    if (!found) return null;
    found.avatar = cleanAvatar;
    found.updatedAt = new Date().toISOString();
    for (const p of this.memPosts) {
      if (p.authorId === userId) {
        p.authorAvatar = postAvatar;
      }
    }
    await this.persistMemory();
    return found;
  }

  public async updateUserName(
    userId: string,
    newName: string
  ): Promise<
    | { ok: true; user: StoredUser; previousName: string }
    | { ok: false; code: 'not_found' | 'conflict'; error: string }
  > {
    await this.ready();
    const cleanName = newName.trim().slice(0, 60);
    const cleanLower = cleanName.toLowerCase();
    const nextHandle = `@${cleanLower.replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'member'}`;

    if (this.usePostgres && this.pool) {
      const existingRes = await this.pool.query('SELECT * FROM app_users WHERE id = $1 LIMIT 1', [userId]);
      if (existingRes.rows.length === 0) {
        return { ok: false, code: 'not_found', error: 'Account not found' };
      }
      const current = this.mapUserRow(existingRes.rows[0]);
      const previousName = current.name;

      const conflictRes = await this.pool.query(
        'SELECT id FROM app_users WHERE id <> $1 AND LOWER(TRIM(name)) = $2 LIMIT 1',
        [userId, cleanLower]
      );
      if (conflictRes.rows.length > 0) {
        return { ok: false, code: 'conflict', error: 'That name is already used by another account.' };
      }

      const updatedRes = await this.pool.query(
        'UPDATE app_users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [cleanName, userId]
      );
      const updatedUser = this.mapUserRow(updatedRes.rows[0]);

      await this.pool.query(
        'UPDATE app_posts SET author_name = $1, author_handle = $2 WHERE author_id = $3',
        [cleanName, nextHandle, userId]
      );
      await this.pool.query('UPDATE app_messages SET sender_name = $1 WHERE sender_id = $2', [
        cleanName,
        userId,
      ]);
      if (previousName.trim().toLowerCase() !== 'vip group') {
        await this.pool.query(
          'UPDATE app_messages SET room_id = $1 WHERE LOWER(TRIM(room_id)) = $2',
          [cleanName, previousName.trim().toLowerCase()]
        );
      }
      await this.pool.query(
        'UPDATE app_push_subscriptions SET user_name = $1, updated_at = NOW() WHERE user_id = $2',
        [cleanName, userId]
      );
      return { ok: true, user: updatedUser, previousName };
    }

    const found = this.memUsers.find((u) => u.id === userId);
    if (!found) {
      return { ok: false, code: 'not_found', error: 'Account not found' };
    }
    const conflict = this.memUsers.find(
      (u) => u.id !== userId && u.name.trim().toLowerCase() === cleanLower
    );
    if (conflict) {
      return { ok: false, code: 'conflict', error: 'That name is already used by another account.' };
    }
    const previousName = found.name;
    const prevLower = previousName.trim().toLowerCase();
    found.name = cleanName;
    found.updatedAt = new Date().toISOString();

    for (const p of this.memPosts) {
      if (p.authorId === userId) {
        p.authorName = cleanName;
        p.authorHandle = nextHandle;
      }
    }
    for (const m of this.memMessages) {
      if (m.senderId === userId) {
        m.senderName = cleanName;
      }
      if (prevLower !== 'vip group' && m.roomId.trim().toLowerCase() === prevLower) {
        m.roomId = cleanName;
      }
    }
    for (const s of this.memPushSubs) {
      if (s.userId === userId) {
        s.userName = cleanName;
        s.updatedAt = found.updatedAt;
      }
    }
    await this.persistMemory();
    return { ok: true, user: found, previousName };
  }

  public async updateUserStatus(userId: string, status: 'pending' | 'approved'): Promise<boolean> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      if (status === 'pending') {
        const res = await this.pool.query(
          `UPDATE app_users SET status = $1, updated_at = NOW() WHERE id = $2 AND role != 'admin'`,
          [status, userId]
        );
        return Boolean(res.rowCount && res.rowCount > 0);
      }
      const res = await this.pool.query(
        'UPDATE app_users SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, userId]
      );
      return Boolean(res.rowCount && res.rowCount > 0);
    }
    const found = this.memUsers.find((u) => u.id === userId);
    if (!found) return false;
    if (status === 'pending' && found.role === 'admin') return false;
    found.status = status;
    found.updatedAt = new Date().toISOString();
    await this.persistMemory();
    return true;
  }

  public async approveAllPendingUsers(): Promise<number> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query(
        `UPDATE app_users SET status = 'approved', updated_at = NOW() WHERE status != 'approved'`
      );
      return res.rowCount || 0;
    }
    let count = 0;
    const now = new Date().toISOString();
    for (const u of this.memUsers) {
      if (u.status !== 'approved') {
        u.status = 'approved';
        u.updatedAt = now;
        count += 1;
      }
    }
    if (count > 0) await this.persistMemory();
    return count;
  }

  public async deleteUser(userId: string): Promise<boolean> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('DELETE FROM app_users WHERE id = $1 AND role != $2', [userId, 'admin']);
      return Boolean(res.rowCount && res.rowCount > 0);
    }
    const before = this.memUsers.length;
    this.memUsers = this.memUsers.filter((u) => !(u.id === userId && u.role !== 'admin'));
    const deleted = this.memUsers.length < before;
    if (deleted) await this.persistMemory();
    return deleted;
  }

  public async updateBlockedUsers(userId: string, blockedUsers: string[]): Promise<string[]> {
    await this.ready();
    const clean = blockedUsers
      .filter((v) => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim().slice(0, 80))
      .slice(0, 100);
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        'UPDATE app_users SET blocked_users = $1::jsonb, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(clean), userId]
      );
    } else {
      const found = this.memUsers.find((u) => u.id === userId);
      if (found) {
        found.blockedUsers = clean;
        found.updatedAt = new Date().toISOString();
        await this.persistMemory();
      }
    }
    return clean;
  }

  // ---- POSTS ----
  public async listPosts(): Promise<StoredPost[]> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM app_posts ORDER BY created_at DESC LIMIT 200');
      return res.rows.map((r) => ({
        id: r.id,
        authorId: r.author_id,
        authorName: r.author_name,
        authorHandle: r.author_handle,
        authorAvatar: r.author_avatar,
        content: r.content,
        mediaUrl: r.media_url || undefined,
        mediaType: r.media_type,
        category: r.category,
        newsfeed: normalizePostNewsfeed(r.newsfeed),
        createdAt: new Date(r.created_at).toISOString(),
      }));
    }
    return [...this.memPosts]
      .map((p) => ({
        ...p,
        newsfeed: normalizePostNewsfeed(p.newsfeed),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async createPost(post: Omit<StoredPost, 'id' | 'createdAt'>): Promise<StoredPost> {
    await this.ready();
    const nf = normalizePostNewsfeed(post.newsfeed);
    const item: StoredPost = {
      ...post,
      newsfeed: nf,
      id: 'p_' + crypto.randomUUID().slice(0, 12),
      createdAt: new Date().toISOString(),
    };
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_posts (id, author_id, author_name, author_handle, author_avatar, content, media_url, media_type, category, newsfeed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          item.id,
          item.authorId,
          item.authorName,
          item.authorHandle,
          item.authorAvatar,
          item.content,
          item.mediaUrl || null,
          item.mediaType,
          item.category,
          item.newsfeed,
        ]
      );
    } else {
      this.memPosts.unshift(item);
      await this.persistMemory();
    }
    return item;
  }

  public async deletePost(postId: string, requesterId: string, isAdmin: boolean): Promise<boolean> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = isAdmin
        ? await this.pool.query('DELETE FROM app_posts WHERE id = $1', [postId])
        : await this.pool.query('DELETE FROM app_posts WHERE id = $1 AND author_id = $2', [postId, requesterId]);
      return Boolean(res.rowCount && res.rowCount > 0);
    }
    const idx = this.memPosts.findIndex((p) => p.id === postId && (isAdmin || p.authorId === requesterId));
    if (idx === -1) return false;
    this.memPosts.splice(idx, 1);
    await this.persistMemory();
    return true;
  }

  // ---- MESSAGES ----
  public async listMessages(): Promise<StoredMessage[]> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM app_messages ORDER BY created_at ASC LIMIT 500');
      return res.rows.map((r) => ({
        id: r.id,
        senderId: r.sender_id,
        senderName: r.sender_name,
        roomId: r.room_id,
        text: r.text || '',
        mediaUrl: r.media_url || undefined,
        mediaType: r.media_type,
        transcript: r.transcript || undefined,
        reactions: Array.isArray(r.reactions) ? r.reactions : [],
        createdAt: new Date(r.created_at).toISOString(),
      }));
    }
    return [...this.memMessages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public async createMessage(msg: Omit<StoredMessage, 'id' | 'createdAt' | 'reactions'>): Promise<StoredMessage> {
    await this.ready();
    const item: StoredMessage = {
      ...msg,
      id: 'm_' + crypto.randomUUID().slice(0, 12),
      reactions: [],
      createdAt: new Date().toISOString(),
    };
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_messages (id, sender_id, sender_name, room_id, text, media_url, media_type, transcript, reactions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [
          item.id,
          item.senderId,
          item.senderName,
          item.roomId,
          item.text,
          item.mediaUrl || null,
          item.mediaType,
          item.transcript || null,
          JSON.stringify(item.reactions),
        ]
      );
    } else {
      this.memMessages.push(item);
      await this.persistMemory();
    }
    return item;
  }

  public async deleteMessage(messageId: string, userId: string, isAdminUser: boolean): Promise<boolean> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const existing = await this.pool.query('SELECT * FROM app_messages WHERE id = $1 LIMIT 1', [messageId]);
      if (!existing.rowCount) return false;
      const row = existing.rows[0];
      if (!isAdminUser && row.sender_id !== userId) {
        return false;
      }
      await this.pool.query('DELETE FROM app_messages WHERE id = $1', [messageId]);
      return true;
    }
    const idx = this.memMessages.findIndex((m) => m.id === messageId);
    if (idx === -1) return false;
    const item = this.memMessages[idx];
    if (!isAdminUser && item.senderId !== userId) {
      return false;
    }
    this.memMessages.splice(idx, 1);
    await this.persistMemory();
    return true;
  }

  // ---- LEDGER & LEADERBOARD ----
  public async listLedger(): Promise<StoredLedgerRow[]> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM app_ledger ORDER BY name ASC');
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        fiveH: Number(r.five_h) || 0,
        fiveHType: r.five_h_type === 'red' ? 'red' : 'blue',
        bulig: Number(r.bulig) || 0,
        point5: Number(r.point5) || 0,
        halfSack: Number(r.half_sack) || 0,
        oneSack: Number(r.one_sack) || 0,
        bal: Number(r.bal) || 0,
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
    }
    return [...this.memLedger].sort((a, b) => a.name.localeCompare(b.name));
  }

  public async getPublicLeaderboard(): Promise<{ id: string; name: string; total: number }[]> {
    const [rows, settings] = await Promise.all([this.listLedger(), this.getSettings()]);
    return rows
      .map((r) => ({ id: r.id, name: r.name, total: computeLedgerTotal(r, settings) }))
      .sort((a, b) => b.total - a.total);
  }

  public async createLedgerRow(name: string): Promise<StoredLedgerRow> {
    await this.ready();
    const settings = await this.getSettings();
    const row: StoredLedgerRow = {
      id: 'l_' + crypto.randomUUID().slice(0, 12),
      name: name.slice(0, 100),
      fiveH: settings.defFiveH,
      fiveHType: 'blue',
      bulig: settings.defBulig,
      point5: settings.defPoint5,
      halfSack: settings.defHalfSack,
      oneSack: settings.defOneSack,
      bal: 0,
      updatedAt: new Date().toISOString(),
    };
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_ledger (id, name, five_h, five_h_type, bulig, point5, half_sack, one_sack, bal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [row.id, row.name, row.fiveH, row.fiveHType, row.bulig, row.point5, row.halfSack, row.oneSack, row.bal]
      );
    } else {
      this.memLedger.push(row);
      await this.persistMemory();
    }
    return row;
  }

  public async updateLedgerRow(
    id: string,
    patch: Partial<Omit<StoredLedgerRow, 'id' | 'name' | 'updatedAt'>>
  ): Promise<StoredLedgerRow | null> {
    await this.ready();
    const rows = await this.listLedger();
    const current = rows.find((r) => r.id === id);
    if (!current) return null;
    const updated: StoredLedgerRow = {
      ...current,
      fiveH: clampNum(patch.fiveH ?? current.fiveH, -1000000, 1000000),
      fiveHType: patch.fiveHType === 'red' ? 'red' : patch.fiveHType === 'blue' ? 'blue' : current.fiveHType,
      bulig: clampNum(patch.bulig ?? current.bulig, -1000000, 1000000),
      point5: clampNum(patch.point5 ?? current.point5, -1000000, 1000000),
      halfSack: clampNum(patch.halfSack ?? current.halfSack, -1000000, 1000000),
      oneSack: clampNum(patch.oneSack ?? current.oneSack, -1000000, 1000000),
      bal: clampNum(patch.bal ?? current.bal, -100000000, 100000000),
      updatedAt: new Date().toISOString(),
    };
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `UPDATE app_ledger
         SET five_h = $1, five_h_type = $2, bulig = $3, point5 = $4, half_sack = $5, one_sack = $6, bal = $7, updated_at = NOW()
         WHERE id = $8`,
        [
          updated.fiveH,
          updated.fiveHType,
          updated.bulig,
          updated.point5,
          updated.halfSack,
          updated.oneSack,
          updated.bal,
          updated.id,
        ]
      );
    } else {
      this.memLedger = this.memLedger.map((r) => (r.id === id ? updated : r));
      await this.persistMemory();
    }
    return updated;
  }

  public async applyDefaultQuantitiesToAll(defs: {
    defFiveH: number;
    defBulig: number;
    defPoint5: number;
    defHalfSack: number;
    defOneSack: number;
  }): Promise<void> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `UPDATE app_ledger
         SET five_h = $1, bulig = $2, point5 = $3, half_sack = $4, one_sack = $5, updated_at = NOW()`,
        [defs.defFiveH, defs.defBulig, defs.defPoint5, defs.defHalfSack, defs.defOneSack]
      );
    } else {
      const now = new Date().toISOString();
      this.memLedger = this.memLedger.map((r) => ({
        ...r,
        fiveH: defs.defFiveH,
        bulig: defs.defBulig,
        point5: defs.defPoint5,
        halfSack: defs.defHalfSack,
        oneSack: defs.defOneSack,
        updatedAt: now,
      }));
      await this.persistMemory();
    }
  }

  public async deleteLedgerRow(id: string): Promise<boolean> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('DELETE FROM app_ledger WHERE id = $1', [id]);
      return Boolean(res.rowCount && res.rowCount > 0);
    }
    const before = this.memLedger.length;
    this.memLedger = this.memLedger.filter((r) => r.id !== id);
    const deleted = this.memLedger.length < before;
    if (deleted) await this.persistMemory();
    return deleted;
  }

  // ---- KNOWLEDGE ----
  public async listKnowledge(): Promise<StoredKnowledgeQA[]> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM app_knowledge ORDER BY created_at DESC');
      return res.rows.map((r) => ({
        id: r.id,
        question: r.question,
        answer: r.answer,
        createdAt: new Date(r.created_at).toISOString(),
      }));
    }
    return [...this.memKnowledge];
  }

  public async createKnowledge(question: string, answer: string): Promise<StoredKnowledgeQA> {
    await this.ready();
    const item: StoredKnowledgeQA = {
      id: 'k_' + crypto.randomUUID().slice(0, 12),
      question: question.slice(0, 300),
      answer: answer.slice(0, 2000),
      createdAt: new Date().toISOString(),
    };
    if (this.usePostgres && this.pool) {
      await this.pool.query('INSERT INTO app_knowledge (id, question, answer) VALUES ($1, $2, $3)', [
        item.id,
        item.question,
        item.answer,
      ]);
    } else {
      this.memKnowledge.unshift(item);
      await this.persistMemory();
    }
    return item;
  }

  public async deleteKnowledge(id: string): Promise<boolean> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('DELETE FROM app_knowledge WHERE id = $1', [id]);
      return Boolean(res.rowCount && res.rowCount > 0);
    }
    const before = this.memKnowledge.length;
    this.memKnowledge = this.memKnowledge.filter((k) => k.id !== id);
    const deleted = this.memKnowledge.length < before;
    if (deleted) await this.persistMemory();
    return deleted;
  }

  // ---- SETTINGS ----
  public async getSettings(): Promise<StoredPricesSettings> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT data FROM app_settings WHERE id = $1 LIMIT 1', ['prices']);
      if (res.rowCount && res.rows[0]?.data) {
        return { ...DEFAULT_SETTINGS, ...res.rows[0].data };
      }
      return { ...DEFAULT_SETTINGS };
    }
    return { ...this.memSettings };
  }

  public async saveSettings(next: StoredPricesSettings): Promise<StoredPricesSettings> {
    await this.ready();
    const clean: StoredPricesSettings = {
      fiveH: clampNum(next.fiveH, 0, 1000000),
      bulig: clampNum(next.bulig, 0, 1000000),
      point5: clampNum(next.point5, 0, 1000000),
      halfSack: clampNum(next.halfSack, 0, 1000000),
      oneSack: clampNum(next.oneSack, 0, 1000000),
      defFiveH: clampNum(next.defFiveH, 0, 1000000),
      defBulig: clampNum(next.defBulig, 0, 1000000),
      defPoint5: clampNum(next.defPoint5, 0, 1000000),
      defHalfSack: clampNum(next.defHalfSack, 0, 1000000),
      defOneSack: clampNum(next.defOneSack, 0, 1000000),
    };
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_settings (id, data, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        ['prices', JSON.stringify(clean)]
      );
    } else {
      this.memSettings = clean;
      await this.persistMemory();
    }
    return clean;
  }

  public async getNewsfeedConfig(): Promise<StoredNewsfeedConfig> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT data FROM app_settings WHERE id = $1 LIMIT 1', ['newsfeed_config']);
      if (res.rowCount && res.rows[0]?.data) {
        const d = res.rows[0].data as Partial<StoredNewsfeedConfig>;
        return {
          feedATitle:
            typeof d.feedATitle === 'string' && d.feedATitle.trim()
              ? d.feedATitle.trim().slice(0, 60)
              : DEFAULT_NEWSFEED_CONFIG.feedATitle,
          feedBTitle:
            typeof d.feedBTitle === 'string' && d.feedBTitle.trim()
              ? d.feedBTitle.trim().slice(0, 60)
              : DEFAULT_NEWSFEED_CONFIG.feedBTitle,
          feedCTitle:
            typeof d.feedCTitle === 'string' && d.feedCTitle.trim()
              ? d.feedCTitle.trim().slice(0, 60)
              : DEFAULT_NEWSFEED_CONFIG.feedCTitle,
        };
      }
      return { ...DEFAULT_NEWSFEED_CONFIG };
    }
    return { ...this.memNewsfeedConfig };
  }

  public async saveNewsfeedConfig(next: Partial<StoredNewsfeedConfig>): Promise<StoredNewsfeedConfig> {
    await this.ready();
    const feedATitle =
      typeof next.feedATitle === 'string' && next.feedATitle.trim()
        ? next.feedATitle.trim().slice(0, 60)
        : DEFAULT_NEWSFEED_CONFIG.feedATitle;
    const feedBTitle =
      typeof next.feedBTitle === 'string' && next.feedBTitle.trim()
        ? next.feedBTitle.trim().slice(0, 60)
        : DEFAULT_NEWSFEED_CONFIG.feedBTitle;
    const feedCTitle =
      typeof next.feedCTitle === 'string' && next.feedCTitle.trim()
        ? next.feedCTitle.trim().slice(0, 60)
        : DEFAULT_NEWSFEED_CONFIG.feedCTitle;
    const clean: StoredNewsfeedConfig = { feedATitle, feedBTitle, feedCTitle };

    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_settings (id, data, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        ['newsfeed_config', JSON.stringify(clean)]
      );
    } else {
      this.memNewsfeedConfig = clean;
      await this.persistMemory();
    }
    return clean;
  }

  // ---- WEB PUSH VAPID KEYS & SUBSCRIPTIONS ----
  public async getOrCreateVapidKeys(generator: () => VapidKeyPair): Promise<VapidKeyPair> {
    await this.ready();
    const envPub = (process.env.VAPID_PUBLIC_KEY || '').trim();
    const envPriv = (process.env.VAPID_PRIVATE_KEY || '').trim();
    if (envPub && envPriv) {
      return { publicKey: envPub, privateKey: envPriv };
    }

    if (this.usePostgres && this.pool) {
      const existing = await this.pool.query('SELECT data FROM app_settings WHERE id = $1 LIMIT 1', ['vapid_keys']);
      if (existing.rowCount && existing.rows[0]?.data?.publicKey && existing.rows[0]?.data?.privateKey) {
        return {
          publicKey: String(existing.rows[0].data.publicKey),
          privateKey: String(existing.rows[0].data.privateKey),
        };
      }
      const generated = generator();
      await this.pool.query(
        `INSERT INTO app_settings (id, data, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id) DO NOTHING`,
        ['vapid_keys', JSON.stringify(generated)]
      );
      const reread = await this.pool.query('SELECT data FROM app_settings WHERE id = $1 LIMIT 1', ['vapid_keys']);
      if (reread.rowCount && reread.rows[0]?.data?.publicKey && reread.rows[0]?.data?.privateKey) {
        return {
          publicKey: String(reread.rows[0].data.publicKey),
          privateKey: String(reread.rows[0].data.privateKey),
        };
      }
      return generated;
    }

    if (!this.memVapidKeys) {
      this.memVapidKeys = generator();
      await this.persistMemory();
    }
    return this.memVapidKeys;
  }

  public async savePushSubscription(sub: {
    endpoint: string;
    userId: string;
    userName: string;
    keys: { p256dh: string; auth: string };
  }): Promise<StoredPushSubscription> {
    await this.ready();
    const now = new Date().toISOString();
    const clean: StoredPushSubscription = {
      endpoint: sub.endpoint.trim(),
      userId: sub.userId,
      userName: sub.userName.trim(),
      keys: {
        p256dh: sub.keys.p256dh.trim(),
        auth: sub.keys.auth.trim(),
      },
      updatedAt: now,
    };

    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_push_subscriptions (endpoint, user_id, user_name, p256dh, auth, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (endpoint) DO UPDATE
           SET user_id = EXCLUDED.user_id,
               user_name = EXCLUDED.user_name,
               p256dh = EXCLUDED.p256dh,
               auth = EXCLUDED.auth,
               updated_at = NOW()`,
        [clean.endpoint, clean.userId, clean.userName, clean.keys.p256dh, clean.keys.auth]
      );
      return clean;
    }

    this.memPushSubs = this.memPushSubs.filter((s) => s.endpoint !== clean.endpoint);
    this.memPushSubs.push(clean);
    await this.persistMemory();
    return clean;
  }

  public async removePushSubscription(endpoint: string): Promise<void> {
    await this.ready();
    const cleanEndpoint = endpoint.trim();
    if (!cleanEndpoint) return;
    if (this.usePostgres && this.pool) {
      await this.pool.query('DELETE FROM app_push_subscriptions WHERE endpoint = $1', [cleanEndpoint]);
      return;
    }
    this.memPushSubs = this.memPushSubs.filter((s) => s.endpoint !== cleanEndpoint);
    await this.persistMemory();
  }

  public async listPushSubscriptionsForTarget(
    targetName: string,
    excludeUserId: string
  ): Promise<StoredPushSubscription[]> {
    await this.ready();
    const normalized = targetName.trim().toLowerCase();
    const isGroup = normalized === 'vip group' || normalized === '';

    if (this.usePostgres && this.pool) {
      const res = isGroup
        ? await this.pool.query(
            `SELECT endpoint, user_id, user_name, p256dh, auth, updated_at
             FROM app_push_subscriptions
             WHERE user_id <> $1`,
            [excludeUserId]
          )
        : await this.pool.query(
            `SELECT endpoint, user_id, user_name, p256dh, auth, updated_at
             FROM app_push_subscriptions
             WHERE user_id <> $1 AND LOWER(TRIM(user_name)) = $2`,
            [excludeUserId, normalized]
          );
      return res.rows.map((r) => ({
        endpoint: String(r.endpoint),
        userId: String(r.user_id),
        userName: String(r.user_name),
        keys: { p256dh: String(r.p256dh), auth: String(r.auth) },
        updatedAt: new Date(String(r.updated_at)).toISOString(),
      }));
    }

    return this.memPushSubs.filter((s) => {
      if (s.userId === excludeUserId) return false;
      if (isGroup) return true;
      return s.userName.trim().toLowerCase() === normalized;
    });
  }

  private appendLocationTrail(userId: string, lat: number, lng: number, ts: string): void {
    const existing = this.locationTrails.get(userId) || [];
    const last = existing[existing.length - 1];
    if (last) {
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const dLat = toRad(lat - last.lat);
      const dLng = toRad(lng - last.lng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(last.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
      const distMeters = 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(a)));
      if (distMeters < 4) return;
    }
    const next = [...existing, { lat, lng, ts }].slice(-30);
    this.locationTrails.set(userId, next);
  }

  public async upsertLocation(
    userId: string,
    userName: string,
    lat: number,
    lng: number,
    accuracy?: number,
    speed?: number,
    heading?: number
  ): Promise<void> {
    await this.ready();
    const now = new Date().toISOString();
    this.appendLocationTrail(userId, lat, lng, now);
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_user_locations (user_id, user_name, lat, lng, accuracy, speed, heading, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET user_name = EXCLUDED.user_name,
               lat = EXCLUDED.lat,
               lng = EXCLUDED.lng,
               accuracy = EXCLUDED.accuracy,
               speed = EXCLUDED.speed,
               heading = EXCLUDED.heading,
               updated_at = NOW()`,
        [userId, userName, lat, lng, accuracy ?? null, speed ?? null, heading ?? null]
      );
      return;
    }
    this.memLocations = this.memLocations.filter((l) => l.userId !== userId);
    this.memLocations.push({ userId, userName, lat, lng, accuracy, speed, heading, updatedAt: now });
    await this.persistMemory();
  }

  public async getAllLocations(): Promise<
    Array<{
      userId: string;
      userName: string;
      lat: number;
      lng: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
      trail: Array<{ lat: number; lng: number; ts: string }>;
      updatedAt: string;
    }>
  > {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query(
        `SELECT user_id, user_name, lat, lng, accuracy, speed, heading, updated_at FROM app_user_locations ORDER BY updated_at DESC`
      );
      return res.rows.map((r) => {
        const userId = String(r.user_id);
        const lat = Number(r.lat);
        const lng = Number(r.lng);
        const updatedAt = new Date(String(r.updated_at)).toISOString();
        const trail = this.locationTrails.get(userId);
        return {
          userId,
          userName: String(r.user_name),
          lat,
          lng,
          accuracy: r.accuracy != null ? Number(r.accuracy) : undefined,
          speed: r.speed != null ? Number(r.speed) : undefined,
          heading: r.heading != null ? Number(r.heading) : undefined,
          trail: trail && trail.length > 0 ? trail : [{ lat, lng, ts: updatedAt }],
          updatedAt,
        };
      });
    }
    return this.memLocations
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((l) => ({
        ...l,
        trail: this.locationTrails.get(l.userId) || [{ lat: l.lat, lng: l.lng, ts: l.updatedAt }],
      }));
  }

  public async listEmojiLinks(): Promise<StoredEmojiLink[]> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query(
        `SELECT id, emoji_code, target_url, title, icon_url, pinned_to_app_icon, created_by, created_at
         FROM app_emoji_links
         ORDER BY pinned_to_app_icon DESC, created_at DESC`
      );
      return res.rows.map((r) => ({
        id: String(r.id),
        emojiCode: String(r.emoji_code),
        targetUrl: String(r.target_url),
        title: String(r.title),
        iconUrl: String(r.icon_url || DEFAULT_AVATAR),
        pinnedToAppIcon: Boolean(r.pinned_to_app_icon),
        createdBy: String(r.created_by || 'Admin'),
        createdAt: new Date(String(r.created_at)).toISOString(),
      }));
    }
    return [...this.memEmojiLinks].sort((a, b) => {
      if (a.pinnedToAppIcon !== b.pinnedToAppIcon) return a.pinnedToAppIcon ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  public async createEmojiLink(input: {
    emojiCode: string;
    targetUrl: string;
    title: string;
    iconUrl: string;
    pinnedToAppIcon: boolean;
    createdBy: string;
  }): Promise<StoredEmojiLink> {
    await this.ready();
    const id = 'el_' + crypto.randomUUID().slice(0, 12);
    const createdAt = new Date().toISOString();
    if (this.usePostgres && this.pool) {
      if (input.pinnedToAppIcon) {
        await this.pool.query('UPDATE app_emoji_links SET pinned_to_app_icon = false');
      }
      await this.pool.query(
        `INSERT INTO app_emoji_links (id, emoji_code, target_url, title, icon_url, pinned_to_app_icon, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          id,
          input.emojiCode,
          input.targetUrl,
          input.title,
          input.iconUrl,
          input.pinnedToAppIcon,
          input.createdBy,
        ]
      );
      return {
        id,
        emojiCode: input.emojiCode,
        targetUrl: input.targetUrl,
        title: input.title,
        iconUrl: input.iconUrl,
        pinnedToAppIcon: input.pinnedToAppIcon,
        createdBy: input.createdBy,
        createdAt,
      };
    }

    if (input.pinnedToAppIcon) {
      this.memEmojiLinks = this.memEmojiLinks.map((item) => ({ ...item, pinnedToAppIcon: false }));
    }
    const record: StoredEmojiLink = {
      id,
      emojiCode: input.emojiCode,
      targetUrl: input.targetUrl,
      title: input.title,
      iconUrl: input.iconUrl,
      pinnedToAppIcon: input.pinnedToAppIcon,
      createdBy: input.createdBy,
      createdAt,
    };
    this.memEmojiLinks.unshift(record);
    await this.persistMemory();
    return record;
  }

  public async pinEmojiLink(id: string): Promise<StoredEmojiLink | null> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const check = await this.pool.query('SELECT id FROM app_emoji_links WHERE id = $1 LIMIT 1', [id]);
      if (!check.rowCount) return null;
      await this.pool.query('UPDATE app_emoji_links SET pinned_to_app_icon = false');
      const res = await this.pool.query(
        `UPDATE app_emoji_links SET pinned_to_app_icon = true WHERE id = $1
         RETURNING id, emoji_code, target_url, title, icon_url, pinned_to_app_icon, created_by, created_at`,
        [id]
      );
      const r = res.rows[0];
      if (!r) return null;
      return {
        id: String(r.id),
        emojiCode: String(r.emoji_code),
        targetUrl: String(r.target_url),
        title: String(r.title),
        iconUrl: String(r.icon_url || DEFAULT_AVATAR),
        pinnedToAppIcon: Boolean(r.pinned_to_app_icon),
        createdBy: String(r.created_by || 'Admin'),
        createdAt: new Date(String(r.created_at)).toISOString(),
      };
    }

    const found = this.memEmojiLinks.find((item) => item.id === id);
    if (!found) return null;
    this.memEmojiLinks = this.memEmojiLinks.map((item) => ({
      ...item,
      pinnedToAppIcon: item.id === id,
    }));
    await this.persistMemory();
    return this.memEmojiLinks.find((item) => item.id === id) || null;
  }

  public async deleteEmojiLink(id: string): Promise<boolean> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('DELETE FROM app_emoji_links WHERE id = $1', [id]);
      return Boolean(res.rowCount && res.rowCount > 0);
    }
    const before = this.memEmojiLinks.length;
    this.memEmojiLinks = this.memEmojiLinks.filter((item) => item.id !== id);
    const deleted = this.memEmojiLinks.length < before;
    if (deleted) await this.persistMemory();
    return deleted;
  }

  public async resolveEmojiLink(emojiCode?: string): Promise<StoredEmojiLink | null> {
    const links = await this.listEmojiLinks();
    const clean = (emojiCode || '').trim();
    if (clean) {
      const matched = links.find((l) => l.emojiCode.trim() === clean || l.id === clean);
      if (matched) return matched;
    }
    return links.find((l) => l.pinnedToAppIcon) || links[0] || null;
  }

  public async listStudioNotes(): Promise<StoredStudioNoteFile[]> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query(
        `SELECT id, title, category, entries, organized_prompt, created_at, updated_at
         FROM app_studio_notes
         ORDER BY updated_at DESC`
      );
      return res.rows.map((r) => ({
        id: String(r.id),
        title: String(r.title),
        category: String(r.category || 'App Features'),
        entries: Array.isArray(r.entries) ? (r.entries as StudioNoteEntry[]) : [],
        organizedPrompt: String(r.organized_prompt || ''),
        createdAt: new Date(String(r.created_at)).toISOString(),
        updatedAt: new Date(String(r.updated_at)).toISOString(),
      }));
    }
    return [...this.memStudioNotes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public async getStudioNoteById(id: string): Promise<StoredStudioNoteFile | null> {
    const notes = await this.listStudioNotes();
    return notes.find((n) => n.id === id) || null;
  }

  public async createStudioNoteFile(input: {
    title: string;
    category: string;
    entries: StudioNoteEntry[];
    organizedPrompt: string;
  }): Promise<StoredStudioNoteFile> {
    await this.ready();
    const id = 'sn_' + crypto.randomUUID().slice(0, 12);
    const now = new Date().toISOString();
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_studio_notes (id, title, category, entries, organized_prompt, created_at, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), NOW())`,
        [id, input.title, input.category, JSON.stringify(input.entries), input.organizedPrompt]
      );
      return {
        id,
        title: input.title,
        category: input.category,
        entries: input.entries,
        organizedPrompt: input.organizedPrompt,
        createdAt: now,
        updatedAt: now,
      };
    }
    const created: StoredStudioNoteFile = {
      id,
      title: input.title,
      category: input.category,
      entries: input.entries,
      organizedPrompt: input.organizedPrompt,
      createdAt: now,
      updatedAt: now,
    };
    this.memStudioNotes.unshift(created);
    await this.persistMemory();
    return created;
  }

  public async updateStudioNoteFile(
    id: string,
    patch: {
      title?: string;
      category?: string;
      entries?: StudioNoteEntry[];
      organizedPrompt?: string;
    }
  ): Promise<StoredStudioNoteFile | null> {
    await this.ready();
    const existing = await this.getStudioNoteById(id);
    if (!existing) return null;
    const updated: StoredStudioNoteFile = {
      ...existing,
      title: patch.title !== undefined ? patch.title : existing.title,
      category: patch.category !== undefined ? patch.category : existing.category,
      entries: patch.entries !== undefined ? patch.entries : existing.entries,
      organizedPrompt: patch.organizedPrompt !== undefined ? patch.organizedPrompt : existing.organizedPrompt,
      updatedAt: new Date().toISOString(),
    };

    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `UPDATE app_studio_notes
         SET title = $2, category = $3, entries = $4::jsonb, organized_prompt = $5, updated_at = NOW()
         WHERE id = $1`,
        [id, updated.title, updated.category, JSON.stringify(updated.entries), updated.organizedPrompt]
      );
      return updated;
    }
    this.memStudioNotes = this.memStudioNotes.map((n) => (n.id === id ? updated : n));
    await this.persistMemory();
    return updated;
  }

  public async deleteStudioNoteFile(id: string): Promise<boolean> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('DELETE FROM app_studio_notes WHERE id = $1', [id]);
      return Boolean(res.rowCount && res.rowCount > 0);
    }
    const before = this.memStudioNotes.length;
    this.memStudioNotes = this.memStudioNotes.filter((n) => n.id !== id);
    const deleted = this.memStudioNotes.length < before;
    if (deleted) await this.persistMemory();
    return deleted;
  }

  public async listEnvVault(): Promise<StoredEnvVaultEntry[]> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query(
        `SELECT id, category, key_name, value, secret, notes, updated_at
         FROM app_env_vault
         ORDER BY category ASC, key_name ASC`
      );
      return res.rows.map((r) => ({
        id: String(r.id),
        category: String(r.category || 'Code & Custom'),
        keyName: String(r.key_name),
        value: String(r.value || ''),
        secret: Boolean(r.secret),
        notes: typeof r.notes === 'string' && r.notes ? r.notes : undefined,
        updatedAt: new Date(String(r.updated_at)).toISOString(),
      }));
    }
    return [...this.memEnvVault].sort((a, b) =>
      a.category === b.category ? a.keyName.localeCompare(b.keyName) : a.category.localeCompare(b.category)
    );
  }

  public async upsertEnvVaultEntry(input: {
    id?: string;
    category: string;
    keyName: string;
    value: string;
    secret: boolean;
    notes?: string;
  }): Promise<StoredEnvVaultEntry> {
    await this.ready();
    const id = input.id && input.id.trim() ? input.id.trim() : 'ev_' + crypto.randomUUID().slice(0, 12);
    const now = new Date().toISOString();
    const record: StoredEnvVaultEntry = {
      id,
      category: input.category,
      keyName: input.keyName,
      value: input.value,
      secret: input.secret,
      notes: input.notes,
      updatedAt: now,
    };

    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_env_vault (id, category, key_name, value, secret, notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO UPDATE
           SET category = EXCLUDED.category,
               key_name = EXCLUDED.key_name,
               value = EXCLUDED.value,
               secret = EXCLUDED.secret,
               notes = EXCLUDED.notes,
               updated_at = NOW()`,
        [id, record.category, record.keyName, record.value, record.secret, record.notes || '']
      );
      return record;
    }

    const idx = this.memEnvVault.findIndex((e) => e.id === id);
    if (idx >= 0) {
      this.memEnvVault[idx] = record;
    } else {
      this.memEnvVault.push(record);
    }
    await this.persistMemory();
    return record;
  }

  public async deleteEnvVaultEntry(id: string): Promise<boolean> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('DELETE FROM app_env_vault WHERE id = $1', [id]);
      return Boolean(res.rowCount && res.rowCount > 0);
    }
    const before = this.memEnvVault.length;
    this.memEnvVault = this.memEnvVault.filter((e) => e.id !== id);
    const deleted = this.memEnvVault.length < before;
    if (deleted) await this.persistMemory();
    return deleted;
  }

  // ---- NEWSFEED ANNOUNCEMENT SLIDE BANNERS ----
  public async listAnnouncements(): Promise<StoredAnnouncement[]> {
    await this.ready();
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query(
        `SELECT id, title, message, badge, tone, target, active, created_by, created_at, updated_at
         FROM app_announcements
         ORDER BY updated_at DESC, created_at DESC`
      );
      return res.rows.map((r) => ({
        id: String(r.id),
        title: String(r.title || ''),
        message: String(r.message || ''),
        badge: normalizeAnnouncementBadge(r.badge),
        tone: normalizeAnnouncementTone(r.tone),
        target: normalizeAnnouncementTarget(r.target),
        active: Boolean(r.active),
        createdBy: String(r.created_by || 'Admin'),
        createdAt: new Date(String(r.created_at)).toISOString(),
        updatedAt: new Date(String(r.updated_at)).toISOString(),
      }));
    }
    return [...this.memAnnouncements].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public async createAnnouncement(input: {
    title: string;
    message: string;
    badge?: AnnouncementBadge;
    tone?: AnnouncementTone;
    target?: AnnouncementTarget;
    active?: boolean;
    createdBy?: string;
  }): Promise<StoredAnnouncement> {
    await this.ready();
    const id = 'ann_' + crypto.randomUUID().slice(0, 12);
    const now = new Date().toISOString();
    const record: StoredAnnouncement = {
      id,
      title: input.title.trim().slice(0, 120),
      message: input.message.trim().slice(0, 500),
      badge: normalizeAnnouncementBadge(input.badge),
      tone: normalizeAnnouncementTone(input.tone),
      target: normalizeAnnouncementTarget(input.target),
      active: input.active !== false,
      createdBy: (input.createdBy || 'Admin').trim().slice(0, 80) || 'Admin',
      createdAt: now,
      updatedAt: now,
    };

    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_announcements (id, title, message, badge, tone, target, active, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [record.id, record.title, record.message, record.badge, record.tone, record.target, record.active, record.createdBy]
      );
      return record;
    }

    this.memAnnouncements.unshift(record);
    await this.persistMemory();
    return record;
  }

  public async updateAnnouncement(
    id: string,
    patch: Partial<{
      title: string;
      message: string;
      badge: AnnouncementBadge;
      tone: AnnouncementTone;
      target: AnnouncementTarget;
      active: boolean;
    }>
  ): Promise<StoredAnnouncement | null> {
    await this.ready();
    const cleanId = id.trim();
    if (!cleanId) return null;

    if (this.usePostgres && this.pool) {
      const existingRes = await this.pool.query(
        `SELECT id, title, message, badge, tone, target, active, created_by, created_at, updated_at
         FROM app_announcements WHERE id = $1 LIMIT 1`,
        [cleanId]
      );
      if (!existingRes.rowCount || !existingRes.rows[0]) return null;
      const cur = existingRes.rows[0];
      const next: StoredAnnouncement = {
        id: String(cur.id),
        title: typeof patch.title === 'string' && patch.title.trim() ? patch.title.trim().slice(0, 120) : String(cur.title),
        message:
          typeof patch.message === 'string' && patch.message.trim()
            ? patch.message.trim().slice(0, 500)
            : String(cur.message),
        badge: patch.badge !== undefined ? normalizeAnnouncementBadge(patch.badge) : normalizeAnnouncementBadge(cur.badge),
        tone: patch.tone !== undefined ? normalizeAnnouncementTone(patch.tone) : normalizeAnnouncementTone(cur.tone),
        target:
          patch.target !== undefined ? normalizeAnnouncementTarget(patch.target) : normalizeAnnouncementTarget(cur.target),
        active: typeof patch.active === 'boolean' ? patch.active : Boolean(cur.active),
        createdBy: String(cur.created_by || 'Admin'),
        createdAt: new Date(String(cur.created_at)).toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await this.pool.query(
        `UPDATE app_announcements
         SET title = $1, message = $2, badge = $3, tone = $4, target = $5, active = $6, updated_at = NOW()
         WHERE id = $7`,
        [next.title, next.message, next.badge, next.tone, next.target, next.active, cleanId]
      );
      return next;
    }

    const idx = this.memAnnouncements.findIndex((a) => a.id === cleanId);
    if (idx < 0) return null;
    const cur = this.memAnnouncements[idx];
    const next: StoredAnnouncement = {
      ...cur,
      title: typeof patch.title === 'string' && patch.title.trim() ? patch.title.trim().slice(0, 120) : cur.title,
      message: typeof patch.message === 'string' && patch.message.trim() ? patch.message.trim().slice(0, 500) : cur.message,
      badge: patch.badge !== undefined ? normalizeAnnouncementBadge(patch.badge) : cur.badge,
      tone: patch.tone !== undefined ? normalizeAnnouncementTone(patch.tone) : cur.tone,
      target: patch.target !== undefined ? normalizeAnnouncementTarget(patch.target) : cur.target,
      active: typeof patch.active === 'boolean' ? patch.active : cur.active,
      updatedAt: new Date().toISOString(),
    };
    this.memAnnouncements[idx] = next;
    await this.persistMemory();
    return next;
  }

  public async deleteAnnouncement(id: string): Promise<boolean> {
    await this.ready();
    const cleanId = id.trim();
    if (!cleanId) return false;
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('DELETE FROM app_announcements WHERE id = $1', [cleanId]);
      return Boolean(res.rowCount && res.rowCount > 0);
    }
    const before = this.memAnnouncements.length;
    this.memAnnouncements = this.memAnnouncements.filter((a) => a.id !== cleanId);
    const deleted = this.memAnnouncements.length < before;
    if (deleted) await this.persistMemory();
    return deleted;
  }

  public async exportCloudBackup(): Promise<{
    exportedAt: string;
    users: StoredUser[];
    settings: StoredPricesSettings;
    newsfeedConfig: StoredNewsfeedConfig;
    ledger: StoredLedgerRow[];
    knowledge: StoredKnowledgeQA[];
    announcements: StoredAnnouncement[];
  }> {
    await this.ready();
    let users: StoredUser[];
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM app_users ORDER BY created_at ASC');
      users = res.rows.map((r) => this.mapUserRow(r));
    } else {
      users = this.memUsers.map((u) => ({
        ...u,
        blockedUsers: [...(u.blockedUsers || [])],
        newsfeed: normalizeUserNewsfeed(u.newsfeed),
      }));
    }

    const [settings, newsfeedConfig, ledger, knowledge, announcements] = await Promise.all([
      this.getSettings(),
      this.getNewsfeedConfig(),
      this.listLedger(),
      this.listKnowledge(),
      this.listAnnouncements(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      users,
      settings,
      newsfeedConfig,
      ledger,
      knowledge,
      announcements,
    };
  }

  public async restoreCloudBackup(input: {
    users?: Array<Partial<StoredUser>>;
    settings?: Partial<StoredPricesSettings>;
    newsfeedConfig?: Partial<StoredNewsfeedConfig>;
    ledger?: Array<Partial<StoredLedgerRow>>;
    knowledge?: Array<Partial<StoredKnowledgeQA>>;
    announcements?: Array<Partial<StoredAnnouncement>>;
  }): Promise<{
    restoredUsersCount: number;
    totalUsersCount: number;
    restoredLedgerCount: number;
    restoredKnowledgeCount: number;
    restoredAnnouncementsCount: number;
  }> {
    await this.ready();
    let restoredUsersCount = 0;
    let restoredLedgerCount = 0;
    let restoredKnowledgeCount = 0;
    let restoredAnnouncementsCount = 0;

    const incomingUsers = Array.isArray(input.users) ? input.users : [];
    for (const raw of incomingUsers) {
      if (!raw || typeof raw !== 'object') continue;
      const id = typeof raw.id === 'string' ? raw.id.trim().slice(0, 128) : '';
      const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 100) : '';
      const phone = typeof raw.phone === 'string' ? normalizePhone(raw.phone).slice(0, 64) : '';
      const pinHash = typeof raw.pinHash === 'string' ? raw.pinHash.trim().slice(0, 256) : '';
      if (!id || !name || !phone || pinHash.length < 10 || !pinHash.includes(':')) continue;

      const role: 'admin' | 'member' = raw.role === 'admin' ? 'admin' : 'member';
      const status: 'pending' | 'approved' = raw.status === 'pending' ? 'pending' : 'approved';
      const blockedUsers = Array.isArray(raw.blockedUsers)
        ? raw.blockedUsers
            .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
            .slice(0, 100)
            .map((b) => b.trim().slice(0, 80))
        : [];
      const avatar = sanitizeMediaUrl(raw.avatar);
      const newsfeed = normalizeUserNewsfeed(raw.newsfeed);
      const createdAt =
        typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
          ? new Date(raw.createdAt).toISOString()
          : new Date().toISOString();
      const updatedAt =
        typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt))
          ? new Date(raw.updatedAt).toISOString()
          : createdAt;

      if (this.usePostgres && this.pool) {
        const existingRes = await this.pool.query(
          'SELECT id FROM app_users WHERE id = $1 OR phone = $2 LIMIT 1',
          [id, phone]
        );
        if (!existingRes.rowCount) {
          await this.pool.query(
            `INSERT INTO app_users (id, name, phone, pin_hash, role, status, blocked_users, avatar_url, newsfeed, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::timestamptz, $11::timestamptz)`,
            [
              id,
              name,
              phone,
              pinHash,
              role,
              status,
              JSON.stringify(blockedUsers),
              avatar ?? null,
              newsfeed,
              createdAt,
              updatedAt,
            ]
          );
          restoredUsersCount += 1;
        }
      } else {
        const exists = this.memUsers.some(
          (u) => u.id === id || normalizePhone(u.phone) === phone
        );
        if (!exists) {
          this.memUsers.push({
            id,
            name,
            phone,
            pinHash,
            role,
            status,
            blockedUsers,
            avatar,
            newsfeed,
            createdAt,
            updatedAt,
          });
          restoredUsersCount += 1;
        }
      }
    }

    if (input.newsfeedConfig && typeof input.newsfeedConfig === 'object') {
      const currentNf = await this.getNewsfeedConfig();
      const isDefaultNf =
        currentNf.feedATitle === DEFAULT_NEWSFEED_CONFIG.feedATitle &&
        currentNf.feedBTitle === DEFAULT_NEWSFEED_CONFIG.feedBTitle &&
        currentNf.feedCTitle === DEFAULT_NEWSFEED_CONFIG.feedCTitle;
      if (isDefaultNf) {
        await this.saveNewsfeedConfig(input.newsfeedConfig);
      }
    }

    if (input.settings && typeof input.settings === 'object') {
      const currentSettings = await this.getSettings();
      const isDefaultSettings =
        currentSettings.fiveH === DEFAULT_SETTINGS.fiveH &&
        currentSettings.bulig === DEFAULT_SETTINGS.bulig &&
        currentSettings.point5 === DEFAULT_SETTINGS.point5 &&
        currentSettings.halfSack === DEFAULT_SETTINGS.halfSack &&
        currentSettings.oneSack === DEFAULT_SETTINGS.oneSack;
      if (isDefaultSettings) {
        await this.saveSettings({
          fiveH: clampNum(input.settings.fiveH ?? currentSettings.fiveH, 0, 1000000),
          bulig: clampNum(input.settings.bulig ?? currentSettings.bulig, 0, 1000000),
          point5: clampNum(input.settings.point5 ?? currentSettings.point5, 0, 1000000),
          halfSack: clampNum(input.settings.halfSack ?? currentSettings.halfSack, 0, 1000000),
          oneSack: clampNum(input.settings.oneSack ?? currentSettings.oneSack, 0, 1000000),
          defFiveH: clampNum(input.settings.defFiveH ?? currentSettings.defFiveH, 0, 1000000),
          defBulig: clampNum(input.settings.defBulig ?? currentSettings.defBulig, 0, 1000000),
          defPoint5: clampNum(input.settings.defPoint5 ?? currentSettings.defPoint5, 0, 1000000),
          defHalfSack: clampNum(input.settings.defHalfSack ?? currentSettings.defHalfSack, 0, 1000000),
          defOneSack: clampNum(input.settings.defOneSack ?? currentSettings.defOneSack, 0, 1000000),
        });
      }
    }

    const incomingLedger = Array.isArray(input.ledger) ? input.ledger : [];
    for (const rawRow of incomingLedger) {
      if (!rawRow || typeof rawRow !== 'object') continue;
      const id = typeof rawRow.id === 'string' ? rawRow.id.trim().slice(0, 128) : '';
      const name = typeof rawRow.name === 'string' ? rawRow.name.trim().slice(0, 100) : '';
      if (!id || !name) continue;
      if (this.usePostgres && this.pool) {
        const existsRes = await this.pool.query('SELECT id FROM app_ledger WHERE id = $1 LIMIT 1', [id]);
        if (!existsRes.rowCount) {
          await this.pool.query(
            `INSERT INTO app_ledger (id, name, five_h, five_h_type, bulig, point5, half_sack, one_sack, bal)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              id,
              name,
              clampNum(rawRow.fiveH, -1000000, 1000000),
              rawRow.fiveHType === 'red' ? 'red' : 'blue',
              clampNum(rawRow.bulig, -1000000, 1000000),
              clampNum(rawRow.point5, -1000000, 1000000),
              clampNum(rawRow.halfSack, -1000000, 1000000),
              clampNum(rawRow.oneSack, -1000000, 1000000),
              clampNum(rawRow.bal, -100000000, 100000000),
            ]
          );
          restoredLedgerCount += 1;
        }
      } else if (!this.memLedger.some((r) => r.id === id)) {
        this.memLedger.push({
          id,
          name,
          fiveH: clampNum(rawRow.fiveH, -1000000, 1000000),
          fiveHType: rawRow.fiveHType === 'red' ? 'red' : 'blue',
          bulig: clampNum(rawRow.bulig, -1000000, 1000000),
          point5: clampNum(rawRow.point5, -1000000, 1000000),
          halfSack: clampNum(rawRow.halfSack, -1000000, 1000000),
          oneSack: clampNum(rawRow.oneSack, -1000000, 1000000),
          bal: clampNum(rawRow.bal, -100000000, 100000000),
          updatedAt:
            typeof rawRow.updatedAt === 'string' ? rawRow.updatedAt : new Date().toISOString(),
        });
        restoredLedgerCount += 1;
      }
    }

    const incomingKnowledge = Array.isArray(input.knowledge) ? input.knowledge : [];
    for (const rawQa of incomingKnowledge) {
      if (!rawQa || typeof rawQa !== 'object') continue;
      const id = typeof rawQa.id === 'string' ? rawQa.id.trim().slice(0, 128) : '';
      const question = typeof rawQa.question === 'string' ? rawQa.question.trim().slice(0, 300) : '';
      const answer = typeof rawQa.answer === 'string' ? rawQa.answer.trim().slice(0, 2000) : '';
      if (!id || !question || !answer) continue;
      if (this.usePostgres && this.pool) {
        const existsRes = await this.pool.query('SELECT id FROM app_knowledge WHERE id = $1 LIMIT 1', [id]);
        if (!existsRes.rowCount) {
          await this.pool.query('INSERT INTO app_knowledge (id, question, answer) VALUES ($1, $2, $3)', [
            id,
            question,
            answer,
          ]);
          restoredKnowledgeCount += 1;
        }
      } else if (!this.memKnowledge.some((k) => k.id === id)) {
        this.memKnowledge.push({
          id,
          question,
          answer,
          createdAt: typeof rawQa.createdAt === 'string' ? rawQa.createdAt : new Date().toISOString(),
        });
        restoredKnowledgeCount += 1;
      }
    }

    const incomingAnnouncements = Array.isArray(input.announcements) ? input.announcements : [];
    for (const rawAnn of incomingAnnouncements) {
      if (!rawAnn || typeof rawAnn !== 'object') continue;
      const id = typeof rawAnn.id === 'string' ? rawAnn.id.trim().slice(0, 128) : '';
      const title = typeof rawAnn.title === 'string' ? rawAnn.title.trim().slice(0, 120) : '';
      const message = typeof rawAnn.message === 'string' ? rawAnn.message.trim().slice(0, 1000) : '';
      if (!id || !title || !message) continue;
      const badge = normalizeAnnouncementBadge(rawAnn.badge);
      const tone = normalizeAnnouncementTone(rawAnn.tone);
      const target = normalizeAnnouncementTarget(rawAnn.target);
      const active = rawAnn.active !== false;
      const createdBy =
        typeof rawAnn.createdBy === 'string' && rawAnn.createdBy.trim()
          ? rawAnn.createdBy.trim().slice(0, 80)
          : 'Admin';
      const createdAt = typeof rawAnn.createdAt === 'string' ? rawAnn.createdAt : new Date().toISOString();
      const updatedAt = typeof rawAnn.updatedAt === 'string' ? rawAnn.updatedAt : createdAt;

      if (this.usePostgres && this.pool) {
        const existsRes = await this.pool.query('SELECT id FROM app_announcements WHERE id = $1 LIMIT 1', [id]);
        if (!existsRes.rowCount) {
          await this.pool.query(
            `INSERT INTO app_announcements (id, title, message, badge, tone, target, active, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz)`,
            [id, title, message, badge, tone, target, active, createdBy, createdAt, updatedAt]
          );
          restoredAnnouncementsCount += 1;
        }
      } else if (!this.memAnnouncements.some((a) => a.id === id)) {
        this.memAnnouncements.push({
          id,
          title,
          message,
          badge,
          tone,
          target,
          active,
          createdBy,
          createdAt,
          updatedAt,
        });
        restoredAnnouncementsCount += 1;
      }
    }

    if (!this.usePostgres && (restoredUsersCount > 0 || restoredLedgerCount > 0 || restoredKnowledgeCount > 0 || restoredAnnouncementsCount > 0)) {
      await this.persistMemory();
    }

    let totalUsersCount = this.memUsers.length;
    if (this.usePostgres && this.pool) {
      const countRes = await this.pool.query('SELECT COUNT(*)::int AS cnt FROM app_users');
      totalUsersCount = Number(countRes.rows[0]?.cnt || 0);
    }

    return {
      restoredUsersCount,
      totalUsersCount,
      restoredLedgerCount,
      restoredKnowledgeCount,
      restoredAnnouncementsCount,
    };
  }

  private mapUserRow(r: Record<string, unknown>): StoredUser {
    const rawAvatar = typeof r.avatar_url === 'string' ? r.avatar_url.trim() : '';
    const newsfeed = normalizeUserNewsfeed(r.newsfeed);
    return {
      id: String(r.id),
      name: String(r.name),
      phone: String(r.phone),
      pinHash: String(r.pin_hash),
      role: r.role === 'admin' ? 'admin' : 'member',
      status: String(r.status || '').trim().toLowerCase() === 'approved' ? 'approved' : 'pending',
      blockedUsers: Array.isArray(r.blocked_users) ? (r.blocked_users as string[]) : [],
      avatar: rawAvatar || undefined,
      newsfeed,
      createdAt: new Date(String(r.created_at)).toISOString(),
      updatedAt: new Date(String(r.updated_at)).toISOString(),
    };
  }
}
