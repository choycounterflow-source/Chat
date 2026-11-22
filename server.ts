import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
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
const sseClients = new Set<Response>();

function broadcastSync(topic: string) {
  const payload = `event: sync\ndata: ${JSON.stringify({ topic, ts: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
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
app.use(express.json({ limit: '10mb' }));

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
      if (!user || (user.status !== 'approved' && user.role !== 'admin')) {
        return res.status(403).json({ error: 'Account must be approved to upload media' });
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
      status: 'pending',
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
        },
      });
    }

    const user = await store.getUserByPhone(phone);
    if (!user || !verifyPin(pin, user.pinHash)) {
      return res.status(401).json({ error: 'Invalid phone or PIN' });
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
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Login failed' });
  }
});

app.get('/api/choy/stream', requireAuth, (req: AuthedRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  sseClients.add(res);

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

app.get('/api/choy/state', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.choyUser!;
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
      },
      posts,
      messages,
      users,
      knowledge,
      leaderboard,
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
      authorAvatar: '/assets/aistudio/image_20261121_145253_f477cbfa.webp',
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
    const roomId = typeof req.body?.roomId === 'string' ? req.body.roomId.trim() : '';
    if (!(ALLOWED_CHAT_ROOMS as readonly string[]).includes(roomId)) {
      return res.status(400).json({ error: 'Invalid chat room' });
    }
    const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 2000) : '';
    const safeUrl = sanitizeMediaUrl(req.body?.mediaUrl);
    if (!text && !safeUrl) {
      return res.status(400).json({ error: 'Message text or valid URL is required' });
    }
    const rawType = req.body?.mediaType;
    const mediaType: 'text' | 'image' | 'video' | 'audio' | 'file' =
      rawType === 'image' || rawType === 'video' || rawType === 'audio' || rawType === 'file' ? rawType : 'text';

    const msg = await store.createMessage({
      senderId: user.id,
      senderName: user.name,
      roomId,
      text,
      mediaUrl: safeUrl,
      mediaType: safeUrl ? mediaType : 'text',
    });
    broadcastSync('messages');
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

app.patch('/api/choy/users/:id/status', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const status = req.body?.status === 'approved' ? 'approved' : 'pending';
    const ok = await store.updateUserStatus(req.params.id, status);
    if (!ok) return res.status(404).json({ error: 'User not found' });
    broadcastSync('users');
    return res.json({ id: req.params.id, status });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update status' });
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
