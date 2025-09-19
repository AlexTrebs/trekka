import type { RequestHandler } from '@sveltejs/kit';
import { initDrive } from '$lib/server/drive';
import { buffer } from 'stream/consumers';

// Simple in-memory cache
const cache = new Map<string, { data: Uint8Array<ArrayBuffer>; contentType: string; expires: number }>();

// Helper to guess MIME type from filename
function getMimeType(filename: string | undefined): string {
  if (!filename) return 'image/jpeg'; // default fallback

  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}

export const GET: RequestHandler = async ({ params }) => {
  const fileId = params.fileId;
  const now = Date.now();

  // Serve from cache if available and fresh
  const cached = cache.get(fileId);
  if (cached && cached.expires > now) {
    console.log(cached.contentType);
    return new Response(cached.data, {
      status: 200,
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'HIT',
        'Content-Disposition': 'inline' 
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

  const fileName = (driveRes.data as any)?.name; // or fetch metadata separately if needed
  const contentType = getMimeType(fileName);

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
      'X-Cache': 'MISS',
      'Content-Disposition': 'inline' 
    }
  });
};
