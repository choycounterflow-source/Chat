import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import type WebPushType from 'web-push';
import { GoogleGenAI } from '@google/genai';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof WebPushType;
import {
  ChoyStore,
  ALLOWED_CHAT_ROOMS,
  signSessionToken,
  verifySessionToken,
  verifyPin,
  timingSafeStringEqual,
  normalizePhone,
  sanitizeMediaUrl,
  clampNum,
  type StoredUser,
} from './src/server/choyStore.ts';
import {
  getSupabaseStorageStatus,
  uploadToSupabaseStorage,
} from './src/server/supabaseStorage.ts';

dotenv.config();
if (fs.existsSync('/etc/secrets/.env')) {
  dotenv.config({ path: '/etc/secrets/.env', override: false });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const store = new ChoyStore();
interface SseClient {
  res: Response;
  userId: string;
  userName: string;
}

const DEFAULT_PROFILE_ICON = '/assets/aistudio/image_20261121_145253_f477cbfa.webp';

function getSafePushIcon(avatar?: string): string {
  const clean = typeof avatar === 'string' ? avatar.trim() : '';
  if (clean && (clean.startsWith('https://') || clean.startsWith('/assets/'))) {
    return clean;
  }
  return DEFAULT_PROFILE_ICON;
}
const sseClients = new Set<SseClient>();
const userLastSeenMap = new Map<string, number>();

let vapidReadyPromise: Promise<string> | null = null;
async function ensureWebPushConfigured(): Promise<string> {
  if (!vapidReadyPromise) {
    vapidReadyPromise = (async () => {
      const keys = await store.getOrCreateVapidKeys(() => webpush.generateVAPIDKeys());
      const subject = (process.env.VAPID_SUBJECT || 'mailto:choyjiez07@gmail.com').trim();
      webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
      return keys.publicKey;
    })().catch((err) => {
      vapidReadyPromise = null;
      throw err;
    });
  }
  return vapidReadyPromise;
}

async function sendWebPushToTarget(
  targetName: string,
  excludeUserId: string,
  payload: Record<string, unknown>,
  urgency: 'normal' | 'high' = 'normal'
): Promise<number> {
  try {
    await ensureWebPushConfigured();
    const subs = await store.listPushSubscriptionsForTarget(targetName, excludeUserId);
    if (subs.length === 0) return 0;

    const body = JSON.stringify(payload);
    const ttl = urgency === 'high' ? 90 : 86400; // 24h TTL for messages so turning mobile data ON delivers queued alerts
    let sent = 0;

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
            },
            body,
            { TTL: ttl, urgency }
          );
          sent += 1;
        } catch (err: unknown) {
          const statusCode =
            typeof err === 'object' && err !== null && 'statusCode' in err
              ? Number((err as { statusCode?: number }).statusCode)
              : 0;
          if (statusCode === 404 || statusCode === 410) {
            await store.removePushSubscription(sub.endpoint).catch(() => {});
          }
        }
      })
    );
    return sent;
  } catch (err) {
    console.warn('[WebPush] Dispatch skipped:', err instanceof Error ? err.message : err);
    return 0;
  }
}

interface QueuedRtcSignal {
  seq: number;
  signalId: string;
  targetNameLower: string;
  senderUserId: string;
  createdAtMs: number;
  payload: Record<string, unknown>;
}

const rtcSignalQueue: QueuedRtcSignal[] = [];
let rtcSignalSeq = 0;

function pruneRtcQueue(now = Date.now()) {
  const cutoff = now - 90_000;
  while (rtcSignalQueue.length > 0 && rtcSignalQueue[0].createdAtMs < cutoff) {
    rtcSignalQueue.shift();
  }
  if (rtcSignalQueue.length > 500) {
    rtcSignalQueue.splice(0, rtcSignalQueue.length - 500);
  }
}

function touchUserPresence(userName: string) {
  const key = userName.trim().toLowerCase();
  if (key) {
    userLastSeenMap.set(key, Date.now());
  }
}

function getOnlineUserNames(now = Date.now()): string[] {
  const online = new Set<string>();
  for (const client of sseClients) {
    const key = client.userName.trim().toLowerCase();
    if (key) online.add(key);
  }
  for (const [key, lastSeen] of userLastSeenMap.entries()) {
    if (now - lastSeen <= 20_000) {
      online.add(key);
    }
  }
  return Array.from(online);
}

