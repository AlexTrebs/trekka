import QuickLRU from 'quick-lru';

interface SignedUrlCacheEntry {
  url: string;
  expires: number;
  geoLocation?: string;
  requestId?: string;
}

/**
 * Signed URL cache with 14-minute TTL
 * (URLs from Trekka API expire after 15 minutes)
 */
class SignedUrlCache {
  private cache = new QuickLRU<string, SignedUrlCacheEntry>({ maxSize: 500 });
  private readonly TTL_MS = 14 * 60 * 1000; // 14 minutes

  /**
   * Gets a cached signed URL if available and not expired
   */
  get(fileName: string): string | null {
    const entry = this.cache.get(fileName);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expires <= Date.now()) {
      this.cache.delete(fileName);
      console.debug(`[Signed URL Cache] Expired: ${fileName}`);
      return null;
    }

    console.debug(`[Signed URL Cache] Hit: ${fileName} (${this.getTimeRemaining(entry.expires)}s remaining)`);
    return entry.url;
  }

  /**
   * Stores a signed URL in the cache
   */
  set(fileName: string, url: string, metadata?: { geoLocation?: string; requestId?: string }): void {
    const entry: SignedUrlCacheEntry = {
      url,
      expires: Date.now() + this.TTL_MS,
      geoLocation: metadata?.geoLocation,
      requestId: metadata?.requestId
    };

    this.cache.set(fileName, entry);
    console.debug(`[Signed URL Cache] Set: ${fileName} (expires in ${this.TTL_MS / 1000 / 60}min)`);
  }

  /**
   * Clears the entire cache
   */
  clear(): void {
    this.cache.clear();
    console.debug('[Signed URL Cache] Cleared');
  }

  delete(filename: string): void {
    this.cache.delete(filename)
    console.debug(`[Signed URL Cache] Deleted: ${filename}`)
  }

  /**
   * Gets cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: 500
    };
  }

  /**
   * Gets time remaining in seconds
   */
  private getTimeRemaining(expires: number): number {
    return Math.floor((expires - Date.now()) / 1000);
  }

  /**
   * Removes expired entries (cleanup)
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires <= now) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.debug(`[Signed URL Cache] Cleaned up ${removed} expired entries`);
    }
  }
}

// Singleton instance
export const signedUrlCache = new SignedUrlCache();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  signedUrlCache.cleanup();
}, 5 * 60 * 1000);
