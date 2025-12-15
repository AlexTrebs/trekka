import type { PhotoSource } from "../photo-source";
import type { FeatureCollection, Point } from "geojson";
import { retryWithBackoff, PhotoSourceError, AuthenticationError, NetworkError } from "../photo-source";
import { env } from "../env";
import { signedUrlCache } from "./caches/signed-url-cache";

/**
 * Trekka API photo source implementation
 */
export class TrekkaApiPhotoSource implements PhotoSource {
  /**
   * Creates headers with API key authentication
   */
  private getHeaders(): HeadersInit {
    return {
      'X-API-Key': env.trekkaApiKey || '',
      'Content-Type': 'application/json'
    };
  }

  async fetchPhotos(): Promise<FeatureCollection<Point>> {
    return retryWithBackoff(async () => {
      try {
        const response = await fetch(`${env.trekkaApiUrl}/images/list`, {
          headers: this.getHeaders()
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new AuthenticationError("Trekka API - Check API key configuration");
          }
          const requestId = response.headers.get('X-Request-ID');
          throw new Error(`HTTP ${response.status}: ${response.statusText} (Request ID: ${requestId})`);
        }

        const images: Array<{
          Id: string;
          FileName: string;
          ContentType: string;
          GeoLocation?: string;
          Coordinates?: { lng: string; lat: string };
          FormattedDate?: string;
        }> = await response.json();

        // Filter and sort (newest first)
        const filteredImages = images
          .filter(img => img.Coordinates?.lng && img.Coordinates?.lat)
          .sort((a, b) => {
            const aTime = a.FormattedDate ? new Date(a.FormattedDate).getTime() : 0;
            const bTime = b.FormattedDate ? new Date(b.FormattedDate).getTime() : 0;
            return bTime - aTime; // Newest first
          });

        // Fetch signed URLs for all images in parallel
        const features = await Promise.all(
          filteredImages.map(async (img) => {
            const signedUrl = await this.getSignedUrl(img.FileName);

            return {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [parseFloat(img.Coordinates!.lng), parseFloat(img.Coordinates!.lat)]
              },
              properties: {
                id: img.FileName,
                url: `/api/photos/image/${encodeURIComponent(img.FileName)}?fileName=${encodeURIComponent(img.FileName)}&mimeType=${encodeURIComponent(img.ContentType)}`,
                signedUrl, // Direct Firebase URL for client-side loading
                name: img.FileName,
                takenAt: img.FormattedDate || "",
                location: [parseFloat(img.Coordinates!.lng), parseFloat(img.Coordinates!.lat)],
                mimeType: img.ContentType,
                geoLocation: img.GeoLocation
              }
            };
          })
        );

        return {
          type: "FeatureCollection",
          features
        };
      } catch (error) {
        if (error instanceof PhotoSourceError) {
          throw error;
        }
        throw new NetworkError("Trekka API", error);
      }
    });
  }

  /**
   * Get signed URL for an image (cached for 14 minutes)
   */
  async getSignedUrl(fileName: string): Promise<string> {
    return retryWithBackoff(async () => {
      try {
        // Check signed URL cache first
        let signedUrl = signedUrlCache.get(fileName);

        if (!signedUrl) {
          // Cache miss - get the redirect URL (302 response with signed URL)
          const redirectResponse = await fetch(
            `${env.trekkaApiUrl}/image?fileName=${encodeURIComponent(fileName)}`,
            {
              headers: this.getHeaders(),
              redirect: 'manual' // Don't auto-follow redirects
            }
          );

          if (redirectResponse.status === 401 || redirectResponse.status === 403) {
            throw new AuthenticationError("Trekka API - Check API key configuration");
          }

          if (redirectResponse.status === 404) {
            throw new PhotoSourceError("File not found", "Trekka API");
          }

          if (redirectResponse.status !== 302) {
            const requestId = redirectResponse.headers.get('X-Request-ID');
            throw new Error(`Expected redirect, got ${redirectResponse.status} (Request ID: ${requestId})`);
          }

          // Extract signed URL from Location header
          signedUrl = redirectResponse.headers.get('Location');
          if (!signedUrl) {
            throw new PhotoSourceError("No redirect URL provided", "Trekka API");
          }

          // Extract metadata from response headers
          const geoLocation = redirectResponse.headers.get('X-Geo-Location');
          const requestId = redirectResponse.headers.get('X-Request-ID');

          // Cache the signed URL (14 minute TTL)
          signedUrlCache.set(fileName, signedUrl, { geoLocation: geoLocation || undefined, requestId: requestId || undefined });

          console.debug(`[Trekka API] Got signed URL for ${fileName} (Request ID: ${requestId}, Location: ${geoLocation})`);
        }

        return signedUrl;
      } catch (error) {
        if (error instanceof PhotoSourceError) {
          throw error;
        }
        throw new NetworkError("Trekka API", error);
      }
    });
  }

  async fetchImage(fileName: string): Promise<Buffer> {
    return retryWithBackoff(async () => {
      try {
        // Get signed URL (cached)
        const signedUrl = await this.getSignedUrl(fileName);

        // Fetch from the signed URL (no auth needed for signed URLs)
        const imageResponse = await fetch(signedUrl);

        if (!imageResponse.ok) {
          // If signed URL failed, it might be expired - clear cache and retry once
          if (imageResponse.status === 403 || imageResponse.status === 404) {
            console.warn(`[Trekka API] Signed URL expired for ${fileName}, clearing cache`);
            signedUrlCache.clear();
            throw new Error('Signed URL expired - will retry');
          }
          throw new Error(`Failed to fetch from signed URL: ${imageResponse.status}`);
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        if (error instanceof PhotoSourceError) {
          throw error;
        }
        throw new NetworkError("Trekka API", error);
      }
    });
  }
}
