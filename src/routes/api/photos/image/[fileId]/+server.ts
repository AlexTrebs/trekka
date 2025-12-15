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
 * Serves image or video file with caching.
 *
 * Query Parameters:
 * - fileName: Name of the file (required for display)
 * - mimeType: MIME type of the file (required)
 */
export const GET: RequestHandler = async ({ params, url }) => {
  const fileId = params.fileId;
  const fileName = url.searchParams.get("fileName") || fileId || "unknown";
  const requestedMime = url.searchParams.get("mimeType") || "application/octet-stream";

  if (!fileId) {
    throw error(400, "File ID is required");
  }

  const start = performance.now();
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

  // Fetch from source
  let imageData: Buffer;
  try {
    const photoSource = getPhotoSource();
    imageData = await photoSource.fetchImage(fileId);
    console.debug(`[Image] Fetched ${imageData.length.toLocaleString()} bytes for ${fileId}`);
  } catch (err) {
    console.error(`[Image] Fetch failed for ${fileId}:`, err);

    if (err instanceof PhotoSourceError) {
      if (err.message.includes("not found")) {
        throw error(404, `File not found: ${fileId}`);
      }
      throw error(503, "Photo service temporarily unavailable");
    }

    throw error(500, "Failed to fetch image");
  }

  // Cache the result
  const outputArray = imageData instanceof Uint8Array ? imageData : new Uint8Array(imageData);
  cache.set(fileId, {
    data: outputArray,
    contentType: requestedMime,
    fileName,
    expires: now + IMAGE_CACHE_TTL_MS
  });

  const totalMs = (performance.now() - start).toFixed(1);
  console.debug(`[Image] Served ${fileId} (${requestedMime}) in ${totalMs}ms`);

  return new Response(Buffer.from(outputArray), {
    headers: {
      "Content-Type": requestedMime,
      "Content-Length": String(outputArray.byteLength),
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`
    }
  });
};
