import type { RequestHandler } from "@sveltejs/kit";
import { drive } from "$lib/server/drive";
import { PassThrough } from "stream";
import { pipeline } from "stream/promises";
import QuickLRU from "quick-lru";

type CacheEntry = {
  data: Uint8Array;
  contentType: string;
  expires: number;
};

const cache = new QuickLRU<string, CacheEntry>({ maxSize: 200 });

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expires <= now) cache.delete(key);
  }
}

function setCacheItem(key: string, value: CacheEntry) {
  cleanExpiredCache();
  cache.set(key, value);
}

// optional background cleanup every 10 mins (safe for long-lived processes)
setInterval(cleanExpiredCache, 10 * 60 * 1000);

export const GET: RequestHandler = async ({ params }) => {
  const start = performance.now();
  const fileId = params.fileId!;
  const now = Date.now();

  console.time(`[Image] ${fileId}`);

  const cached = cache.get(fileId);
  if (cached && cached.expires > now) {
    console.timeEnd(`[Image] ${fileId}`);
    return new Response(new Blob([cached.data.buffer as ArrayBuffer]), {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=3600",
        "X-Cache": "HIT",
        "X-LoadTime": `${(performance.now() - start).toFixed(1)}ms`,
        "Content-Disposition": "inline",
      },
    });
  }

  console.debug(`[Image] Cache MISS for ${fileId} – fetching from Drive…`);

  const driveStart = performance.now();

  const driveRes = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" },
  );
  console.debug(
    `[Image] Drive responded in ${(performance.now() - driveStart).toFixed(1)}ms`,
  );

  const contentType = driveRes.headers["content-type"] || "image/jpeg";
  const pass = new PassThrough();
  const chunks: Buffer[] = [];

  driveRes.data.on("data", (chunk) => chunks.push(chunk));

  const streamStart = performance.now();
  pipeline(driveRes.data, pass)
    .then(() => {
      console.debug(
        `[Image] Stream finished in ${(performance.now() - streamStart).toFixed(1)}ms`,
      );
    })
    .catch((err) => console.error("[Image] Stream error:", err));

  // Cache save async
  (async () => {
    const concatStart = performance.now();
    const data = Buffer.concat(chunks);
    console.debug(
      `[Image] Buffer.concat took ${(performance.now() - concatStart).toFixed(1)}ms`,
    );

    setCacheItem(fileId, {
      data,
      contentType,
      expires: now + 3600 * 1000,
    });
  })();

  console.timeEnd(`[Image] ${fileId}`);

  return new Response(pass as any, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
      "X-Cache": "MISS",
      "Content-Disposition": "inline",
    },
  });
};
