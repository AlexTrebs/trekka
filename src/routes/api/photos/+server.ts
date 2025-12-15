import { json, error, type RequestHandler } from "@sveltejs/kit";
import { getPhotoSource, PhotoSourceError } from "$lib/server/photo-source";

/**
 * GET /api/photos
 *
 * Fetches all photos with location metadata from the configured source.
 */
export const GET: RequestHandler = async () => {
  try {
    const photoSource = getPhotoSource();
    const photos = await photoSource.fetchPhotos();

    console.log(`[Photos API] Successfully fetched ${photos.features.length} photos`);

    return json(photos);
  } catch (err) {
    console.error("[Photos API] Failed to fetch photos:", err);

    if (err instanceof PhotoSourceError) {
      // External service issue
      throw error(503, `Photo service temporarily unavailable: ${err.message}`);
    }

    // Unknown error
    const message = err instanceof Error ? err.message : String(err);
    throw error(500, `Failed to fetch photos: ${message}`);
  }
};