function broadcastSync(topic: string) {
  const payload = `event: sync\ndata: ${JSON.stringify({ topic, ts: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function sendRtcSignal(
  targetName: string,
  senderUserId: string,
  eventPayload: Record<string, unknown>
): { delivered: number; targetOnline: boolean; signalId: string; seq: number } {
  const now = Date.now();
  pruneRtcQueue(now);
  rtcSignalSeq += 1;
  const seq = rtcSignalSeq;
  const signalId = `sig_${seq}_${now}`;
  const enrichedPayload: Record<string, unknown> = {
    ...eventPayload,
    signalId,
    seq,
  };

  const normalizedTarget = targetName.trim().toLowerCase();
  const isGroup = normalizedTarget === 'vip group' || normalizedTarget === '';

  rtcSignalQueue.push({
    seq,
    signalId,
    targetNameLower: isGroup ? 'vip group' : normalizedTarget,
    senderUserId,
    createdAtMs: now,
    payload: enrichedPayload,
  });

  const payload = `event: rtc\ndata: ${JSON.stringify(enrichedPayload)}\n\n`;
  let delivered = 0;

  for (const client of sseClients) {
    if (client.userId === senderUserId) continue;
    const isMatch = isGroup || client.userName.trim().toLowerCase() === normalizedTarget;
    if (!isMatch) continue;
    try {
      client.res.write(payload);
      delivered += 1;
    } catch {
      sseClients.delete(client);
    }
  }

  let targetOnline = delivered > 0;
  if (!targetOnline) {
    if (isGroup) {
      for (const [, lastSeen] of userLastSeenMap.entries()) {
        if (now - lastSeen <= 15_000) {
          targetOnline = true;
          break;
        }
      }
    } else {
      const lastSeen = userLastSeenMap.get(normalizedTarget) || 0;
      targetOnline = now - lastSeen <= 15_000;
    }
  }

  return { delivered, targetOnline, signalId, seq };
}

const SESSION_COOKIE_NAME = 'choy_session';

function readSessionCookie(req: Request): string {
  const raw = req.headers.cookie || '';
  if (!raw) return '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === SESSION_COOKIE_NAME) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return '';
}

function setSessionCookie(req: Request, res: Response, token: string) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${60 * 60 * 24 * 7}`,
  ];
  if (isHttps) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(req: Request, res: Response) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  const attrs = [`${SESSION_COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isHttps) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function stripOuterQuotes(val: string): string {
  const t = val.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

interface AuthedRequest extends Request {
  choyUser?: StoredUser;
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const token = bearerToken || readSessionCookie(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  try {
    const user = await store.getUserById(session.uid);
    if (!user) {
      return res.status(401).json({ error: 'Account not found' });
    }
    req.choyUser = user;
    next();
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Session lookup failed' });
  }
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.choyUser || req.choyUser.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '15mb' }));
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Health check endpoint for Render hosting
app.get('/api/health', async (_req, res) => {
  await store.ready();
  const mediaStorage = getSupabaseStorageStatus();
  res.json({
    status: 'ok',
    host: 'render',
    storageMode: store.storageMode,
    storageStatus: store.storageStatus,
    mediaStorageMode: mediaStorage.configured ? 'supabase' : 'inline',
    mediaBucket: mediaStorage.bucket,
    timestamp: new Date().toISOString(),
  });
});

// ---- CHOY CHAT AUTH & CROSS-DEVICE SYNC API ----
app.get('/api/auth/status', async (_req, res) => {
  await store.ready();
  const hasAdmin = await store.hasAnyAdmin();
  res.json({
    needsAdminSetup: !hasAdmin,
    storageMode: store.storageMode,
  });
});

app.get('/api/admin/env-status', requireAuth, requireAdmin, async (_req, res) => {
  await store.ready();
  const mediaStorage = getSupabaseStorageStatus();
  res.json({
    storageMode: store.storageMode,
    mediaStorageMode: mediaStorage.configured ? 'supabase' : 'inline',
    defaults: {
      APP_URL: (process.env.APP_URL || 'https://chat-9-si9x.onrender.com').trim(),
      ADMIN_PHONE: (process.env.ADMIN_PHONE || '09361223978').trim(),
      SUPABASE_URL: (process.env.SUPABASE_URL || '').trim(),
      SUPABASE_BUCKET: mediaStorage.bucket,
    },
    configured: {
      DATABASE_URL: Boolean((process.env.DATABASE_URL || '').trim()),
      ADMIN_PHONE: Boolean((process.env.ADMIN_PHONE || '').trim()),
      ADMIN_PIN: Boolean((process.env.ADMIN_PIN || '').trim()),
      APP_URL: Boolean((process.env.APP_URL || 'https://chat-9-si9x.onrender.com').trim()),
      GEMINI_API_KEY: Boolean((process.env.GEMINI_API_KEY || '').trim()),
      SUPABASE_URL: mediaStorage.hasUrl,
      SUPABASE_ANON_KEY: Boolean((process.env.SUPABASE_ANON_KEY || '').trim()),
      SUPABASE_SERVICE_ROLE_KEY: mediaStorage.hasServiceKey,
      SUPABASE_BUCKET: Boolean(mediaStorage.bucket),
    },
  });
});

// ---- SUPABASE STORAGE MEDIA UPLOAD ENDPOINT ----
app.post(
  '/api/media/upload',
  requireAuth,
  express.raw({ type: () => true, limit: '26mb' }),
  async (req: AuthedRequest, res: Response) => {
    try {
      const user = req.choyUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required to upload media' });
      }

      // CSRF protection when authenticated via session cookie
      const hasBearer = Boolean(req.headers.authorization?.startsWith('Bearer '));
      if (!hasBearer) {
        const origin = req.headers.origin;
        const expectedHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
        const hasRequestedWith = req.headers['x-requested-with'] === 'XMLHttpRequest';
        let originMatches = false;
        if (typeof origin === 'string' && expectedHost) {
          try {
            originMatches = new URL(origin).host === expectedHost;
          } catch {
            originMatches = false;
          }
        }
        if (!originMatches && !hasRequestedWith) {
          return res.status(403).json({ error: 'Cross-origin upload blocked' });
        }
      }

      const status = getSupabaseStorageStatus();
      if (!status.configured) {
        return res.json({
          uploaded: false,
          configured: false,
          fallback: true,
          bucket: status.bucket,
        });
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'No media data received' });
      }

      const contentType = String(req.headers['content-type'] || '');
      const folder = String(req.headers['x-media-folder'] || 'posts');
      const result = await uploadToSupabaseStorage(req.body, contentType, folder);
      return res.status(201).json({
        uploaded: true,
        configured: true,
        ...result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Media upload failed';
      const isClientErr =
        message.includes('Unsupported media') ||
        message.includes('Empty file') ||
        message.includes('exceeds maximum');
      return res.status(isClientErr ? 400 : 502).json({ error: message });
    }
  }
);

app.get('/api/auth/session', async (req, res) => {
  await store.ready();
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const token = bearerToken || readSessionCookie(req);
  if (!token) {
    return res.json({ authenticated: false });
  }
  const session = verifySessionToken(token);
  if (!session) {
    clearSessionCookie(req, res);
    return res.json({ authenticated: false });
  }
  try {
    const user = await store.getUserById(session.uid);
    if (!user) {
      clearSessionCookie(req, res);
      return res.json({ authenticated: false });
    }
    return res.json({
      authenticated: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        blockedUsers: user.blockedUsers,
        avatar: user.avatar,
      },
    });
  } catch {
    return res.json({ authenticated: false });
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(req, res);
  return res.json({ ok: true });
});

let adminSetupLock = false;
app.post('/api/auth/setup-admin', async (req, res) => {
  if (adminSetupLock) {
    return res.status(409).json({ error: 'Admin setup already in progress' });
  }
  adminSetupLock = true;
  try {
    await store.ready();
    if (await store.hasAnyAdmin()) {
      return res.status(409).json({ error: 'Admin account is already configured. Please log in.' });
    }
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? normalizePhone(req.body.phone) : '';
    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    if (!name || name.length > 80) {
      return res.status(400).json({ error: 'Valid admin name is required' });
    }
    if (!phone || phone.length < 4 || phone.length > 40) {
      return res.status(400).json({ error: 'Valid phone or username is required' });
    }
    if (!pin || pin.length < 4 || pin.length > 64) {
      return res.status(400).json({ error: 'PIN must be between 4 and 64 characters' });
    }
    const user = await store.createUser({
      name,
      phone,
      pin,
      role: 'admin',
      status: 'approved',
    });
    const token = signSessionToken(user.id, user.role);
    setSessionCookie(req, res, token);
    broadcastSync('users');
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        blockedUsers: user.blockedUsers,
        avatar: user.avatar,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Admin setup failed' });
  } finally {
    adminSetupLock = false;
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    await store.ready();
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? normalizePhone(req.body.phone) : '';
    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    if (!name || name.length > 80) {
      return res.status(400).json({ error: 'Name is required (max 80 chars)' });
    }
    if (!phone || phone.length < 4 || phone.length > 40) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    if (!pin || pin.length < 4 || pin.length > 64) {
      return res.status(400).json({ error: 'PIN must be at least 4 characters' });
    }
    const existing = await store.getUserByPhone(phone);
    if (existing) {
      return res.status(409).json({ error: 'Phone number is already registered. Please log in.' });
    }
    const user = await store.createUser({
      name,
      phone,
      pin,
      role: 'member',
      status: 'approved',
    });
    const token = signSessionToken(user.id, user.role);
    setSessionCookie(req, res, token);
    broadcastSync('users');
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        blockedUsers: user.blockedUsers,
        avatar: user.avatar,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    await store.ready();
    const phone = typeof req.body?.phone === 'string' ? normalizePhone(req.body.phone) : '';
    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    if (!phone || !pin) {
      return res.status(400).json({ error: 'Phone and PIN are required' });
    }

    // Check configured process.env ADMIN_PIN override first
    const envAdminPin = stripOuterQuotes(process.env.ADMIN_PIN || '');
    const envAdminPhone = normalizePhone(stripOuterQuotes(process.env.ADMIN_PHONE || '09361223978'));
    if (envAdminPin && timingSafeStringEqual(phone, envAdminPhone) && timingSafeStringEqual(pin, envAdminPin)) {
      const adminUser = await store.ensureEnvAdminUser(envAdminPhone);
      const token = signSessionToken(adminUser.id, 'admin');
      setSessionCookie(req, res, token);
      return res.json({
        token,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          phone: adminUser.phone,
          role: adminUser.role,
          status: adminUser.status,
          blockedUsers: adminUser.blockedUsers,
          avatar: adminUser.avatar,
        },
      });
    }

    const user = await store.getUserByPhone(phone);
    if (!user || !verifyPin(pin, user.pinHash)) {
      return res.status(401).json({ error: 'Invalid phone or PIN' });
    }
    if (user.status !== 'approved') {
      await store.updateUserStatus(user.id, 'approved');
      user.status = 'approved';
    }
    const token = signSessionToken(user.id, user.role);
    setSessionCookie(req, res, token);
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        blockedUsers: user.blockedUsers,
        avatar: user.avatar,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Login failed' });
  }
});

app.post('/api/auth/avatar', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const hasBearer = Boolean(req.headers.authorization?.startsWith('Bearer '));
    if (!hasBearer) {
      const origin = req.headers.origin;
      const expectedHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
      const hasRequestedWith = req.headers['x-requested-with'] === 'XMLHttpRequest';
      let originMatches = false;
      if (typeof origin === 'string' && expectedHost) {
        try {
          originMatches = new URL(origin).host === expectedHost;
        } catch {
          originMatches = false;
        }
      }
      if (!originMatches && !hasRequestedWith) {
        return res.status(403).json({ error: 'Cross-origin request blocked' });
      }
    }

    const user = req.choyUser!;
    const rawAvatar = req.body?.avatarUrl;
    let nextAvatar: string | undefined;

    if (rawAvatar === null || rawAvatar === undefined || (typeof rawAvatar === 'string' && !rawAvatar.trim())) {
      nextAvatar = undefined;
    } else if (typeof rawAvatar === 'string') {
      const trimmed = rawAvatar.trim();
      const safe = sanitizeMediaUrl(trimmed);
      const isAllowedImage =
        Boolean(safe) &&
        (safe!.startsWith('https://') ||
          safe!.startsWith('/assets/') ||
          safe!.startsWith('data:image/'));
      if (!isAllowedImage) {
        return res.status(400).json({ error: 'Please upload a valid image (JPG, PNG, WebP, or GIF).' });
      }
      nextAvatar = safe;
    } else {
      return res.status(400).json({ error: 'Invalid profile picture format.' });
    }

    const updated = await store.updateUserAvatar(user.id, nextAvatar);
    if (!updated) {
      return res.status(404).json({ error: 'Account not found' });
    }
    broadcastSync('users');
    broadcastSync('posts');
    return res.json({
      ok: true,
      avatar: updated.avatar || null,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update profile picture' });
  }
});

app.post('/api/auth/name', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const hasBearer = Boolean(req.headers.authorization?.startsWith('Bearer '));
    if (!hasBearer) {
      const origin = req.headers.origin;
      const expectedHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
      const hasRequestedWith = req.headers['x-requested-with'] === 'XMLHttpRequest';
      let originMatches = false;
      if (typeof origin === 'string' && expectedHost) {
        try {
          originMatches = new URL(origin).host === expectedHost;
        } catch {
          originMatches = false;
        }
      }
      if (!originMatches && !hasRequestedWith) {
        return res.status(403).json({ error: 'Cross-origin request blocked' });
      }
    }

    const user = req.choyUser!;
    const rawName = typeof req.body?.name === 'string' ? req.body.name.replace(/\s+/g, ' ').trim() : '';
    if (!rawName || rawName.length < 2 || rawName.length > 60 || /[\x00-\x1f\x7f]/.test(rawName)) {
      return res.status(400).json({ error: 'Name must be between 2 and 60 characters.' });
    }
    const reserved = new Set(['vip group', 'all', 'everyone', 'system', 'member']);
    if (reserved.has(rawName.toLowerCase())) {
      return res.status(400).json({ error: 'That name is reserved. Please choose another display name.' });
    }

    const result = await store.updateUserName(user.id, rawName);
    if (!result.ok) {
      return res.status(result.code === 'conflict' ? 409 : 404).json({ error: result.error });
    }

    // Keep live SSE sessions & online presence map synchronized with the new name
    const oldKey = result.previousName.trim().toLowerCase();
    const newKey = result.user.name.trim().toLowerCase();
    if (oldKey && oldKey !== newKey && userLastSeenMap.has(oldKey)) {
      userLastSeenMap.delete(oldKey);
    }
    userLastSeenMap.set(newKey, Date.now());
    for (const client of sseClients) {
      if (client.userId === user.id) {
        client.userName = result.user.name;
      }
    }

    broadcastSync('users');
    broadcastSync('posts');
    broadcastSync('messages');

    return res.json({
      ok: true,
      name: result.user.name,
      previousName: result.previousName,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update name' });
  }
});

const handleSelfDeleteAccount = async (req: AuthedRequest, res: Response) => {
  try {
    // CSRF guard when authenticated via session cookie
    const hasBearer = Boolean(req.headers.authorization?.startsWith('Bearer '));
    if (!hasBearer) {
      const origin = req.headers.origin;
      const expectedHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
      const hasRequestedWith = req.headers['x-requested-with'] === 'XMLHttpRequest';
      let originMatches = false;
      if (typeof origin === 'string' && expectedHost) {
        try {
          originMatches = new URL(origin).host === expectedHost;
        } catch {
          originMatches = false;
        }
      }
      if (!originMatches && !hasRequestedWith) {
        return res.status(403).json({ error: 'Cross-origin request blocked' });
      }
    }

    const user = req.choyUser;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Admin account cannot be self-deleted.' });
    }

    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    if (!pin || !verifyPin(pin, user.pinHash)) {
      return res.status(401).json({ error: 'Incorrect PIN. Enter your current PIN to confirm account deletion.' });
    }

    const deleted = await store.deleteUser(user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Account could not be deleted.' });
    }

    clearSessionCookie(req, res);
    broadcastSync('users');
    return res.json({ deleted: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete account' });
  }
};

app.post('/api/auth/delete-account', requireAuth, handleSelfDeleteAccount);
app.delete('/api/auth/account', requireAuth, handleSelfDeleteAccount);

app.get('/api/choy/stream', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.choyUser!;
  touchUserPresence(user.name);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Content-Encoding', 'identity');
  res.flushHeaders?.();
  res.write(`:${' '.repeat(2048)}\n\n`);
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, uid: user.id, latestRtcSeq: rtcSignalSeq })}\n\n`);
  const client: SseClient = { res, userId: user.id, userName: user.name };
  sseClients.add(client);

  const keepAlive = setInterval(() => {
    try {
      touchUserPresence(user.name);
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(client);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(client);
  });
});

