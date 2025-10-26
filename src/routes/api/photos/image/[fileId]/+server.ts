import type { RequestHandler } from "@sveltejs/kit";
import { drive } from "$lib/server/drive";
import QuickLRU from "quick-lru";
import { buffer } from "stream/consumers";
import heicConvert from "heic-convert";

type CacheEntry = {
  data: Uint8Array;
  contentType: string;
  expires: number;
  fileName: string;
};

const cache = new QuickLRU<string, CacheEntry>({ maxSize: 50 });

// Cleanup expired cache entries
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expires <= now) cache.delete(key);
    }
  },
  10 * 60 * 1000,
);

const isHeifLike = (t: string) => /heic|heif/i.test(t);

export const GET: RequestHandler = async ({ params, url }) => {
  const fileId = params.fileId!;
  const fileName = url.searchParams.get("fileName")!;
  const requestedMime = url.searchParams.get("mimeType")!;

  const start = performance.now();
  const now = Date.now();

  // --- Cache hit ---
  const cached = cache.get(fileId);
  if (cached && cached.expires > now) {
    console.debug(`[Image] Cache hit: ${fileId}`);
    return new Response(new Uint8Array(cached.data), {
      headers: {
        "Content-Type": cached.contentType,
        "Content-Length": String(cached.data.byteLength),
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": `inline; filename="${encodeURIComponent(cached.fileName)}"`,
      },
    });
  }

  // --- Fetch from Google Drive ---
  let driveRes;
  try {
    driveRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" },
    );
  } catch (err) {
    console.error(`[Image] Drive fetch failed for ${fileId}`, err);
    return new Response("Drive fetch failed", { status: 500 });
  }

  const driveData = await buffer(driveRes.data);
  console.debug(`[Image] Fetched ${driveData.length.toLocaleString()} bytes`);

  let output = driveData;
  let finalType = requestedMime;

  // --- Convert HEIC/HEIF to JPEG ---
  if (isHeifLike(requestedMime)) {
    try {
      console.debug(`[Image] Converting HEIF → JPEG`);
      output = await heicConvert({
        buffer: output,
        format: "JPEG",
        quality: 0.9,
      });
      finalType = "image/jpeg";
    } catch (err) {
      console.error(`[Image] HEIC conversion failed for ${fileName}`, err);
    }
  }

  // --- Cache result ---
  cache.set(fileId, {
    data: output,
    contentType: finalType,
    fileName,
    expires: now + 10 * 1000 * 12 * 60 * 60,
  });

  const totalMs = (performance.now() - start).toFixed(1);
  console.debug(`[Image] Served ${fileId} (${finalType}) in ${totalMs}ms`);

  return new Response(new Uint8Array(output), {
    headers: {
      "Content-Type": finalType,
      "Content-Length": String(output.byteLength),
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
    },
  });
};
