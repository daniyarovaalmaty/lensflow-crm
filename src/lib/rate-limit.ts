/**
 * IP-based rate limiter for API routes.
 * Uses in-memory Map with automatic cleanup.
 * 
 * On Vercel serverless, each function instance has its own Map,
 * so this provides per-instance rate limiting. For a single instance
 * handling many requests, this is effective against brute-force attacks.
 * 
 * For multi-instance production deployments, consider using
 * Vercel KV or Upstash Redis for shared state.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const limiters = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(store: Map<string, RateLimitEntry>) {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    for (const [key, entry] of store) {
        if (entry.resetAt < now) {
            store.delete(key);
        }
    }
}

/**
 * Extract client IP from request headers.
 * Vercel sets x-forwarded-for; fallback to x-real-ip.
 */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        // x-forwarded-for may contain multiple IPs; take the first one
        return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || 'unknown';
}

interface RateLimitConfig {
    /** Unique name for this limiter (e.g., 'otp-send', 'otp-verify') */
    name: string;
    /** Maximum number of requests allowed in the window */
    maxRequests: number;
    /** Time window in seconds */
    windowSeconds: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

/**
 * Check if a request is within rate limits.
 * 
 * @example
 * ```ts
 * const ip = getClientIp(request);
 * const { allowed, remaining } = checkRateLimit(ip, {
 *     name: 'otp-send',
 *     maxRequests: 5,
 *     windowSeconds: 300,
 * });
 * if (!allowed) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * }
 * ```
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
    // Get or create a store for this limiter
    if (!limiters.has(config.name)) {
        limiters.set(config.name, new Map());
    }
    const store = limiters.get(config.name)!;
    
    // Periodic cleanup
    cleanup(store);
    
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const entry = store.get(key);
    
    if (!entry || entry.resetAt < now) {
        // First request or window expired — reset
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + windowMs };
    }
    
    if (entry.count >= config.maxRequests) {
        // Rate limit exceeded
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }
    
    // Increment counter
    entry.count++;
    return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}