// ---- BACKGROUND WEB PUSH NOTIFICATIONS & LIVE PRESENCE ----
app.get('/api/choy/push/vapid-public-key', requireAuth, async (_req: AuthedRequest, res: Response) => {
  try {
    const publicKey = await ensureWebPushConfigured();
    return res.json({ publicKey });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Push service unavailable' });
  }
});

app.post('/api/choy/push/subscribe', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.choyUser!;
    touchUserPresence(user.name);
    const sub = req.body?.subscription || req.body;
    const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint.trim() : '';
    const p256dh = typeof sub?.keys?.p256dh === 'string' ? sub.keys.p256dh.trim() : '';
    const auth = typeof sub?.keys?.auth === 'string' ? sub.keys.auth.trim() : '';

    if (!endpoint || !endpoint.startsWith('https://') || !p256dh || !auth) {
      return res.status(400).json({ error: 'Valid push subscription with HTTPS endpoint and keys is required' });
    }

    await store.savePushSubscription({
      endpoint,
      userId: user.id,
      userName: user.name,
      keys: { p256dh, auth },
    });

    return res.json({ ok: true, subscribed: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save push subscription' });
  }
});

app.post('/api/choy/push/unsubscribe', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint.trim() : '';
    if (endpoint) {
      await store.removePushSubscription(endpoint);
    }
    return res.json({ ok: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to unsubscribe' });
  }
});

app.post('/api/choy/presence', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.choyUser!;
  touchUserPresence(user.name);
  broadcastSync('presence');
  return res.json({ ok: true, onlineUsers: getOnlineUserNames() });
});

// ---- REAL-TIME WEBRTC VIDEO CALL SIGNALING (SSE + RELIABLE POLL FALLBACK) ----
app.get('/api/choy/rtc/poll', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.choyUser!;
  const now = Date.now();
  touchUserPresence(user.name);
  pruneRtcQueue(now);

  const rawSince = Number(req.query.since);
  const since = Number.isFinite(rawSince) && rawSince > 0 ? rawSince : 0;
  const myNameLower = user.name.trim().toLowerCase();
  const minFreshTs = since === 0 ? now - 75_000 : 0;

  const matched = rtcSignalQueue.filter((item) => {
    if (item.seq <= since) return false;
    if (since === 0 && item.createdAtMs < minFreshTs) return false;
    if (item.senderUserId === user.id) return false;
    return (
      item.targetNameLower === 'vip group' ||
      item.targetNameLower === '' ||
      item.targetNameLower === myNameLower
    );
  });

  return res.json({
    signals: matched.map((m) => m.payload),
    latestSeq: rtcSignalSeq,
  });
});

