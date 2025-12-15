import type { FeatureCollection, Point } from "geojson";
import type { PhotoProps } from "$lib/types/photo";

export interface PhotoNavigation {
  index: number;
  photo: PhotoProps;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Finds a photo by ID and returns navigation state
 *
 * @param photos - The photo collection
 * @param photoId - The photo ID to find
 * @returns Navigation state or null if photo not found
 */
export function findPhotoById(
  photos: FeatureCollection<Point, PhotoProps>,
  photoId: string,
): PhotoNavigation | null {
  const index = photos.features.findIndex((f) => f.properties.id === photoId);
  if (index === -1) return null;

  return {
    index,
    photo: photos.features[index].properties,
    hasNext: index > 0,
    hasPrev: index < photos.features.length - 1,
  };
}

/** Navigates to the previous photo (older images, higher index) */
export function navigateToPrevious(
  photos: FeatureCollection<Point, PhotoProps>,
  currentIndex: number,
  onOpen: (photoId: string) => void,
): void {
  if (currentIndex < photos.features.length - 1) {
    onOpen(photos.features[currentIndex + 1].properties.id);
  }
}

/** Navigates to the next photo (newer images, lower index) */
export function navigateToNext(
  photos: FeatureCollection<Point, PhotoProps>,
  currentIndex: number,
  onOpen: (photoId: string) => void,
): void {
  if (currentIndex > 0) {
    onOpen(photos.features[currentIndex - 1].properties.id);
  }
}

/** Finds the most recently taken photo in the collection */
export function findMostRecentPhoto(
  photos: FeatureCollection<Point, PhotoProps>,
): (typeof photos.features)[0] | null {
  if (!photos?.features?.length) return null;

  return photos.features.reduce((a, b) => {
    const aTime = a.properties.takenAt
      ? new Date(a.properties.takenAt).getTime()
      : 0;
    const bTime = b.properties.takenAt
      ? new Date(b.properties.takenAt).getTime()
      : 0;
    return aTime > bTime ? a : b;
  });
}

/** Opens the most recently taken photo */
export function openMostRecentPhoto(
  photos: FeatureCollection<Point, PhotoProps>,
  onOpen: (photoId: string) => void,
): void {
  const recent = findMostRecentPhoto(photos);
  if (recent) onOpen(recent.properties.id);
}

/** Prepares to open a photo by finding it and gathering all necessary data */
export function preparePhotoOpen(
  photos: FeatureCollection<Point, PhotoProps>,
  photoId: string,
) {
  const navigation = findPhotoById(photos, photoId);
  if (!navigation) return null;

  return {
    navigation,
    location: navigation.photo.location,
  } as const;
}
