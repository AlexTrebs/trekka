import { error, type RequestHandler } from "@sveltejs/kit";
import { getPhotoSource, PhotoSourceError } from "$lib/server/photo-source";
import QuickLRU from "quick-lru";
import {
  IMAGE_CACHE_SIZE,
  IMAGE_CACHE_TTL_MS,
  IMAGE_CACHE_CLEANUP_INTERVAL_MS
} from "$lib/config";

/**
 * Cache entry structure
 */
type CacheEntry = {
  data: Uint8Array;
  contentType: string;
  expires: number;
  fileName: string;
};

// LRU cache for image data
const cache = new QuickLRU<string, CacheEntry>({ maxSize: IMAGE_CACHE_SIZE });

// Cleanup expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expires <= now) {
      cache.delete(key);
    }
  }
}, IMAGE_CACHE_CLEANUP_INTERVAL_MS);


/**
 * GET /api/photos/image/[fileId]
 *
 * Returns a redirect to the image's signed URL for direct browser access.
 * This avoids proxying the image through the server, improving performance.
 *
 * Query Parameters:
 * - fileName: Name of the file (required for display)
 * - mimeType: MIME type of the file (optional, for metadata)
 */
export const GET: RequestHandler = async ({ params }) => {
  const fileId = params.fileId;

  if (!fileId) {
    throw error(400, "File ID is required");
  }

  const start = performance.now();

  // Get signed URL from photo source (cached for 14 minutes)
  try {
    const photoSource = getPhotoSource();

    // Fallback for photo sources without signed URL support (e.g., Drive with HEIC conversion)
    // This still proxies the image, but only for sources that require it
    const now = Date.now();

    // Check cache first
    const cached = cache.get(fileId);
    if (cached && cached.expires > now) {
      console.debug(`[Image] Cache hit: ${fileId}`);
      return new Response(Buffer.from(cached.data), {
        headers: {
          "Content-Type": cached.contentType,
          "Content-Length": String(cached.data.byteLength),
          "Cache-Control": "public, max-age=3600",
          "Content-Disposition": `inline; filename="${encodeURIComponent(cached.fileName)}"`
        }
      });
    }

    const imageData = await photoSource.fetchImage(fileId);
    const outputArray = imageData instanceof Uint8Array ? imageData : new Uint8Array(imageData);

    // Cache for sources that require proxying
    cache.set(fileId, {
      data: outputArray,
      contentType: "application/octet-stream",
      fileName: fileId,
      expires: now + IMAGE_CACHE_TTL_MS
    });

    const totalMs = (performance.now() - start).toFixed(1);
    console.debug(`[Image] Proxied ${fileId} in ${totalMs}ms`);

    return new Response(Buffer.from(outputArray), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(outputArray.byteLength),
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (err) {
    console.error(`[Image] Failed for ${fileId}:`, err);

    if (err instanceof PhotoSourceError) {
      if (err.message.includes("not found")) {
        throw error(404, `File not found: ${fileId}`);
      }
      throw error(503, "Photo service temporarily unavailable");
    }

    throw error(500, "Failed to fetch image");
  }
};