app.post('/api/choy/rtc/signal', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.choyUser!;
    touchUserPresence(user.name);
    const type = typeof req.body?.type === 'string' ? req.body.type.trim() : '';
    if (!['offer', 'answer', 'ice', 'hangup', 'decline'].includes(type)) {
      return res.status(400).json({ error: 'Invalid signaling event type' });
    }
    const callId = typeof req.body?.callId === 'string' ? req.body.callId.trim().slice(0, 80) : '';
    const roomId = typeof req.body?.roomId === 'string' ? req.body.roomId.trim().slice(0, 80) : 'VIP Group';
    const targetName =
      typeof req.body?.targetName === 'string' && req.body.targetName.trim()
        ? req.body.targetName.trim().slice(0, 80)
        : roomId;

    if (!callId) {
      return res.status(400).json({ error: 'callId is required' });
    }

    const result = sendRtcSignal(targetName, user.id, {
      type,
      callId,
      roomId,
      targetName,
      fromUserId: user.id,
      fromUserName: user.name,
      sdp: req.body?.sdp ?? undefined,
      candidate: req.body?.candidate ?? undefined,
      ts: Date.now(),
    });

    // Wake closed/backgrounded devices on mobile data with Caller Profile Icon alert
    if (type === 'offer') {
      void sendWebPushToTarget(
        targetName,
        user.id,
        {
          kind: 'call',
          title: `Incoming Video Call · ${user.name}`,
          body: `${user.name} is calling you on Choy Chat. Tap Answer to join live video.`,
          icon: getSafePushIcon(user.avatar),
          badge: '/pwa-192x192.png',
          tag: `choy-call-${callId}`,
          callId,
          roomId,
          callerName: user.name,
          url: `/?incomingCall=${encodeURIComponent(callId)}&caller=${encodeURIComponent(
            user.name
          )}&room=${encodeURIComponent(roomId)}`,
        },
        'high'
      );
    } else if (type === 'hangup' || type === 'decline') {
      void sendWebPushToTarget(
        targetName,
        user.id,
        {
          kind: 'call_ended',
          callId,
          callerName: user.name,
        },
        'high'
      );
    }

    return res.json({ ok: true, ...result });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Signaling failed' });
  }
});

app.get('/api/choy/state', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.choyUser!;
    touchUserPresence(user.name);
    const isAdmin = user.role === 'admin';
    const [posts, messages, users, knowledge, leaderboard] = await Promise.all([
      store.listPosts(),
      store.listMessages(),
      store.listUsers(isAdmin),
      store.listKnowledge(),
      store.getPublicLeaderboard(),
    ]);

    let ledger = undefined;
    let settings = undefined;
    if (isAdmin) {
      [ledger, settings] = await Promise.all([store.listLedger(), store.getSettings()]);
    }

    return res.json({
      storageMode: store.storageMode,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        blockedUsers: user.blockedUsers,
        avatar: user.avatar,
      },
      posts,
      messages,
      users,
      knowledge,
      leaderboard,
      onlineUsers: getOnlineUserNames(),
      ...(isAdmin ? { ledger, settings } : {}),
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load synced state' });
  }
});

app.post('/api/choy/posts', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.choyUser!;
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const safeUrl = sanitizeMediaUrl(req.body?.mediaUrl);
    if ((!content && !safeUrl) || content.length > 2000) {
      return res.status(400).json({ error: 'Post text or an image/video is required (max 2000 chars)' });
    }
    const rawType = req.body?.mediaType;
    const mediaType: 'text' | 'image' | 'video' =
      rawType === 'image' || rawType === 'video' ? rawType : 'text';
    const rawCat = req.body?.category;
    const category: 'feed' | 'myday' | 'video' =
      rawCat === 'myday' || rawCat === 'video' ? rawCat : 'feed';

    const safeHandle = user.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'member';
    const post = await store.createPost({
      authorId: user.id,
      authorName: user.name,
      authorHandle: `@${safeHandle}`,
      authorAvatar: user.avatar || DEFAULT_PROFILE_ICON,
      content,
      mediaUrl: safeUrl,
      mediaType: safeUrl ? mediaType : 'text',
      category,
    });
    broadcastSync('posts');
    return res.status(201).json(post);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create post' });
  }
});

app.delete('/api/choy/posts/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.choyUser!;
    const ok = await store.deletePost(req.params.id, user.id, user.role === 'admin');
    if (!ok) return res.status(404).json({ error: 'Post not found or not authorized' });
    broadcastSync('posts');
    return res.json({ deleted: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete post' });
  }
});

app.post('/api/choy/messages', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.choyUser!;
    const rawRoomId = typeof req.body?.roomId === 'string' ? req.body.roomId.trim() : '';
    if (!rawRoomId || rawRoomId.length > 80 || /[\x00-\x1f\x7f]/.test(rawRoomId)) {
      return res.status(400).json({ error: 'Invalid chat room' });
    }

    let resolvedRoomId = (ALLOWED_CHAT_ROOMS as readonly string[]).find(
      (r) => r.toLowerCase() === rawRoomId.toLowerCase()
    );
    if (!resolvedRoomId) {
      const allUsers = await store.listUsers(true);
      const matchedUser = allUsers.find((u) => u.name.trim().toLowerCase() === rawRoomId.toLowerCase());
      if (matchedUser) {
        resolvedRoomId = matchedUser.name.trim();
      }
    }
    if (!resolvedRoomId) {
      return res.status(400).json({ error: 'Chat recipient not found' });
    }

    const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 2000) : '';
    const safeUrl = sanitizeMediaUrl(req.body?.mediaUrl);
    if (!text && !safeUrl) {
      return res.status(400).json({ error: 'Message text or valid media is required' });
    }
    const rawType = req.body?.mediaType;
    const mediaType: 'text' | 'image' | 'video' | 'audio' | 'file' =
      rawType === 'image' || rawType === 'video' || rawType === 'audio' || rawType === 'file' ? rawType : 'text';
    const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript.trim().slice(0, 2000) : undefined;

    const msg = await store.createMessage({
      senderId: user.id,
      senderName: user.name,
      roomId: resolvedRoomId,
      text,
      mediaUrl: safeUrl,
      mediaType: safeUrl ? mediaType : 'text',
      transcript,
    });
    broadcastSync('messages');

    // Dispatch background Web Push Notification (delivers on home screen even when app is closed)
    const isGroupRoom = resolvedRoomId.trim().toLowerCase() === 'vip group';
    const openRoom = isGroupRoom ? 'VIP Group' : user.name;
    const previewBody =
      text ||
      (mediaType === 'image'
        ? 'Sent you a photo'
        : mediaType === 'video'
        ? 'Sent you a video'
        : mediaType === 'audio'
        ? transcript || 'Sent you a voice message'
        : 'Sent you a file');
    void sendWebPushToTarget(
      resolvedRoomId,
      user.id,
      {
        kind: 'message',
        title: isGroupRoom ? `${user.name} · VIP Group` : user.name,
        body: previewBody.slice(0, 180),
        icon: getSafePushIcon(user.avatar),
        badge: '/pwa-192x192.png',
        tag: `choy-msg-${openRoom.toLowerCase()}`,
        roomId: openRoom,
        url: `/?openChat=${encodeURIComponent(openRoom)}`,
      },
      'normal'
    );

    return res.status(201).json(msg);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to send message' });
  }
});

app.post('/api/choy/messages/:id/reactions', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const emoji = typeof req.body?.emoji === 'string' ? req.body.emoji.trim() : '';
    if (!emoji || emoji.length > 16) {
      return res.status(400).json({ error: 'Valid reaction emoji required' });
    }
    const updated = await store.addReaction(req.params.id, emoji);
    if (!updated) return res.status(404).json({ error: 'Message not found or max reactions reached' });
    broadcastSync('messages');
    return res.json(updated);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to add reaction' });
  }
});

app.put('/api/choy/blocked-users', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.choyUser!;
    const list = Array.isArray(req.body?.blockedUsers) ? req.body.blockedUsers : [];
    const updated = await store.updateBlockedUsers(user.id, list);
    broadcastSync('users');
    return res.json({ blockedUsers: updated });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update blocked users' });
  }
});

app.post('/api/choy/ledger', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 100) {
      return res.status(400).json({ error: 'Valid ledger row name is required' });
    }
    const row = await store.createLedgerRow(name);
    broadcastSync('ledger');
    return res.status(201).json(row);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to add ledger row' });
  }
});

app.patch('/api/choy/ledger/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const updated = await store.updateLedgerRow(req.params.id, {
      fiveH: req.body?.fiveH !== undefined ? clampNum(req.body.fiveH, -1000000, 1000000) : undefined,
      fiveHType: req.body?.fiveHType === 'red' ? 'red' : req.body?.fiveHType === 'blue' ? 'blue' : undefined,
      bulig: req.body?.bulig !== undefined ? clampNum(req.body.bulig, -1000000, 1000000) : undefined,
      point5: req.body?.point5 !== undefined ? clampNum(req.body.point5, -1000000, 1000000) : undefined,
      halfSack: req.body?.halfSack !== undefined ? clampNum(req.body.halfSack, -1000000, 1000000) : undefined,
      oneSack: req.body?.oneSack !== undefined ? clampNum(req.body.oneSack, -1000000, 1000000) : undefined,
      bal: req.body?.bal !== undefined ? clampNum(req.body.bal, -100000000, 100000000) : undefined,
    });
    if (!updated) return res.status(404).json({ error: 'Ledger row not found' });
    broadcastSync('ledger');
    return res.json(updated);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update ledger row' });
  }
});

