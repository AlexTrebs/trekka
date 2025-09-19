import type { RequestHandler } from '@sveltejs/kit';
import { initDrive } from '$lib/server/drive';
import { buffer } from 'stream/consumers';

// Simple in-memory cache
const cache = new Map<string, { data: Uint8Array<ArrayBuffer>; contentType: string; expires: number }>();

export const GET: RequestHandler = async ({ params }) => {
  const fileId = params.fileId;
  const now = Date.now();

  // Serve from cache if available and fresh
  const cached = cache.get(fileId);
  if (cached && cached.expires > now) {
    return new Response(cached.data, {
      status: 200,
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'HIT'
      }
    });
  }

  // Not cached or expired then fetch from Google Drive
  const drive = initDrive();
  const driveRes = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  const dataBuffer = await buffer(driveRes.data);
  const data = new Uint8Array(dataBuffer);

  const contentType =
    (driveRes.headers as Record<string, string>)['content-type'] ||
    'application/octet-stream';

  // Store in cache (1 hour TTL)
  cache.set(fileId, {
    data,
    contentType,
    expires: now + 3600 * 1000
  });

  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'X-Cache': 'MISS'
    }
  });
};
