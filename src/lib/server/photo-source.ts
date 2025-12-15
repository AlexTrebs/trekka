import type { FeatureCollection, Point } from "geojson";
import { env } from "./env";
import {
  API_MAX_RETRIES,
  API_RETRY_BASE_DELAY_MS,
  API_RETRY_MAX_DELAY_MS
} from "$lib/config";
import { TrekkaApiPhotoSource } from "./photo-sources/trekka-photo-source";
import { DrivePhotoSource } from "./photo-sources/drive-photo-source";

/**
 * Custom error types for better error handling
 */
export class PhotoSourceError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "PhotoSourceError";
  }
}

export class NetworkError extends PhotoSourceError {
  constructor(source: string, originalError?: unknown) {
    super("Network request failed", source, originalError);
    this.name = "NetworkError";
  }
}

export class AuthenticationError extends PhotoSourceError {
  constructor(source: string, originalError?: unknown) {
    super("Authentication failed", source, originalError);
    this.name = "AuthenticationError";
  }
}

/**
 * Implements exponential backoff retry logic
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = API_MAX_RETRIES
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on authentication errors
      if (error instanceof AuthenticationError) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        API_RETRY_BASE_DELAY_MS * Math.pow(2, attempt),
        API_RETRY_MAX_DELAY_MS
      );

      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export interface PhotoSource {
  /**
   * Fetches list of photos with metadata
   * @returns GeoJSON FeatureCollection of photos
   */
  fetchPhotos(): Promise<FeatureCollection<Point>>;

  /**
   * Fetches image/video data
   * @param id - Photo identifier (fileId for Drive, fileName for Trekka API)
   * @returns Buffer containing image/video data (HEIC converted to JPEG for Drive sources)
   */
  fetchImage(id: string): Promise<Buffer>;
}

/**
 * Factory function to get the appropriate photo source based on configuration
 */
export function getPhotoSource(): PhotoSource {
  if (env.apiSource === "drive") {
    return new DrivePhotoSource();
  } else {
    return new TrekkaApiPhotoSource();
  }
}