app.delete('/api/choy/ledger/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const ok = await store.deleteLedgerRow(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Ledger row not found' });
    broadcastSync('ledger');
    return res.json({ deleted: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete ledger row' });
  }
});

app.put('/api/choy/settings', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const current = await store.getSettings();
    const saved = await store.saveSettings({
      fiveH: req.body?.fiveH !== undefined ? clampNum(req.body.fiveH, 0, 1000000) : current.fiveH,
      bulig: req.body?.bulig !== undefined ? clampNum(req.body.bulig, 0, 1000000) : current.bulig,
      point5: req.body?.point5 !== undefined ? clampNum(req.body.point5, 0, 1000000) : current.point5,
      halfSack: req.body?.halfSack !== undefined ? clampNum(req.body.halfSack, 0, 1000000) : current.halfSack,
      oneSack: req.body?.oneSack !== undefined ? clampNum(req.body.oneSack, 0, 1000000) : current.oneSack,
      defFiveH: req.body?.defFiveH !== undefined ? clampNum(req.body.defFiveH, 0, 1000000) : current.defFiveH,
      defBulig: req.body?.defBulig !== undefined ? clampNum(req.body.defBulig, 0, 1000000) : current.defBulig,
      defPoint5: req.body?.defPoint5 !== undefined ? clampNum(req.body.defPoint5, 0, 1000000) : current.defPoint5,
      defHalfSack: req.body?.defHalfSack !== undefined ? clampNum(req.body.defHalfSack, 0, 1000000) : current.defHalfSack,
      defOneSack: req.body?.defOneSack !== undefined ? clampNum(req.body.defOneSack, 0, 1000000) : current.defOneSack,
    });
    if (req.body?.applyQuantitiesToAll === true) {
      await store.applyDefaultQuantitiesToAll({
        defFiveH: saved.defFiveH,
        defBulig: saved.defBulig,
        defPoint5: saved.defPoint5,
        defHalfSack: saved.defHalfSack,
        defOneSack: saved.defOneSack,
      });
    }
    broadcastSync('settings');
    return res.json(saved);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save settings' });
  }
});

app.post('/api/choy/knowledge', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim() : '';
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }
    const item = await store.createKnowledge(question, answer);
    broadcastSync('knowledge');
    return res.status(201).json(item);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to add knowledge' });
  }
});

app.delete('/api/choy/knowledge/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const ok = await store.deleteKnowledge(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Knowledge entry not found' });
    broadcastSync('knowledge');
    return res.json({ deleted: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete knowledge' });
  }
});

app.post('/api/choy/users', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const pin =
      typeof req.body?.pin === 'string' && req.body.pin.trim().length >= 4
        ? req.body.pin.trim()
        : crypto.randomBytes(12).toString('hex');
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    const existing = await store.getUserByPhone(phone);
    if (existing) {
      return res.status(409).json({ error: 'Phone number already exists' });
    }
    const user = await store.createUser({
      name,
      phone,
      pin,
      role: 'member',
      status: 'approved',
    });
    broadcastSync('users');
    return res.status(201).json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      loginDate: user.updatedAt.slice(0, 16).replace('T', ' '),
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to add user' });
  }
});

const handleUpdateUserStatusRoute = async (req: AuthedRequest, res: Response) => {
  try {
    const rawStatus = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : '';
    if (rawStatus !== 'approved' && rawStatus !== 'pending') {
      return res.status(400).json({ error: 'Status must be either "approved" or "pending"' });
    }
    const status: 'approved' | 'pending' = rawStatus;
    const ok = await store.updateUserStatus(req.params.id, status);
    if (!ok) {
      return res.status(404).json({ error: 'User not found or admin status cannot be set to pending' });
    }
    broadcastSync('users');
    return res.json({ id: req.params.id, status });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update status' });
  }
};

app.patch('/api/choy/users/:id/status', requireAuth, requireAdmin, handleUpdateUserStatusRoute);
app.post('/api/choy/users/:id/status', requireAuth, requireAdmin, handleUpdateUserStatusRoute);

app.post('/api/choy/users/approve-all', requireAuth, requireAdmin, async (_req: AuthedRequest, res: Response) => {
  try {
    const approvedCount = await store.approveAllPendingUsers();
    broadcastSync('users');
    return res.json({ approvedCount });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to approve pending users' });
  }
});

app.delete('/api/choy/users/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const ok = await store.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ error: 'User not found or cannot delete admin' });
    broadcastSync('users');
    return res.json({ deleted: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete user' });
  }
});

// Initialize GoogleGenAI client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper for GitHub headers
function getGitHubHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitPulse-AI-App',
  };
}

// 1. Get GitHub OAuth Auth URL
app.get('/api/auth/github/url', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID || process.env.OAUTH_CLIENT_ID || '';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirectUri = `${protocol}://${host}/auth/callback`;

  if (!clientId) {
    return res.status(400).json({ 
      error: 'GitHub Client ID not configured. Please set GITHUB_CLIENT_ID in secrets or use a Personal Access Token.' 
    });
  }

  const scopes = 'repo user read:org';
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
  
  res.json({ url: authUrl, redirectUri });
});

// 2. OAuth Callback Handler
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID || process.env.OAUTH_CLIENT_ID || '';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || '';

  if (!code) {
    return res.send(`<html><body><h3>Authentication failed: No code provided</h3><script>setTimeout(() => window.close(), 2000);</script></body></html>`);
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };

    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error || 'Failed to obtain access token from GitHub');
    }

    const accessToken = tokenData.access_token;

    // Send success message to opener window via postMessage and close popup
    res.send(`
      <html>
        <body style="background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 12px; color: #38bdf8;">Successfully Connected to GitHub!</div>
            <p style="color: #94a3b8;">Closing window and returning to GitPulse AI...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS', token: '${accessToken}' }, '*');
              setTimeout(() => window.close(), 1000);
            } else {
              window.location.href = '/?token=${accessToken}';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.send(`<html><body style="background:#0f172a;color:#ef4444;font-family:sans-serif;padding:40px;"><h3>Authentication Error</h3><p>${err.message}</p></body></html>`);
  }
});

// 3. Get GitHub User Profile
app.get('/api/github/user', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated with GitHub' });
  }

  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: getGitHubHeaders(token),
    });
    if (!userRes.ok) {
      throw new Error(`GitHub API error: ${userRes.statusText}`);
    }
    const userData = await userRes.json();
    res.json(userData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get User Repositories
app.get('/api/github/repos', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string;
  const search = req.query.search as string;

  try {
    const reposRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: token ? getGitHubHeaders(token) : { 'User-Agent': 'GitPulse-AI' },
    });

    if (!reposRes.ok) {
      const pubRes = await fetch('https://api.github.com/repositories?per_page=50', {
        headers: { 'User-Agent': 'GitPulse-AI' },
      });
      const pubData = await pubRes.json();
      const filtered = search ? pubData.filter((r: any) => r.full_name.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase())) : pubData;
      return res.json(filtered);
    }

    const data = await reposRes.json();
    const repoList = Array.isArray(data) ? data : [];
    if (search) {
      const query = search.toLowerCase();
      const filtered = repoList.filter((r: any) => 
        r.name.toLowerCase().includes(query) || 
        r.full_name.toLowerCase().includes(query) || 
        (r.description && r.description.toLowerCase().includes(query))
      );
      return res.json(filtered);
    }

    res.json(repoList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get Repo Details, Issues, PRs, Branches
app.get('/api/github/repo/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  const token = req.headers.authorization?.replace('Bearer ', '') || '';

  try {
    const headers = token ? getGitHubHeaders(token) : { 'User-Agent': 'GitPulse-AI' };

    const [repoRes, issuesRes, prsRes, branchesRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=10`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=10`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=10`, { headers }),
    ]);

    const repoData = await repoRes.json();
    const issuesData = await issuesRes.ok ? await issuesRes.json() : [];
    const prsData = await prsRes.ok ? await prsRes.json() : [];
    const branchesData = await branchesRes.ok ? await branchesRes.json() : [];

    if (!repoRes.ok) {
      return res.status(repoRes.status).json({ error: repoData.message || 'Failed to fetch repository' });
    }

    res.json({
      repo: repoData,
      issues: issuesData,
      pullRequests: prsData,
      branches: branchesData,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5b. GitHub Intelligence — Secure Repo Structure & Latest Commit Activity Proxy
function parseGitHubRepoInput(rawInput: string): { owner: string; repo: string; branchFromUrl?: string } | null {
  const trimmed = rawInput.trim();
  if (!trimmed || trimmed.length > 300) return null;

  let owner = '';
  let repo = '';
  let branchFromUrl: string | undefined;

  if (/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(trimmed)) {
    const parts = trimmed.split('/');
    owner = parts[0];
    repo = parts[1].replace(/\.git$/i, '');
  } else {
    let normalized = trimmed;
    if (/^github\.com\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }
    try {
      const parsed = new URL(normalized);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
      const host = parsed.hostname.toLowerCase();
      if (host !== 'github.com' && host !== 'www.github.com') return null;
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length < 2) return null;
      owner = segments[0];
      repo = segments[1].replace(/\.git$/i, '');
      if (segments[2] === 'tree' && segments[3]) {
        branchFromUrl = decodeURIComponent(segments.slice(3).join('/'));
      }
    } catch {
      return null;
    }
  }

  const validOwner = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner);
  const validRepo = /^[A-Za-z0-9._-]{1,100}$/.test(repo) && repo !== '.' && repo !== '..';
  if (!validOwner || !validRepo) return null;

  if (branchFromUrl && (!/^[A-Za-z0-9._/-]{1,120}$/.test(branchFromUrl) || branchFromUrl.includes('..'))) {
    branchFromUrl = undefined;
  }

  return { owner, repo, branchFromUrl };
}

function safeGitHubExternalUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && (parsed.hostname === 'github.com' || parsed.hostname === 'avatars.githubusercontent.com')) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

app.post('/api/github/intelligence', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    // CSRF guard when authenticated via session cookie
    const hasBearer = Boolean(req.headers.authorization?.startsWith('Bearer '));
    if (!hasBearer) {
      const origin = req.headers.origin;
      const expectedHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
      const hasRequestedWith = req.headers['x-requested-with'] === 'XMLHttpRequest';
      let originMatches = false;
      if (typeof origin === 'string' && expectedHost) {
        try {
          originMatches = new URL(origin).host === expectedHost;
        } catch {
          originMatches = false;
        }
      }
      if (!originMatches && !hasRequestedWith) {
        return res.status(403).json({ error: 'Cross-origin request blocked' });
      }
    }

    const repoUrl = typeof req.body?.repoUrl === 'string' ? req.body.repoUrl : '';
    const userPat = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const requestedBranch = typeof req.body?.branch === 'string' ? req.body.branch.trim() : '';
    const rawCommitLimit = Number(req.body?.commitLimit);
    const commitLimit =
      Number.isInteger(rawCommitLimit) && rawCommitLimit >= 1 && rawCommitLimit <= 20 ? rawCommitLimit : 5;

    const parsedRepo = parseGitHubRepoInput(repoUrl);
    if (!parsedRepo) {
      return res.status(400).json({
        error: 'Please enter a valid GitHub repository URL (for example: https://github.com/owner/repo or owner/repo).',
      });
    }

    if (requestedBranch && (!/^[A-Za-z0-9._/-]{1,120}$/.test(requestedBranch) || requestedBranch.includes('..'))) {
      return res.status(400).json({ error: 'Invalid branch name.' });
    }

    const effectiveToken = userPat || (process.env.GITHUB_TOKEN || '').trim();
    const ghHeaders: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ChoyChat-GitHub-Intelligence',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (effectiveToken) {
      ghHeaders.Authorization = `Bearer ${effectiveToken}`;
    }

    const baseApi = `https://api.github.com/repos/${encodeURIComponent(parsedRepo.owner)}/${encodeURIComponent(parsedRepo.repo)}`;
    const repoRes = await fetch(baseApi, { headers: ghHeaders });
    const repoJson: any = await repoRes.json().catch(() => ({}));

    if (!repoRes.ok) {
      const ghMsg = typeof repoJson?.message === 'string' ? repoJson.message : 'GitHub API error';
      if (repoRes.status === 401) {
        return res.status(401).json({ error: 'GitHub rejected the personal access token. Please verify the token and its scopes.' });
      }
      if (repoRes.status === 404) {
        return res.status(404).json({
          error: 'Repository not found. If it is private, provide a Personal Access Token with repo read access.',
        });
      }
      if (repoRes.status === 403) {
        return res.status(403).json({
          error: ghMsg.toLowerCase().includes('rate limit')
            ? 'GitHub API rate limit reached. Add a Personal Access Token to increase your limit.'
            : `Access denied by GitHub: ${ghMsg}`,
        });
      }
      return res.status(repoRes.status).json({ error: ghMsg });
    }

    const defaultBranch = typeof repoJson.default_branch === 'string' ? repoJson.default_branch : 'main';
    const targetBranch = requestedBranch || parsedRepo.branchFromUrl || defaultBranch;

    const [branchesRes, langsRes, treeRes, commitsRes, readmeRes] = await Promise.all([
      fetch(`${baseApi}/branches?per_page=25`, { headers: ghHeaders }),
      fetch(`${baseApi}/languages`, { headers: ghHeaders }),
      fetch(`${baseApi}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1`, { headers: ghHeaders }),
      fetch(`${baseApi}/commits?sha=${encodeURIComponent(targetBranch)}&per_page=${commitLimit}`, { headers: ghHeaders }),
      fetch(`${baseApi}/readme?ref=${encodeURIComponent(targetBranch)}`, { headers: ghHeaders }),
    ]);

    const branchesRaw: any = branchesRes.ok ? await branchesRes.json().catch(() => []) : [];
    const langsRaw: any = langsRes.ok ? await langsRes.json().catch(() => ({})) : {};
    const treeRaw: any = treeRes.ok ? await treeRes.json().catch(() => ({ tree: [] })) : { tree: [] };
    const commitsRaw: any = commitsRes.ok ? await commitsRes.json().catch(() => []) : [];
    const readmeRaw: any = readmeRes.ok ? await readmeRes.json().catch(() => null) : null;

    let readme: {
      name: string;
      path: string;
      size: number;
      htmlUrl: string | null;
      content: string;
      truncated: boolean;
    } | null = null;
    if (readmeRaw && typeof readmeRaw.content === 'string') {
      const MAX_README_CHARS = 120_000;
      const decoded =
        readmeRaw.encoding === 'base64'
          ? Buffer.from(readmeRaw.content.replace(/\s+/g, ''), 'base64').toString('utf8')
          : readmeRaw.content;
      const truncated = decoded.length > MAX_README_CHARS;
      readme = {
        name: typeof readmeRaw.name === 'string' && readmeRaw.name ? readmeRaw.name : 'README.md',
        path: typeof readmeRaw.path === 'string' && readmeRaw.path ? readmeRaw.path : 'README.md',
        size: typeof readmeRaw.size === 'number' && readmeRaw.size >= 0 ? readmeRaw.size : Buffer.byteLength(decoded, 'utf8'),
        htmlUrl: safeGitHubExternalUrl(readmeRaw.html_url),
        content: truncated ? decoded.slice(0, MAX_README_CHARS) : decoded,
        truncated,
      };
    }

    const branches: string[] = Array.isArray(branchesRaw)
      ? branchesRaw
          .map((b: any) => (typeof b?.name === 'string' ? b.name : ''))
          .filter(Boolean)
      : [targetBranch];
    if (!branches.includes(targetBranch)) {
      branches.unshift(targetBranch);
    }

    // Language breakdown
    const langEntries =
      langsRaw && typeof langsRaw === 'object'
        ? Object.entries(langsRaw).filter(([, val]) => typeof val === 'number' && val > 0)
        : [];
    const totalLangBytes = langEntries.reduce((sum, [, val]) => sum + Number(val), 0);
    const languages = langEntries
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .map(([name, val]) => ({
        name,
        bytes: Number(val),
        percent: totalLangBytes > 0 ? Number(((Number(val) / totalLangBytes) * 100).toFixed(1)) : 0,
      }));

    // Repository structure summary
    const rawTreeItems: any[] = Array.isArray(treeRaw?.tree) ? treeRaw.tree : [];
    let totalFiles = 0;
    let totalDirectories = 0;
    let totalBytes = 0;
    const folderMap = new Map<string, { fileCount: number; totalBytes: number }>();
    const extMap = new Map<string, number>();
    const keyManifestNames = new Set([
      'package.json',
      'tsconfig.json',
      'dockerfile',
      'render.yaml',
      'docker-compose.yml',
      'docker-compose.yaml',
      'readme.md',
      'vite.config.ts',
      'vite.config.js',
      'next.config.js',
      'next.config.mjs',
      'next.config.ts',
      'cargo.toml',
      'go.mod',
      'requirements.txt',
      'pyproject.toml',
      'prisma/schema.prisma',
    ]);
    const keyFiles: string[] = [];
    const tree: Array<{ path: string; type: 'blob' | 'tree'; size: number }> = [];

    for (const item of rawTreeItems) {
      const itemPath = typeof item?.path === 'string' ? item.path : '';
      const itemType = item?.type === 'tree' ? 'tree' : item?.type === 'blob' ? 'blob' : null;
      if (!itemPath || !itemType) continue;
      const size = typeof item?.size === 'number' && item.size > 0 ? item.size : 0;

      if (tree.length < 1500) {
        tree.push({ path: itemPath, type: itemType, size });
      }

      if (itemType === 'tree') {
        totalDirectories += 1;
      } else {
        totalFiles += 1;
        totalBytes += size;
        const slashIdx = itemPath.indexOf('/');
        const topFolder = slashIdx === -1 ? '(root)' : itemPath.slice(0, slashIdx);
        const existingFolder = folderMap.get(topFolder) || { fileCount: 0, totalBytes: 0 };
        existingFolder.fileCount += 1;
        existingFolder.totalBytes += size;
        folderMap.set(topFolder, existingFolder);

        const baseName = itemPath.slice(itemPath.lastIndexOf('/') + 1);
        const dotIdx = baseName.lastIndexOf('.');
        const ext = dotIdx > 0 ? baseName.slice(dotIdx).toLowerCase() : '(no ext)';
        extMap.set(ext, (extMap.get(ext) || 0) + 1);

        if (keyManifestNames.has(itemPath.toLowerCase()) || (!itemPath.includes('/') && keyManifestNames.has(baseName.toLowerCase()))) {
          keyFiles.push(itemPath);
        }
      }
    }

    const topLevelFolders = Array.from(folderMap.entries())
      .map(([name, info]) => ({ name, fileCount: info.fileCount, totalBytes: info.totalBytes }))
      .sort((a, b) => b.fileCount - a.fileCount);

    const extensions = Array.from(extMap.entries())
      .map(([ext, count]) => ({ ext, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Commits & active contributor summary
    const contributorMap = new Map<
      string,
      { name: string; login: string | null; avatar: string | null; commitCount: number; latestDate: string | null }
    >();

    const commits = (Array.isArray(commitsRaw) ? commitsRaw : []).slice(0, commitLimit).map((c: any) => {
      const fullMessage = typeof c?.commit?.message === 'string' ? c.commit.message : '';
      const [firstLine, ...restLines] = fullMessage.split('\n');
      const authorName =
        (typeof c?.commit?.author?.name === 'string' && c.commit.author.name) ||
        (typeof c?.author?.login === 'string' && c.author.login) ||
        'Unknown Author';
      const authorLogin = typeof c?.author?.login === 'string' ? c.author.login : null;
      const authorAvatar = safeGitHubExternalUrl(c?.author?.avatar_url);
      const date = typeof c?.commit?.author?.date === 'string' ? c.commit.author.date : null;
      const sha = typeof c?.sha === 'string' ? c.sha : '';

      const contribKey = authorLogin || authorName;
      const existingContrib = contributorMap.get(contribKey);
      if (existingContrib) {
        existingContrib.commitCount += 1;
      } else {
        contributorMap.set(contribKey, {
          name: authorName,
          login: authorLogin,
          avatar: authorAvatar,
          commitCount: 1,
          latestDate: date,
        });
      }

      return {
        sha,
        shortSha: sha.slice(0, 7),
        message: fullMessage.trim() || '(no commit message)',
        title: firstLine.trim() || '(no commit message)',
        body: restLines.join('\n').trim(),
        authorName,
        authorLogin,
        authorAvatar,
        date,
        htmlUrl: safeGitHubExternalUrl(c?.html_url),
        verified: Boolean(c?.commit?.verification?.verified),
      };
    });

    const contributors = Array.from(contributorMap.values()).sort((a, b) => b.commitCount - a.commitCount);

    return res.json({
      repo: {
        name: String(repoJson.name || parsedRepo.repo),
        fullName: String(repoJson.full_name || `${parsedRepo.owner}/${parsedRepo.repo}`),
        description: typeof repoJson.description === 'string' ? repoJson.description : '',
        visibility: typeof repoJson.visibility === 'string' ? repoJson.visibility : repoJson.private ? 'private' : 'public',
        isPrivate: Boolean(repoJson.private),
        defaultBranch,
        selectedBranch: targetBranch,
        htmlUrl: safeGitHubExternalUrl(repoJson.html_url) || '',
        stars: Number(repoJson.stargazers_count) || 0,
        forks: Number(repoJson.forks_count) || 0,
        openIssues: Number(repoJson.open_issues_count) || 0,
        watchers: Number(repoJson.subscribers_count ?? repoJson.watchers_count) || 0,
        sizeKb: Number(repoJson.size) || 0,
        license: typeof repoJson?.license?.name === 'string' ? repoJson.license.name : null,
        pushedAt: typeof repoJson.pushed_at === 'string' ? repoJson.pushed_at : null,
        updatedAt: typeof repoJson.updated_at === 'string' ? repoJson.updated_at : null,
        ownerLogin: typeof repoJson?.owner?.login === 'string' ? repoJson.owner.login : parsedRepo.owner,
        ownerAvatar: safeGitHubExternalUrl(repoJson?.owner?.avatar_url),
      },
      branches,
      languages,
      structure: {
        totalFiles,
        totalDirectories,
        totalBytes,
        truncated: Boolean(treeRaw?.truncated),
        topLevelFolders,
        keyFiles,
        extensions,
        tree,
      },
      commits,
      contributors,
      readme,
      authenticatedWithToken: Boolean(effectiveToken),
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to inspect GitHub repository',
    });
  }
});

