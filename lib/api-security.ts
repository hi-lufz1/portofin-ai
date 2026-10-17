import { NextRequest, NextResponse } from 'next/server';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim().slice(0, 64);
  }
  return 'anonymous';
}

/**
 * Simple in-memory fixed-window rate limiter per IP + route bucket.
 * Returns a 429 NextResponse if the caller exceeds the limit, or null if allowed.
 */
export function enforceRateLimit(
  req: NextRequest,
  bucketName: string,
  maxRequests: number,
  windowMs: number
): NextResponse | null {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${bucketName}:${ip}`;

  // Periodic cleanup to prevent unbounded Map growth
  if (rateLimitStore.size > 2000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetAt) rateLimitStore.delete(k);
    }
  }

  const existing = rateLimitStore.get(key);
  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (existing.count >= maxRequests) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
        },
      }
    );
  }

  existing.count += 1;
  return null;
}

/**
 * Validates and bounds portfolio context string to prevent token exhaustion / DoS.
 */
export function sanitizePortfolioContext(input: unknown, maxLength = 8000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export interface SafeChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Validates chat messages array:
 * - Only allows 'user' and 'assistant' roles (blocks client-injected 'system' role overrides)
 * - Caps total message count and per-message character length
 */
export function validateChatMessages(
  messages: unknown,
  maxMessages = 20,
  maxContentLength = 2000
): SafeChatMessage[] | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  const recent = messages.slice(-maxMessages);
  const sanitized: SafeChatMessage[] = [];

  for (const msg of recent) {
    if (!msg || typeof msg !== 'object') return null;
    const rawRole = (msg as { role?: unknown }).role;
    const rawContent = (msg as { content?: unknown }).content;

    if (rawRole !== 'user' && rawRole !== 'assistant') {
      return null;
    }
    if (typeof rawContent !== 'string') {
      return null;
    }

    const cleaned = rawContent
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim()
      .slice(0, maxContentLength);

    if (!cleaned) continue;

    sanitized.push({
      role: rawRole,
      content: cleaned,
    });
  }

  return sanitized.length > 0 ? sanitized : null;
}
