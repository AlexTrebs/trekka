// Represents both photos and videos with location data
export interface PhotoProps {
  id: string; // File ID from Drive or filename from trekka-api
  url?: string; // Server-proxied URL (fallback for Drive)
  signedUrl?: string; // Direct signed URL (Trekka API only, bypasses server)
  name?: string;
  takenAt?: string | Date; // Timestamp when media was captured
  location: [number, number]; // [longitude, latitude]
  mimeType?: string; // e.g., "image/jpeg", "video/mp4", "image/heic"
  geoLocation?: string; // Human-readable location string from API
}
