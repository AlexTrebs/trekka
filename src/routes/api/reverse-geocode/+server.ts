import { json, error, type RequestHandler } from '@sveltejs/kit';
import { geocodingService } from '$lib/server/geocoding';

/**
 * GET /api/reverse-geocode
 *
 * Query Parameters:
 * - lat: Latitude (required)
 * - lon: Longitude (required)
 */
export const GET: RequestHandler = async ({ url }) => {
  const latStr = url.searchParams.get('lat');
  const lonStr = url.searchParams.get('lon');

  if (!latStr || !lonStr) {
    throw error(400, 'Missing required parameters: lat and lon');
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (isNaN(lat) || isNaN(lon)) {
    throw error(400, 'Invalid coordinates: lat and lon must be numbers');
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw error(400, 'Invalid coordinates: lat must be -90 to 90, lon must be -180 to 180');
  }

  try {
    const location = await geocodingService.reverseGeocode(lat, lon);

    console.debug(`[Geocoding API] Queue size: ${geocodingService.getQueueSize()}, Cache size: ${geocodingService.getCacheSize()}`);

    return json({
      city: location.city || null,
      country: location.country || null
    });
  } catch (err) {
    console.error('[Geocoding API] Failed to geocode location:', err);
    throw error(500, 'Failed to geocode location');
  }
}