app.post('/api/github/file', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    // CSRF guard when authenticated via session cookie
    const hasBearer = Boolean(req.headers.authorization?.startsWith('Bearer '));
    if (!hasBearer) {
      const origin = req.headers.origin;
      const expectedHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
      const hasRequestedWith = req.headers['x-requested-with'] === 'XMLHttpRequest';
      let originMatches = false;
      if (typeof origin === 'string' && expectedHost) {
        try {
          originMatches = new URL(origin).host === expectedHost;
        } catch {
          originMatches = false;
        }
      }
      if (!originMatches && !hasRequestedWith) {
        return res.status(403).json({ error: 'Cross-origin request blocked' });
      }
    }

    const repoUrl = typeof req.body?.repoUrl === 'string' ? req.body.repoUrl : '';
    const userPat = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const requestedBranch = typeof req.body?.branch === 'string' ? req.body.branch.trim() : '';
    const rawFilePath = typeof req.body?.path === 'string' ? req.body.path.trim().replace(/^\/+/, '') : '';

    const parsedRepo = parseGitHubRepoInput(repoUrl);
    if (!parsedRepo) {
      return res.status(400).json({ error: 'Invalid GitHub repository URL.' });
    }

    if (requestedBranch && (!/^[A-Za-z0-9._/-]{1,120}$/.test(requestedBranch) || requestedBranch.includes('..'))) {
      return res.status(400).json({ error: 'Invalid branch name.' });
    }

    if (
      !rawFilePath ||
      rawFilePath.length > 500 ||
      rawFilePath.includes('\0') ||
      rawFilePath.includes('\\') ||
      rawFilePath.split('/').some((seg: string) => seg === '' || seg === '.' || seg === '..')
    ) {
      return res.status(400).json({ error: 'Invalid repository file path.' });
    }

    const effectiveToken = userPat || (process.env.GITHUB_TOKEN || '').trim();
    const ghHeaders: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ChoyChat-GitHub-Intelligence',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (effectiveToken) {
      ghHeaders.Authorization = `Bearer ${effectiveToken}`;
    }

    const encodedFilePath = rawFilePath
      .split('/')
      .map((segment: string) => encodeURIComponent(segment))
      .join('/');
    const baseApi = `https://api.github.com/repos/${encodeURIComponent(parsedRepo.owner)}/${encodeURIComponent(parsedRepo.repo)}`;
    const queryRef = requestedBranch ? `?ref=${encodeURIComponent(requestedBranch)}` : '';
    const fileRes = await fetch(`${baseApi}/contents/${encodedFilePath}${queryRef}`, { headers: ghHeaders });
    const fileJson: any = await fileRes.json().catch(() => ({}));

    if (!fileRes.ok) {
      const ghMsg = typeof fileJson?.message === 'string' ? fileJson.message : 'GitHub API error';
      if (fileRes.status === 401) {
        return res.status(401).json({ error: 'GitHub rejected the personal access token.' });
      }
      if (fileRes.status === 404) {
        return res.status(404).json({ error: 'File not found on this branch.' });
      }
      if (fileRes.status === 403 && ghMsg.toLowerCase().includes('rate limit')) {
        return res.status(403).json({
          error: 'GitHub API rate limit reached. Add a Personal Access Token to preview more files.',
        });
      }
      return res.status(fileRes.status).json({ error: ghMsg });
    }

    if (Array.isArray(fileJson) || fileJson?.type !== 'file') {
      return res.status(400).json({ error: 'Selected path is not a previewable file.' });
    }

    const fileName = typeof fileJson.name === 'string' ? fileJson.name : rawFilePath.split('/').pop() || rawFilePath;
    const filePath = typeof fileJson.path === 'string' ? fileJson.path : rawFilePath;
    const fileSize = typeof fileJson.size === 'number' && fileJson.size >= 0 ? fileJson.size : 0;
    const htmlUrl = safeGitHubExternalUrl(fileJson.html_url);
    const sha = typeof fileJson.sha === 'string' ? fileJson.sha : '';

    const BINARY_EXTENSIONS = new Set([
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.tiff',
      '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
      '.woff', '.woff2', '.ttf', '.otf', '.eot',
      '.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg',
      '.exe', '.dll', '.so', '.dylib', '.bin', '.wasm', '.pyc', '.class', '.jar',
    ]);
    const dotIdx = fileName.lastIndexOf('.');
    const ext = dotIdx > 0 ? fileName.slice(dotIdx).toLowerCase() : '';

    if (BINARY_EXTENSIONS.has(ext)) {
      return res.json({
        name: fileName,
        path: filePath,
        size: fileSize,
        sha,
        htmlUrl,
        content: '',
        lineCount: 0,
        truncated: false,
        isBinary: true,
        tooLarge: false,
      });
    }

    const MAX_PREVIEW_BYTES = 512 * 1024;
    if (fileSize > MAX_PREVIEW_BYTES || typeof fileJson.content !== 'string') {
      return res.json({
        name: fileName,
        path: filePath,
        size: fileSize,
        sha,
        htmlUrl,
        content: '',
        lineCount: 0,
        truncated: false,
        isBinary: false,
        tooLarge: true,
      });
    }

    const rawBuffer =
      fileJson.encoding === 'base64'
        ? Buffer.from(fileJson.content.replace(/\s+/g, ''), 'base64')
        : Buffer.from(fileJson.content, 'utf8');

    // Detect binary content via NUL byte check in the first 8KB
    const sampleSlice = rawBuffer.subarray(0, Math.min(rawBuffer.length, 8192));
    if (sampleSlice.includes(0)) {
      return res.json({
        name: fileName,
        path: filePath,
        size: fileSize,
        sha,
        htmlUrl,
        content: '',
        lineCount: 0,
        truncated: false,
        isBinary: true,
        tooLarge: false,
      });
    }

    const MAX_PREVIEW_CHARS = 150_000;
    const decodedText = rawBuffer.toString('utf8');
    const truncated = decodedText.length > MAX_PREVIEW_CHARS;
    const finalContent = truncated ? decodedText.slice(0, MAX_PREVIEW_CHARS) : decodedText;
    const lineCount = finalContent === '' ? 0 : finalContent.split(/\r?\n/).length;

    return res.json({
      name: fileName,
      path: filePath,
      size: fileSize,
      sha,
      htmlUrl,
      content: finalContent,
      lineCount,
      truncated,
      isBinary: false,
      tooLarge: false,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to fetch repository file contents',
    });
  }
});

