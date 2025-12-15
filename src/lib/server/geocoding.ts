// This file is only used with google drive
import { NOMINATIM_RATE_LIMIT_MS, GEOCODE_CACHE_PRECISION } from "$lib/config";

export interface GeocodedLocation {
  city?: string;
  country?: string;
}

interface QueuedRequest {
  lat: number;
  lon: number;
  resolve: (value: GeocodedLocation) => void;
  reject: (error: Error) => void;
}

class GeocodingService {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private cache = new Map<string, GeocodedLocation>();

  private getCacheKey(lat: number, lon: number): string {
    const roundedLat = lat.toFixed(GEOCODE_CACHE_PRECISION);
    const roundedLon = lon.toFixed(GEOCODE_CACHE_PRECISION);
    return `${roundedLat},${roundedLon}`;
  }

  private async fetchFromNominatim(lat: number, lon: number): Promise<GeocodedLocation> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Trekka Photo Map Application"
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract location information from response
    const address = data.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.suburb;
    const country = address.country;

    return { city, country };
  }

  /**
   * Processes the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      const cacheKey = this.getCacheKey(request.lat, request.lon);

      try {
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached) {
          console.debug(`[Geocoding] Cache hit for ${cacheKey}`);
          request.resolve(cached);
        } else {
          // Fetch from API
          console.debug(`[Geocoding] Fetching location for ${cacheKey}`);
          const location = await this.fetchFromNominatim(request.lat, request.lon);

          // Cache result
          this.cache.set(cacheKey, location);

          request.resolve(location);
        }

        // Rate limit: wait before processing next request
        if (this.queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, NOMINATIM_RATE_LIMIT_MS));
        }
      } catch (error) {
        console.error(`[Geocoding] Failed to fetch location for ${cacheKey}:`, error);
        request.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processing = false;

    if (this.queue.length > 0) {
      void this.processQueue();
    }
  }

  /**
   * Reverse geocodes coordinates to location information
   *
   * @param lat - Latitude
   * @param lon - Longitude
   * @returns Promise resolving to location data
   */
  async reverseGeocode(lat: number, lon: number): Promise<GeocodedLocation> {
    const cacheKey = this.getCacheKey(lat, lon);

    // Check cache immediately
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.debug(`[Geocoding] Immediate cache hit for ${cacheKey}`);
      return Promise.resolve(cached);
    }

    // Add to queue
    return new Promise((resolve, reject) => {
      this.queue.push({ lat, lon, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Gets the current queue size (for monitoring)
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Gets the cache size (for monitoring)
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Clears the cache (for testing or memory management)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const geocodingService = new GeocodingService();
