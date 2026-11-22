export interface EmojiLinkItem {
  id: string;
  emojiCode: string;
  targetUrl: string;
  title: string;
  iconUrl: string;
  pinnedToAppIcon: boolean;
  createdBy: string;
  createdAt: string;
}

const EMOJI_PALETTE = [
  '🔐',
  '🟢',
  '💬',
  '✨',
  '🚀',
  '💎',
  '👑',
  '📲',
  '🛡️',
  '⚡',
  '🌐',
  '🔥',
  '💚',
  '🎯',
  '🗝️',
  '📡',
  '🌟',
  '🎉',
  '🤝',
  '🧿',
  '🛸',
  '🔔',
  '💌',
  '🍀',
];

export function generateEmojiFromUrl(rawUrl: string): string {
  const clean = (rawUrl || '').trim() || 'https://chat-9-si9x.onrender.com';
  let h1 = 2166136261;
  let h2 = 3735928559;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 16777619);
    h2 = Math.imul(h2 ^ (ch + i), 2246822519);
  }
  const picked: string[] = [];
  let seed = Math.abs(h1 ^ h2) || 987654321;
  for (let slot = 0; slot < 5; slot++) {
    seed = Math.abs(Math.imul(seed ^ (slot + 17), 1664525) + 1013904223);
    const idx = seed % EMOJI_PALETTE.length;
    const candidate = EMOJI_PALETTE[idx];
    if (!picked.includes(candidate) || slot >= EMOJI_PALETTE.length) {
      picked.push(candidate);
    } else {
      picked.push(EMOJI_PALETTE[(idx + slot + 3) % EMOJI_PALETTE.length]);
    }
  }
  return picked.join('');
}

export function generateRandomEmojiCode(length = 5): string {
  const chosen: string[] = [];
  const pool = [...EMOJI_PALETTE];
  for (let i = 0; i < length && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return chosen.join('');
}

export function getSafeShareOrigin(fallbackOrigin?: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return fallbackOrigin || 'https://chat-9-si9x.onrender.com';
}

export function buildEmojiShareUrl(emojiCode: string, baseOrigin?: string): string {
  const origin = (baseOrigin || getSafeShareOrigin()).replace(/\/+$/, '');
  const cleanEmoji = (emojiCode || '').trim() || '🔐🟢💬✨🚀';
  return `${origin}/go?e=${encodeURIComponent(cleanEmoji)}`;
}

export async function renderAppIconWithEmojiFile(
  iconUrl: string,
  emojiCode: string,
  title: string
): Promise<File | null> {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Emerald & gold luxury backdrop matching Choy Chat theme
    const bgGrad = ctx.createLinearGradient(0, 0, 512, 512);
    bgGrad.addColorStop(0, '#022c22');
    bgGrad.addColorStop(0.5, '#064e3b');
    bgGrad.addColorStop(1, '#022c22');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle border frame
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
    ctx.lineWidth = 8;
    ctx.strokeRect(14, 14, 484, 484);

    // Load the App Icon Image cleanly
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load icon'));
      img.src = iconUrl || '/assets/aistudio/image_20261121_145253_f477cbfa.webp';
    }).catch(() => {
      // If icon fails to load, continue with styled badge
    });

    // Draw rounded icon image frame in center-top
    const cardW = 240;
    const cardH = 300;
    const cardX = (512 - cardW) / 2;
    const cardY = 48;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 28);
    ctx.clip();
    ctx.fillStyle = '#065f46';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    if (img.complete && img.naturalWidth > 0) {
      const scale = Math.min(cardW / img.naturalWidth, cardH / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      ctx.drawImage(img, cardX + (cardW - drawW) / 2, cardY + (cardH - drawH) / 2, drawW, drawH);
    }
    ctx.restore();

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 28);
    ctx.stroke();

    // Draw Emoji Badge overlaid on the bottom of the App Icon Image
    const pillW = 340;
    const pillH = 68;
    const pillX = (512 - pillW) / 2;
    const pillY = 322;
    ctx.fillStyle = 'rgba(2, 44, 34, 0.94)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 34);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 34px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(emojiCode || '🔐🟢💬✨🚀', 256, pillY + pillH / 2 + 2);

    // Title & Live badge footer
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#fef3c7';
    ctx.fillText((title || 'CHOY CHAT LIVE').slice(0, 28).toUpperCase(), 256, 430);

    ctx.font = '600 15px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#6ee7b7';
    ctx.fillText('TAP EMOJI LINK TO OPEN LIVE APP', 256, 466);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    return new File([blob], 'choychat-emoji-link.png', { type: 'image/png' });
  } catch {
    return null;
  }
}

export async function shareEmojiLinkWithAppImage(params: {
  emojiCode: string;
  title: string;
  targetUrl: string;
  iconUrl: string;
  shareOrigin?: string;
}): Promise<{ method: 'native-file' | 'native-url' | 'clipboard'; shareUrl: string }> {
  const shareUrl = buildEmojiShareUrl(params.emojiCode, params.shareOrigin);
  const shareText = `${params.emojiCode} ${params.title || 'Choy Chat Live'}\n${shareUrl}`;
  const iconFile = await renderAppIconWithEmojiFile(params.iconUrl, params.emojiCode, params.title);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      if (
        iconFile &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [iconFile] })
      ) {
        await navigator.share({
          files: [iconFile],
          title: `${params.emojiCode} ${params.title || 'Choy Chat'}`,
          text: shareText,
          url: shareUrl,
        });
        return { method: 'native-file', shareUrl };
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { method: 'native-file', shareUrl };
      }
    }

    try {
      await navigator.share({
        title: `${params.emojiCode} ${params.title || 'Choy Chat'}`,
        text: `${params.emojiCode} • ${params.title || 'Choy Chat Live'}`,
        url: shareUrl,
      });
      return { method: 'native-url', shareUrl };
    } catch {
      // Fall through to clipboard copy
    }
  }

  try {
    await navigator.clipboard?.writeText(shareText);
  } catch {
    // ignore clipboard error
  }
  return { method: 'clipboard', shareUrl };
}