// 6. Gemini AI Code Review on PR or Code
app.post('/api/github/ai-review', async (req, res) => {
  const { owner, repo, prNumber, codeSnippet, title } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '') || '';

  try {
    let diffContent = codeSnippet || '';

    // If prNumber is provided, fetch PR diff from GitHub
    if (prNumber && owner && repo) {
      const headers = {
        ...(token ? getGitHubHeaders(token) : { 'User-Agent': 'GitPulse-AI' }),
        'Accept': 'application/vnd.github.v3.diff',
      };
      const diffRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, { headers });
      if (diffRes.ok) {
        diffContent = await diffRes.text();
      }
    }

    const prompt = `You are an expert Principal Software Engineer and Security Auditor performing an AI Code Review for a GitHub ${prNumber ? `Pull Request #${prNumber}` : 'code snippet'}: ${title || ''}

Here is the code diff / content to review:
\`\`\`
${diffContent.slice(0, 15000)}
\`\`\`

Provide a comprehensive, professional code review in JSON format with the following structure:
{
  "summary": "1-2 sentence executive summary of the changes and overall quality.",
  "score": 88, // integer score out of 100
  "strengths": ["strength 1", "strength 2"],
  "issues": [
    {
      "severity": "critical" | "warning" | "suggestion",
      "file": "filename or general",
      "line": "approx line number or range",
      "title": "Short title of issue",
      "description": "Detailed explanation and recommendation.",
      "suggestedFix": "Code snippet or advice for fix"
    }
  ],
  "securityNotes": "Any security vulnerability check summary."
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const resultJson = JSON.parse(response.text || '{}');
    res.json(resultJson);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Gemini AI Repository Chat Assistant
app.post('/api/github/ai-chat', async (req, res) => {
  const { question, repoName, description, language } = req.body;

  try {
    const prompt = `You are GitPulse AI, an expert GitHub repository assistant.
Repository: ${repoName || 'Unknown'}
Description: ${description || 'No description'}
Primary Language: ${language || 'Unknown'}

User Question: ${question}

Provide a clear, concise, and highly accurate technical answer with code examples if helpful.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
    });

    res.json({ answer: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Gemini AI Documentation & Release Notes Generator
app.post('/api/github/generate-docs', async (req, res) => {
  const { repoName, description, type, recentCommits } = req.body; // type: 'readme' | 'changelog'

  try {
    const prompt = type === 'readme' 
      ? `Generate a professional, production-grade GitHub README.md markdown for repository "${repoName}". Description: "${description}". Include badges, installation instructions, quick start, features, and license section.`
      : `Generate professional GitHub release notes / changelog for repository "${repoName}". Recent Context: "${recentCommits || description}". Group into Features, Bug Fixes, and Performance Improvements with clean Markdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
    });

    res.json({ content: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (isProd) {
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.webmanifest')) {
            res.setHeader('Content-Type', 'application/manifest+json');
            res.setHeader('Cache-Control', 'no-cache');
          } else if (filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      })
    );

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
      plugins: [
        {
          name: 'disable-hmr-websocket-connect',
          transform(code, id) {
            if (id.includes('vite/dist/client/client.mjs')) {
              return code
                .replace(
                  'transport.connect(createHMRHandler(handleMessage));',
                  '/* HMR WebSocket disabled in middleware mode */'
                )
                .replace(
                  'throw new SendBeforeConnectError("send was called before connect");',
                  'return;'
                )
                .replace(
                  'throw new SendBeforeConnectError("invoke was called before connect");',
                  'return;'
                );
            }
          },
        },
      ],
    });

    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
