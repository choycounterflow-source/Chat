import crypto from 'crypto';

export type MediaCategory = 'image' | 'video' | 'audio';
export type UploadFolder = 'posts' | 'messages' | 'voice' | 'avatars';

export interface SupabaseStorageStatus {
  configured: boolean;
  bucket: string;
  hasUrl: boolean;
  hasServiceKey: boolean;
}

export interface SupabaseUploadResult {
  url: string;
  path: string;
  bucket: string;
  mediaType: MediaCategory;
  mimeType: string;
  sizeBytes: number;
}

interface MimeSpec {
  ext: string;
  category: MediaCategory;
  maxBytes: number;
}

const ALLOWED_MIME_MAP: Record<string, MimeSpec> = {
  'image/jpeg': { ext: '.jpg', category: 'image', maxBytes: 10 * 1024 * 1024 },
  'image/jpg': { ext: '.jpg', category: 'image', maxBytes: 10 * 1024 * 1024 },
  'image/png': { ext: '.png', category: 'image', maxBytes: 10 * 1024 * 1024 },
  'image/webp': { ext: '.webp', category: 'image', maxBytes: 10 * 1024 * 1024 },
  'image/gif': { ext: '.gif', category: 'image', maxBytes: 10 * 1024 * 1024 },
  'video/mp4': { ext: '.mp4', category: 'video', maxBytes: 25 * 1024 * 1024 },
  'video/webm': { ext: '.webm', category: 'video', maxBytes: 25 * 1024 * 1024 },
  'video/quicktime': { ext: '.mov', category: 'video', maxBytes: 25 * 1024 * 1024 },
  'audio/webm': { ext: '.webm', category: 'audio', maxBytes: 15 * 1024 * 1024 },
  'audio/ogg': { ext: '.ogg', category: 'audio', maxBytes: 15 * 1024 * 1024 },
  'audio/mp4': { ext: '.m4a', category: 'audio', maxBytes: 15 * 1024 * 1024 },
  'audio/mpeg': { ext: '.mp3', category: 'audio', maxBytes: 15 * 1024 * 1024 },
  'audio/mp3': { ext: '.mp3', category: 'audio', maxBytes: 15 * 1024 * 1024 },
  'audio/wav': { ext: '.wav', category: 'audio', maxBytes: 15 * 1024 * 1024 },
  'audio/aac': { ext: '.aac', category: 'audio', maxBytes: 15 * 1024 * 1024 },
  'audio/x-m4a': { ext: '.m4a', category: 'audio', maxBytes: 15 * 1024 * 1024 },
};

const ALLOWED_FOLDERS = new Set<UploadFolder>(['posts', 'messages', 'voice', 'avatars']);

let ensuredBucketKey = '';

function stripOuterQuotes(val: string): string {
  const t = val.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

function getValidatedSupabaseOrigin(): string {
  const raw = stripOuterQuotes(process.env.SUPABASE_URL || '');
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return '';
    const host = parsed.hostname.toLowerCase();
    if (!host.endsWith('.supabase.co') && !host.endsWith('.supabase.in')) {
      return '';
    }
    return parsed.origin;
  } catch {
    return '';
  }
}

function getSupabaseServiceKey(): string {
  return stripOuterQuotes(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
  );
}

function getSanitizedBucket(): string {
  const raw = stripOuterQuotes(process.env.SUPABASE_BUCKET || 'choychat-media').toLowerCase();
  if (/^[a-z0-9][a-z0-9._-]{1,62}$/.test(raw)) {
    return raw;
  }
  return 'choychat-media';
}

export function normalizeMediaMime(rawContentType: string | undefined): string {
  if (!rawContentType) return '';
  return rawContentType.split(';')[0].trim().toLowerCase();
}

export function sanitizeUploadFolder(rawFolder: string | undefined): UploadFolder {
  const normalized = (rawFolder || '').trim().toLowerCase() as UploadFolder;
  return ALLOWED_FOLDERS.has(normalized) ? normalized : 'posts';
}

export function getSupabaseStorageStatus(): SupabaseStorageStatus {
  const origin = getValidatedSupabaseOrigin();
  const serviceKey = getSupabaseServiceKey();
  const bucket = getSanitizedBucket();
  return {
    configured: Boolean(origin && serviceKey),
    bucket,
    hasUrl: Boolean(origin),
    hasServiceKey: Boolean(serviceKey),
  };
}

function buildSupabaseHeaders(serviceKey: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...(extra || {}),
  };
}

async function ensurePublicBucket(origin: string, serviceKey: string, bucket: string): Promise<void> {
  const cacheKey = `${origin}|${bucket}`;
  if (ensuredBucketKey === cacheKey) return;

  const checkRes = await fetch(`${origin}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
    method: 'GET',
    headers: buildSupabaseHeaders(serviceKey),
  });

  if (checkRes.ok) {
    ensuredBucketKey = cacheKey;
    return;
  }

  const createRes = await fetch(`${origin}/storage/v1/bucket`, {
    method: 'POST',
    headers: buildSupabaseHeaders(serviceKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true,
      file_size_limit: 26214400,
    }),
  });

  if (createRes.ok || createRes.status === 409) {
    ensuredBucketKey = cacheKey;
    return;
  }

  const errText = await createRes.text().catch(() => '');
  if (errText.toLowerCase().includes('already exists') || errText.toLowerCase().includes('duplicate')) {
    ensuredBucketKey = cacheKey;
    return;
  }

  throw new Error(`Supabase bucket setup failed (HTTP ${createRes.status})`);
}

export async function uploadToSupabaseStorage(
  buffer: Buffer,
  rawMimeType: string,
  rawFolder: string
): Promise<SupabaseUploadResult> {
  const origin = getValidatedSupabaseOrigin();
  const serviceKey = getSupabaseServiceKey();
  const bucket = getSanitizedBucket();

  if (!origin || !serviceKey) {
    throw new Error('Supabase Storage is not configured');
  }

  const mimeType = normalizeMediaMime(rawMimeType);
  const spec = ALLOWED_MIME_MAP[mimeType];
  if (!spec) {
    throw new Error('Unsupported media format. Allowed: JPG, PNG, WebP, GIF, MP4, WebM, MOV, MP3, OGG, M4A, WAV.');
  }

  if (!buffer || buffer.length === 0) {
    throw new Error('Empty file upload');
  }

  if (buffer.length > spec.maxBytes) {
    const maxMb = Math.round(spec.maxBytes / (1024 * 1024));
    throw new Error(`File exceeds maximum allowed size (${maxMb} MB for ${spec.category}).`);
  }

  await ensurePublicBucket(origin, serviceKey, bucket);

  const folder = sanitizeUploadFolder(rawFolder);
  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const objectPath = `${folder}/${ym}/${crypto.randomUUID()}${spec.ext}`;
  const uploadUrl = `${origin}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`;

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: buildSupabaseHeaders(serviceKey, {
      'Content-Type': mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
      'x-upsert': 'false',
      'cache-control': '31536000',
    }),
    body: new Uint8Array(buffer),
  });

  if (!uploadRes.ok) {
    const detail = await uploadRes.text().catch(() => '');
    throw new Error(`Supabase upload failed (HTTP ${uploadRes.status})${detail ? `: ${detail.slice(0, 120)}` : ''}`);
  }

  const publicUrl = `${origin}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`;
  return {
    url: publicUrl,
    path: objectPath,
    bucket,
    mediaType: spec.category,
    mimeType,
    sizeBytes: buffer.length,
  };
}
