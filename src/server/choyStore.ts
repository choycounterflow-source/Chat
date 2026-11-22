import crypto from 'crypto';
import { Pool } from 'pg';

export interface StoredUser {
  id: string;
  name: string;
  phone: string;
  pinHash: string;
  role: 'admin' | 'member';
  status: 'pending' | 'approved';
  blockedUsers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicUserDTO {
  id: string;
  name: string;
  phone: string;
  role: 'admin' | 'member';
  status: 'pending' | 'approved';
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

export interface SessionPayload {
  uid: string;
  role: 'admin' | 'member';
  exp: number;
}

const DEFAULT_AVATAR = '/assets/aistudio/image_20261121_145253_f477cbfa.webp';
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

export const ALLOWED_CHAT_ROOMS = ['VIP Group', 'Choy Admin', 'Maria Santos'] as const;

const SESSION_SIGNING_KEY =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

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
    trimmed.length <= 1800000 &&
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(trimmed)
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

  // In-memory fallback when DATABASE_URL is not yet configured
  private memUsers: StoredUser[] = [];
  private memPosts: StoredPost[] = [];
  private memMessages: StoredMessage[] = [];
  private memLedger: StoredLedgerRow[] = [];
  private memKnowledge: StoredKnowledgeQA[] = [];
  private memSettings: StoredPricesSettings = { ...DEFAULT_SETTINGS };
  private memSeeded = false;

  constructor() {
    this.readyPromise = this.init();
  }

  public get storageMode(): 'postgres' | 'memory' {
    return this.usePostgres ? 'postgres' : 'memory';
  }

  public get storageStatus(): 'postgres_connected' | 'no_database_url' | 'auth_failed' | 'connection_failed' {
    return this._storageStatus;
  }

  public async ready(): Promise<void> {
    await this.readyPromise;
  }

  private async init(): Promise<void> {
    const rawUrl = (process.env.DATABASE_URL || '').trim();
    const dbUrl =
      (rawUrl.startsWith('"') && rawUrl.endsWith('"')) || (rawUrl.startsWith("'") && rawUrl.endsWith("'"))
        ? rawUrl.slice(1, -1).trim()
        : rawUrl;
    if (dbUrl) {
      try {
        const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
        this.pool = new Pool({
          connectionString: dbUrl,
          ssl: isLocal ? false : { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
        await this.pool.query('SELECT 1');
        await this.createTables();
        await this.seedIfEmptyPostgres();
        this.usePostgres = true;
        this._storageStatus = 'postgres_connected';
        console.log('[ChoyStore] Connected to PostgreSQL cloud database.');
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        this._storageStatus =
          msg.includes('password') || msg.includes('authentication') || msg.includes('28p01')
            ? 'auth_failed'
            : 'connection_failed';
        console.error('[ChoyStore] PostgreSQL connection failed, falling back to in-memory store:', err instanceof Error ? err.message : err);
        this.pool = null;
        this.usePostgres = false;
      }
    } else {
      this._storageStatus = 'no_database_url';
    }
    this.seedMemory();
    console.log('[ChoyStore] Running in server memory mode (set DATABASE_URL in Render for permanent PostgreSQL sync).');
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS app_messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        room_id TEXT NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        media_url TEXT,
        media_type TEXT NOT NULL DEFAULT 'text',
        reactions JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
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
      createdAt: now,
      updatedAt: now,
    };
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_users (id, name, phone, pin_hash, role, status, blocked_users)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [user.id, user.name, user.phone, user.pinHash, user.role, user.status, JSON.stringify(user.blockedUsers)]
      );
    } else {
      this.memUsers.push(user);
    }
    return user;
  }

  public async createUser(params: {
    name: string;
    phone: string;
    pin: string;
    role: 'admin' | 'member';
    status: 'pending' | 'approved';
  }): Promise<StoredUser> {
    await this.ready();
    const id = (params.role === 'admin' ? 'admin_' : 'u_') + crypto.randomUUID().slice(0, 10);
    const now = new Date().toISOString();
    const user: StoredUser = {
      id,
      name: params.name.slice(0, 80),
      phone: normalizePhone(params.phone).slice(0, 40),
      pinHash: hashPin(params.pin),
      role: params.role,
      status: params.status,
      blockedUsers: [],
      createdAt: now,
      updatedAt: now,
    };
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_users (id, name, phone, pin_hash, role, status, blocked_users)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [user.id, user.name, user.phone, user.pinHash, user.role, user.status, JSON.stringify(user.blockedUsers)]
      );
    } else {
      this.memUsers.push(user);
    }
    return user;
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
      loginDate: u.updatedAt.slice(0, 16).replace('T', ' '),
    }));
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
    return this.memUsers.length < before;
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
        createdAt: new Date(r.created_at).toISOString(),
      }));
    }
    return [...this.memPosts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async createPost(post: Omit<StoredPost, 'id' | 'createdAt'>): Promise<StoredPost> {
    await this.ready();
    const item: StoredPost = {
      ...post,
      id: 'p_' + crypto.randomUUID().slice(0, 12),
      createdAt: new Date().toISOString(),
    };
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO app_posts (id, author_id, author_name, author_handle, author_avatar, content, media_url, media_type, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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
        ]
      );
    } else {
      this.memPosts.unshift(item);
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
        `INSERT INTO app_messages (id, sender_id, sender_name, room_id, text, media_url, media_type, reactions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
        [
          item.id,
          item.senderId,
          item.senderName,
          item.roomId,
          item.text,
          item.mediaUrl || null,
          item.mediaType,
          JSON.stringify(item.reactions),
        ]
      );
    } else {
      this.memMessages.push(item);
    }
    return item;
  }

  public async addReaction(messageId: string, emoji: string): Promise<StoredMessage | null> {
    await this.ready();
    const cleanEmoji = emoji.slice(0, 16);
    if (this.usePostgres && this.pool) {
      const existing = await this.pool.query('SELECT * FROM app_messages WHERE id = $1 LIMIT 1', [messageId]);
      if (!existing.rowCount) return null;
      const cur: string[] = Array.isArray(existing.rows[0].reactions) ? existing.rows[0].reactions : [];
      if (cur.length >= 20) return null;
      const next = [...cur, cleanEmoji];
      await this.pool.query('UPDATE app_messages SET reactions = $1::jsonb WHERE id = $2', [
        JSON.stringify(next),
        messageId,
      ]);
      const r = existing.rows[0];
      return {
        id: r.id,
        senderId: r.sender_id,
        senderName: r.sender_name,
        roomId: r.room_id,
        text: r.text || '',
        mediaUrl: r.media_url || undefined,
        mediaType: r.media_type,
        reactions: next,
        createdAt: new Date(r.created_at).toISOString(),
      };
    }
    const found = this.memMessages.find((m) => m.id === messageId);
    if (!found || found.reactions.length >= 20) return null;
    found.reactions = [...found.reactions, cleanEmoji];
    return found;
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
    return this.memLedger.length < before;
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
    return this.memKnowledge.length < before;
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
    }
    return clean;
  }

  private mapUserRow(r: Record<string, unknown>): StoredUser {
    return {
      id: String(r.id),
      name: String(r.name),
      phone: String(r.phone),
      pinHash: String(r.pin_hash),
      role: r.role === 'admin' ? 'admin' : 'member',
      status: String(r.status || '').trim().toLowerCase() === 'approved' ? 'approved' : 'pending',
      blockedUsers: Array.isArray(r.blocked_users) ? (r.blocked_users as string[]) : [],
      createdAt: new Date(String(r.created_at)).toISOString(),
      updatedAt: new Date(String(r.updated_at)).toISOString(),
    };
  }
}
