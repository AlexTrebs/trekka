import type { PhotoSource } from "../photo-source";
import type { FeatureCollection, Point } from "geojson";
import { retryWithBackoff, PhotoSourceError, AuthenticationError, NetworkError } from "../photo-source";
import { drive } from "../drive";
import { env } from "../env";
import heicConvert from "heic-convert";
import { HEIC_CONVERSION_QUALITY } from "$lib/config";

/**
 * Google Drive photo source implementation
 */
export class DrivePhotoSource implements PhotoSource {
  /**
   * Formats timestamp string to human-readable format
   */
  private formatTimestamp(timestamp: string): string {
    let date: Date;

    if (timestamp.includes("T") && timestamp.endsWith("Z")) {
      // ISO 8601 UTC
      date = new Date(timestamp);
    } else {
      // Custom format YYYY:MM:DD HH:MM:SS
      const [datePart, timePart] = timestamp.split(" ");
      const [year, month, day] = datePart.split(":").map(Number);
      const [hour, minute] = timePart.split(":").map(Number);
      date = new Date(year, month - 1, day, hour, minute);
    }

    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const weekday = weekdays[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");

    return `${weekday}, ${day} ${monthName} ${year}, ${hour}:${minute}`;
  }

  async fetchPhotos(): Promise<FeatureCollection<Point>> {
    return retryWithBackoff(async () => {
      try {
        const listRes: any = await drive.files.list({
          q: `'${env.googleFolderId}' in parents`,
          fields: "files(id,name,createdTime,imageMediaMetadata,videoMediaMetadata,mimeType)",
          pageSize: 100
        });

        // Filter and sort files with location data
        const sortedFiles = listRes.data.files
          .filter((f: any) => {
            return f.imageMediaMetadata?.location || f.videoMediaMetadata?.location;
          })
          .sort((a: any, b: any) => {
            const aTime =
              a.imageMediaMetadata?.time ??
              a.videoMediaMetadata?.creationTime ??
              a.createdTime;
            const bTime =
              b.imageMediaMetadata?.time ??
              b.videoMediaMetadata?.creationTime ??
              b.createdTime;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });

        const features = sortedFiles.map((f: any) => {
          const location = f.imageMediaMetadata?.location || f.videoMediaMetadata?.location;
          const time =
            f.imageMediaMetadata?.time ||
            f.videoMediaMetadata?.creationTime ||
            f.createdTime;

          return {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [location.longitude, location.latitude]
            },
            properties: {
              id: f.id,
              url: `/api/photos/image/${f.id}`,
              name: f.name,
              takenAt: this.formatTimestamp(time),
              location: [location.longitude, location.latitude],
              mimeType: f.mimeType
            }
          };
        });

        return {
          type: "FeatureCollection",
          features
        };
      } catch (error: any) {
        if (error?.code === 401 || error?.code === 403) {
          throw new AuthenticationError("Google Drive", error);
        }
        throw new NetworkError("Google Drive", error);
      }
    });
  }

  /**
   * Checks if MIME type is HEIC/HEIF format
   */
  private isHeifLike(mimeType: string): boolean {
    return /heic|heif/i.test(mimeType);
  }

  /**
   * Checks if MIME type is a video
   */
  private isVideo(mimeType: string): boolean {
    return /^video\//i.test(mimeType);
  }

  async fetchImage(fileId: string): Promise<Buffer> {
    return retryWithBackoff(async () => {
      try {
        const { buffer } = await import("stream/consumers");

        // Get file metadata to check MIME type
        const metadata = await drive.files.get({
          fileId,
          fields: 'mimeType'
        });

        const mimeType = metadata.data.mimeType || '';

        // Fetch the file data
        const driveRes = await drive.files.get(
          { fileId, alt: "media" },
          { responseType: "stream" }
        );
        let imageBuffer = await buffer(driveRes.data);

        // Convert HEIC/HEIF to JPEG for browser compatibility (images only)
        if (this.isHeifLike(mimeType) && !this.isVideo(mimeType)) {
          try {
            console.debug(`[Drive] Converting HEIF → JPEG for ${fileId}`);
            const converted = await heicConvert({
              buffer: imageBuffer,
              format: "JPEG",
              quality: HEIC_CONVERSION_QUALITY
            });
            imageBuffer = Buffer.from(converted);
          } catch (err) {
            console.error(`[Drive] HEIC conversion failed for ${fileId}:`, err);
            // Continue with original format if conversion fails
          }
        }

        return imageBuffer;
      } catch (error: any) {
        if (error?.code === 401 || error?.code === 403) {
          throw new AuthenticationError("Google Drive", error);
        }
        if (error?.code === 404) {
          throw new PhotoSourceError("File not found", "Google Drive", error);
        }
        throw new NetworkError("Google Drive", error);
      }
    });
  }
}

